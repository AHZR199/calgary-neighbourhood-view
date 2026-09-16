"""Build map lines from a reviewed Calgary Transit GTFS archive.

python3 scripts/build-transit-routes.py --gtfs path/to/CT_GTFS.zip \
  --receipt path/to/transit-citywide-gtfs-retrieval.json \
  --catalogue path/to/npk7-z3bj-metadata.json
"""

import argparse
from collections import defaultdict
import csv
from datetime import datetime, timedelta
import hashlib
import io
import json
import math
from pathlib import Path
import re
import zipfile


SOURCE_URL = 'https://data.calgary.ca/d/npk7-z3bj'
LICENCE_URL = 'https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/'
DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
METRES_PER_DEGREE = 111_320
X_SCALE = METRES_PER_DEGREE * math.cos(math.radians(51.045))


def read_rows(archive, name):
    if name not in archive.namelist():
        return []
    with archive.open(name) as source:
        return list(csv.DictReader(io.TextIOWrapper(source, encoding='utf-8-sig', newline='')))


def parse_date(value):
    return datetime.strptime(value, '%Y%m%d').date()


def active_dates(calendar, exceptions):
    services = defaultdict(set)
    for row in calendar:
        if row['service_id'] in services:
            raise ValueError('Duplicate service IDs in calendar')
        services[row['service_id']] = set()
        day, end = parse_date(row['start_date']), parse_date(row['end_date'])
        if day > end or (end - day).days > 730:
            raise ValueError('Unexpected GTFS calendar span')
        while day <= end:
            if row[DAYS[day.weekday()]] == '1':
                services[row['service_id']].add(day)
            day += timedelta(days=1)
    for row in exceptions:
        days = services[row['service_id']]
        if row['exception_type'] == '1':
            days.add(parse_date(row['date']))
        elif row['exception_type'] == '2':
            days.discard(parse_date(row['date']))
        else:
            raise ValueError('Unknown GTFS calendar exception')
    return services


def distance_squared(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    span = dx * dx + dy * dy
    factor = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / span)) if span else 0
    return (point[0] - start[0] - factor * dx) ** 2 + (point[1] - start[1] - factor * dy) ** 2


def simplify(points, tolerance):
    projected = [(lon * X_SCALE, lat * METRES_PER_DEGREE) for lon, lat in points]
    kept = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        if last - first < 2:
            continue
        furthest = max(range(first + 1, last), key=lambda index: distance_squared(projected[index], projected[first], projected[last]))
        if distance_squared(projected[furthest], projected[first], projected[last]) > tolerance ** 2:
            kept.add(furthest)
            stack.extend([(first, furthest), (furthest, last)])
    indexes = sorted(kept)
    worst = max((distance_squared(projected[index], projected[first], projected[last]) for first, last in zip(indexes, indexes[1:]) for index in range(first + 1, last)), default=0)
    if worst > tolerance ** 2 + 0.00001:
        raise ValueError('Shape simplification exceeded its tolerance')
    return [[round(points[index][0], 6), round(points[index][1], 6)] for index in indexes], math.sqrt(worst)


