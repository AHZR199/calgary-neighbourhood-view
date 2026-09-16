"""Build the reviewed Phase 1 Green Line extract.

python3 scripts/build-green-line.py --evidence path/to/green-line-research

The evidence directory holds the City downloads, licence metadata and reviewed
retrieval receipt. Future extensions are excluded.
"""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re


LICENCE_URL = 'https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/'
PROJECT_URL = 'https://www.calgary.ca/green-line/about.html'
DOWNTOWN_URL = 'https://www.calgary.ca/green-line/downtown-segment.html'
MAP_URL = 'https://maps.calgary.ca/greenline/'
PHASE_ONE_STATIONS = {
    '2 Street SW', '26 Avenue SE', 'Douglas Glen',
    'Event Centre / Grand Central Station', 'Highfield', 'Lynnwood / Millican',
    'Ogden', 'Quarry Park', 'Ramsay / Inglewood', 'Shepard', 'South Hill',
}
INPUT_FILES = [
    'current-alignment.geojson', 'current-alignment-item.json',
    'current-alignment-layer.json', 'current-stations.geojson',
    'current-stations-layer.json', 'current-webmap.json',
]


def walk_dicts(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_dicts(child)


def build(evidence):
    receipt = json.loads((evidence / 'reviewed-retrieval.json').read_text())
    sources = {}
    for name in INPUT_FILES:
        raw = (evidence / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != receipt['files'][name]['sha256']:
            raise ValueError(f'{name} has changed since the source review')
        sources[name] = json.loads(raw)
    if 'u45n-7awa' not in sources['current-alignment-item.json'].get('licenseInfo', ''):
        raise ValueError('Review the alignment licence before publishing')
    if 'u45n-7awa' not in sources['current-stations-layer.json'].get('copyrightText', ''):
        raise ValueError('Review the station licence before publishing')

    expressions = [item.get('definitionExpression', '') or '' for item in walk_dicts(sources['current-webmap.json'])]
    station_filters = [set(re.findall(r"'([^']*)'", expression)) for expression in expressions if expression.startswith('Title IN (')]
    if PHASE_ONE_STATIONS not in station_filters or "STAGE NOT IN ('Future')" not in expressions:
        raise ValueError('The City map no longer has the reviewed Phase 1 selection')

    lines = sources['current-alignment.geojson']['features']
    stations = sources['current-stations.geojson']['features']
    selected_lines = [row for row in lines if row['properties']['STAGE'] in ('Southeast', 'Downtown')]
    selected_stations = [row for row in stations if row['properties']['Title'] in PHASE_ONE_STATIONS]
    if Counter(row['properties']['STAGE'] for row in selected_lines) != {'Southeast': 25, 'Downtown': 2}:
        raise ValueError('The alignment changed; review the Phase 1 scope again')
    if len(selected_stations) != 11 or {row['properties']['Title'] for row in selected_stations} != PHASE_ONE_STATIONS:
        raise ValueError('The station selection changed; review the Phase 1 scope again')

    dates = {}
    for kind in ('alignment', 'stations'):
        timestamp = sources[f'current-{kind}-layer.json']['editingInfo']['dataLastEditDate']
        dates[kind] = datetime.fromtimestamp(timestamp / 1000, timezone.utc).isoformat().replace('+00:00', 'Z')

    features = []
    for row in selected_lines:
        original = row['properties']
        stage = original['STAGE']
        if original['PHASE'] != 'Phase 1':
            raise ValueError('An included alignment is no longer labelled Phase 1')
        name = f'Green Line · {stage} segment'
        description = (
            'The southeast project is under construction. This line shows the planned alignment, not the exact location of current work. Green Line passenger service has not begun.'
            if stage == 'Southeast' else
            'Surface alignment along 10 Avenue to 2 Street SW, agreed by Executive Committee on 8 September 2026. Design, planning and procurement are underway. Green Line passenger service has not begun.'
        )
        features.append({
            'type': 'Feature', 'id': f"alignment-{original['OBJECTID']}",
            'properties': {
                'kind': 'alignment', 'name': name, 'title': name, 'description': description,
                'status': 'Construction underway · not operating' if stage == 'Southeast' else 'Planning and design · not operating',
                'statusCode': 'under-construction' if stage == 'Southeast' else 'planned',
                'date': dates['alignment'][:10], 'phase': 'Phase 1', 'stage': stage,
                'sourceUrl': PROJECT_URL if stage == 'Southeast' else DOWNTOWN_URL,
                'operational': False, 'sourceObjectId': original['OBJECTID'],
                'sourceGeometryClass': original['CTP_CLASS'],
            },
            'geometry': row['geometry'],
        })
    for row in selected_stations:
        original = row['properties']
        name = original['Title']
        source_url = DOWNTOWN_URL if name == '2 Street SW' else original.get('More_Info') or PROJECT_URL
        if not source_url.startswith('https://www.calgary.ca/'):
            raise ValueError('Review the station information link')
        features.append({
            'type': 'Feature', 'id': 'station-' + re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'),
            'properties': {
                'kind': 'station', 'name': name, 'title': f'{name} · Green Line',
                'description': 'Planned Phase 1 station. Green Line passenger service has not begun. Location is approximate and is not a station entrance or a walking route.',
                'status': 'Planned station · not operating', 'statusCode': 'planned',
                'date': dates['stations'][:10], 'phase': 'Phase 1',
                'stage': 'Southeast' if original['ConstructionStage'] == 'SE Segment' else 'Downtown',
                'sourceStage': original['ConstructionStage'], 'sourceUrl': source_url,
                'operational': False, 'stationType': original.get('StationType'),
                'location': original.get('Location'),
            },
            'geometry': row['geometry'],
        })

    if len({feature['id'] for feature in features}) != len(features):
        raise ValueError('Duplicate Green Line feature IDs')
    for feature in features:
        geometry = feature['geometry']
        expected = 'Point' if feature['properties']['kind'] == 'station' else 'LineString'
        if geometry['type'] != expected:
            raise ValueError('Unexpected geometry type')
        points = [geometry['coordinates']] if expected == 'Point' else geometry['coordinates']
        if expected == 'LineString' and len(points) < 2:
            raise ValueError('An alignment needs at least two points')
        for point in points:
            if len(point) != 2 or not all(math.isfinite(value) for value in point):
                raise ValueError('Expected finite two-dimensional coordinates')
            if not (-114.3 < point[0] < -113.7 and 50.8 < point[1] < 51.2):
                raise ValueError('A Phase 1 point is outside the Calgary review bounds')

    return {
        'type': 'FeatureCollection',
        'metadata': {
            'schemaVersion': 1, 'publisher': 'The City of Calgary',
            'title': 'Green Line Phase 1 alignment and planned stations', 'sourceUrl': MAP_URL,
            'licenceUrl': LICENCE_URL,
            'attribution': 'Contains information licensed under the Open Government Licence – City of Calgary.',
            'retrievedAt': receipt['retrievedAt'], 'statusCheckedAt': receipt['statusCheckedAt'],
            'alignmentUpdatedAt': dates['alignment'], 'stationsUpdatedAt': dates['stations'],
            'statusSources': [PROJECT_URL, DOWNTOWN_URL],
            'sources': {name: receipt['files'][name] for name in INPUT_FILES},
            'scope': 'Phase 1 only: Shepard to 2 Street SW. Future north and south extensions are not shown. The line and its stations are not operating.',
            'method': 'City GeoJSON coordinates retained unchanged in WGS84. Alignment selected by STAGE Southeast or Downtown; stations selected using the current official City web map Phase 1 names. The 2 Street SW information link points to the current Downtown Segment page because the source More_Info link still names the former Centre Street station. No route, entrance or station geometry inferred.',
            'limitations': 'Cartographic geometry, not survey-grade, final engineering design, a station entrance, construction footprint or service commitment. Station layer segment labels differ from the project description at Event Centre / Grand Central Station. The alignment item description retains an April 2024 date; its layer data were updated on 10 September 2026 and are used by the current City web map.',
            'counts': {'alignmentFeatures': len(selected_lines), 'stationFeatures': len(selected_stations), 'features': len(features)},
        },
        'features': features,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent / 'public/data/green-line.geojson')
    args = parser.parse_args()
    data = build(args.evidence)
    encoded = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    print(json.dumps({'bytes': len(encoded), 'sha256': hashlib.sha256(encoded).hexdigest(), **data['metadata']['counts']}, indent=2))


if __name__ == '__main__':
    main()