def build(gtfs, receipt, catalogue, tolerance):
    checksum = hashlib.sha256(gtfs.read_bytes()).hexdigest()
    if checksum != receipt['sha256']:
        raise ValueError('GTFS archive does not match the reviewed retrieval receipt')
    licence = catalogue['metadata']['custom_fields']['License/Attribution']
    if not any('u45n-7awa' in str(value) for value in licence.values()):
        raise ValueError('Review the GTFS licence before publishing this extract')
    if catalogue['id'] != 'npk7-z3bj':
        raise ValueError('Catalogue record is not Calgary Transit Scheduling Data')
    with zipfile.ZipFile(gtfs) as archive:
        route_rows = read_rows(archive, 'routes.txt')
        routes = {row['route_id']: row for row in route_rows}
        trips = read_rows(archive, 'trips.txt')
        if len({trip['trip_id'] for trip in trips}) != len(trips):
            raise ValueError('Duplicate trip IDs')
        dates = active_dates(read_rows(archive, 'calendar.txt'), read_rows(archive, 'calendar_dates.txt'))
        if len(routes) != len(route_rows):
            raise ValueError('Duplicate route IDs')
        patterns = {}
        skipped = 0
        for trip in trips:
            route_id, shape_id = trip['route_id'], trip['shape_id']
            if route_id not in routes or trip['service_id'] not in dates:
                raise ValueError('Trip references an unknown route or service')
            if not dates[trip['service_id']]:
                skipped += 1
                continue
            if not shape_id:
                raise ValueError('An active trip is missing its route shape')
            pattern = patterns.setdefault((route_id, shape_id), {'trips': 0, 'dates': set(), 'directions': set()})
            pattern['trips'] += 1
            pattern['dates'].update(dates[trip['service_id']])
            pattern['directions'].add(trip['direction_id'])
        used_shapes = {shape_id for _, shape_id in patterns}
        shapes = defaultdict(list)
        for row in read_rows(archive, 'shapes.txt'):
            if row['shape_id'] not in used_shapes:
                continue
            lon, lat = float(row['shape_pt_lon']), float(row['shape_pt_lat'])
            if not (-116 < lon < -112 and 50 < lat < 52):
                raise ValueError('Route point is outside the Calgary-region review bounds')
            shapes[row['shape_id']].append((int(row['shape_pt_sequence']), lon, lat))
    if set(shapes) != used_shapes:
        raise ValueError('A used GTFS shape has no geometry')
    compact = {}
    original_vertices = 0
    max_error = 0
    for shape_id, rows in sorted(shapes.items()):
        rows.sort()
        if len({row[0] for row in rows}) != len(rows):
            raise ValueError('Duplicate shape point sequence')
        points = []
        for _, lon, lat in rows:
            if not points or points[-1] != (lon, lat):
                points.append((lon, lat))
        if len(points) < 2:
            raise ValueError('A route shape needs two distinct points')
        original_vertices += len(rows)
        compact[shape_id], error = simplify(points, tolerance)
        max_error = max(max_error, error)
    features = []
    for (route_id, shape_id), pattern in sorted(patterns.items()):
        route = routes[route_id]
        route_type = int(route['route_type'])
        if route_type not in (0, 3):
            raise ValueError('Review the map classification for a new route type')
        mode = 'train' if route_type == 0 else 'bus'
        start, end = min(pattern['dates']).isoformat(), max(pattern['dates']).isoformat()
        color = route.get('route_color', '').strip()
        if color and not re.fullmatch(r'[0-9A-Fa-f]{6}', color):
            raise ValueError('Invalid GTFS route colour')
        name = route['route_long_name']
        features.append({
            'type': 'Feature',
            'id': f'{route_id}:{shape_id}',
            'properties': {
                'routeId': route_id,
                'routeNumber': route['route_short_name'],
                'name': name,
                'title': f"{route['route_short_name']} · {name}",
                'description': f"Published {'CTrain' if mode == 'train' else 'bus'} route alignment. Includes scheduled route variants; check the trip planner for a particular journey.",
                'status': 'Published schedule',
                'date': f'{start} to {end}',
                'mode': mode,
                'routeType': route_type,
                'color': '#' + color.upper() if color else None,
                'shapeId': shape_id,
                'directionIds': sorted(pattern['directions']),
                'sourceTripCount': pattern['trips'],
                'scheduledServiceDays': len(pattern['dates']),
                'serviceStart': start,
                'serviceEnd': end,
                'sourceUrl': SOURCE_URL,
            },
            'geometry': {'type': 'LineString', 'coordinates': compact[shape_id]},
        })
    all_dates = set().union(*(pattern['dates'] for pattern in patterns.values()))
    route_ids = {route_id for route_id, _ in patterns}
    train_ids = {route_id for route_id in route_ids if routes[route_id]['route_type'] == '0'}
    return {
        'type': 'FeatureCollection',
        'metadata': {
            'schemaVersion': 1,
            'source': {
                'publisher': 'Calgary Transit / City of Calgary',
                'title': 'Calgary Transit Scheduling Data',
                'url': SOURCE_URL,
                'downloadUrl': receipt['requestedUrl'],
                'retrievedAt': receipt['retrievedAt'],
                'archiveSha256': checksum,
                'licenceUrl': LICENCE_URL,
                'attribution': 'Contains information licensed under the Open Government Licence – City of Calgary.',
            },
            'coverage': {
                'calendarStart': min(all_dates).isoformat(),
                'calendarEnd': max(all_dates).isoformat(),
                'note': 'Scheduled shapes across the feed, including school, peak-only and date-specific variants. A line is not a claim of service now or on every date. Planned Green Line infrastructure is not in this operating-feed extract.',
            },
            'method': {
                'inputFiles': ['routes.txt', 'trips.txt', 'shapes.txt', 'calendar.txt', 'calendar_dates.txt'],
                'selection': 'Only route/shape pairs referenced by trips with at least one active calendar date, after applying calendar exceptions. Points sorted numerically by shape_pt_sequence. No stop-to-stop lines inferred.',
                'geometry': 'Douglas–Peucker simplification in a local equirectangular metre approximation at 51.045° latitude, retaining original vertices and endpoints. Coordinates rounded to six decimals after simplification.',
                'toleranceMetres': tolerance,
                'maximumMeasuredDeviationMetres': round(max_error, 4),
                'colour': 'GTFS route_color, prefixed with # when supplied; null means the feed has no colour. Map styling is chosen by this app.',
                'specificationUrl': 'https://gtfs.org/documentation/schedule/reference/#shapestxt',
                'limitations': 'Generalized map geometry, not a navigable walking route, exact track survey, station entrance or live vehicle position. Service dates describe a range, not daily operation throughout that range.',
            },
            'counts': {
                'routes': len(route_ids),
                'trainRoutes': len(train_ids),
                'busRoutes': len(route_ids - train_ids),
                'routeShapeFeatures': len(features),
                'trainShapeFeatures': sum(feature['properties']['mode'] == 'train' for feature in features),
                'busShapeFeatures': sum(feature['properties']['mode'] == 'bus' for feature in features),
                'uniqueShapes': len(compact),
                'sourceVertices': original_vertices,
                'displayVertices': sum(len(feature['geometry']['coordinates']) for feature in features),
                'sourceTrips': len(trips),
                'excludedTripsWithoutActiveDates': skipped,
            },
        },
        'features': features,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gtfs', required=True, type=Path)
    parser.add_argument('--receipt', required=True, type=Path)
    parser.add_argument('--catalogue', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent / 'public/data/transit-routes.geojson')
    parser.add_argument('--tolerance', type=float, default=5)
    args = parser.parse_args()
    if not 0 < args.tolerance <= 10:
        parser.error('tolerance must be above zero and no more than 10 metres')
    data = build(args.gtfs, json.loads(args.receipt.read_text()), json.loads(args.catalogue.read_text()), args.tolerance)
    encoded = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    print(json.dumps({'bytes': len(encoded), 'sha256': hashlib.sha256(encoded).hexdigest(), **data['metadata']['counts']}, indent=2))


if __name__ == '__main__':
    main()
