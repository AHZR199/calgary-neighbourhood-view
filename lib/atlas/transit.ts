/** schedule-based transit estimates.
 * distances are great-circle distances, not walking routes or travel times.
 * this isn't the proprietary Transit Score or an official City score.
 */
export type ServiceDay = 'weekday' | 'saturday' | 'sunday';
export type DayTuple = [
  number,
  number | null,
  number | null,
  number,
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];
export type ServiceTuple = [
  string,
  string,
  string,
  string[],
  DayTuple,
  DayTuple,
  DayTuple,
];
export interface TransitStop {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'bus' | 'train' | 'mixed' | 'unserved';
  routeIds: string[];
  serviceIndexes: number[];
}
export interface TransitRoute {
  id: string;
  shortName: string;
  name: string;
  gtfsType: number;
  mode: 'bus' | 'train';
  isMax: boolean;
  url: string | null;
  scheduledTrips: Record<ServiceDay, number>;
}
export interface RailStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  platformStopIds: string[];
  routeIds: string[];
  grouping: string;
}
export interface TransitDataset {
  metadata: {
    schemaVersion: number;
    capturedAt: string;
    source: { url: string; licenceUrl: string; attribution: string };
    coverage: {
      calendarStart: string;
      calendarEnd: string;
      referenceDates: Record<ServiceDay, string>;
    };
    frequencyWindows: {
      id: string;
      startSeconds: number;
      endSecondsExclusive: number;
      hours: number;
    }[];
  };
  stops: TransitStop[];
  routes: TransitRoute[];
  railStations: RailStation[];
  services: ServiceTuple[];
}
export const TRANSIT_ACCESS_METHOD = {
  version: 'atlas-weekday-transit-access-v1',
  label: 'Weekday transit access estimate',
  distanceFullWeightMetres: 200,
  distanceZeroWeightMetres: 800,
  maxPoints: { proximity: 25, scheduledService: 60, routeChoice: 15 },
  serviceSaturationDeparturesPerHour: 12,
  choiceSaturationRoutes: 4,
  caveat:
    'A transparent Calgary Neighbourhood View estimate from scheduled service and straight-line distance. Not an official or branded Transit Score, a walking-time estimate, live service, or a measure of reachable jobs.',
} as const;
export function distanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = Math.PI / 180,
    dLat = (lat2 - lat1) * rad,
    dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
}
export function distanceWeight(metres: number): number {
  return Math.max(0, Math.min(1, (800 - metres) / 600));
}
export function unpackDay(day: DayTuple) {
  return {
    departures: day[0],
    firstSecond: day[1],
    lastSecond: day[2],
    windowCounts: day.slice(3, 7) as number[],
    medianHeadwayMinutes: day.slice(7, 11),
    maxHeadwayMinutes: day.slice(11, 15),
    middayDeparturesPerHour: day[4] / 6,
  };
}
/** keep the next-day label for gtfs times past midnight, like 27:00. */
export function formatServiceTime(seconds: number | null): string {
  if (seconds === null) return 'No scheduled boarding';
  const days = Math.floor(seconds / 86400),
    minutes = Math.floor((seconds % 86400) / 60);
  const hh = Math.floor(minutes / 60),
    mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${days ? ` (+${days} day${days > 1 ? 's' : ''})` : ''}`;
}
export function transitNearAddress(
  data: TransitDataset,
  lat: number,
  lon: number,
  options: {
    busLimit?: number;
    railLimit?: number;
    routeRadiusMetres?: number;
    serviceDay?: ServiceDay;
  } = {},
) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error('Valid latitude and longitude required');
  if (data.metadata.schemaVersion !== 2)
    throw new Error('Expected transit compact schemaVersion2');
  const stopById = new Map(data.stops.map((s) => [s.id, s])),
    routeById = new Map(data.routes.map((r) => [r.id, r]));
  const distance = new Map(
    data.stops.map((s) => [s.id, distanceMetres(lat, lon, s.lat, s.lon)]),
  );
  const servicesAt = (stop: TransitStop) =>
    stop.serviceIndexes.map((i) => data.services[i]).filter(Boolean);
  const weekdayActive = (s: TransitStop) =>
    servicesAt(s).some((r) => r[4][0] > 0);
  const stopCard = (s: TransitStop) => ({
    ...s,
    distanceMetres: Math.round(distance.get(s.id)!),
    services: servicesAt(s).map((r) => ({
      route: routeById.get(r[1])!,
      directionId: r[2],
      headsigns: r[3],
      days: {
        weekday: unpackDay(r[4]),
        saturday: unpackDay(r[5]),
        sunday: unpackDay(r[6]),
      },
    })),
  });
  const sorted = data.stops
    .filter((s) => s.kind !== 'unserved')
    .sort((a, b) => distance.get(a.id)! - distance.get(b.id)!);
  const nearestBusStops = sorted
    .filter((s) => s.kind === 'bus' || s.kind === 'mixed')
    .filter((s) => servicesAt(s).some((r) => r[4][0] + r[5][0] + r[6][0] > 0))
    .slice(0, options.busLimit ?? 6)
    .map(stopCard);
  const nearestTrainStations = data.railStations
    .map((station) => {
      const platforms = station.platformStopIds
        .map((id) => stopById.get(id))
        .filter((s): s is TransitStop => !!s)
        .sort((a, b) => distance.get(a.id)! - distance.get(b.id)!);
      return {
        ...station,
        distanceMetres: Math.round(distance.get(platforms[0].id)!),
        nearestPlatformStopId: platforms[0].id,
        platforms: platforms.map(stopCard),
      };
    })
    .sort((a, b) => a.distanceMetres - b.distanceMetres)
    .slice(0, options.railLimit ?? 3);
  const radius = options.routeRadiusMetres ?? 800;
  // use the nearest active stop for each route and direction
  // don't count nearby stops or opposite directions as extra routes
  const collectRoutes = (serviceDay: ServiceDay) => {
    const dayIndex = ({ weekday: 4, saturday: 5, sunday: 6 } as const)[
      serviceDay
    ];
    const nearestByDirection = new Map<
      string,
      { stop: TransitStop; service: ServiceTuple; distance: number }
    >();
    for (const stop of sorted) {
      const metres = distance.get(stop.id)!;
      if (metres > Math.max(radius, 800)) break;
      for (const service of servicesAt(stop)) {
        if (service[dayIndex][0] === 0) continue;
        const key = service[1] + '|' + service[2];
        if (!nearestByDirection.has(key))
          nearestByDirection.set(key, { stop, service, distance: metres });
      }
    }
    const byRoute = new Map<
      string,
      ReturnType<typeof unpackDay> & {
        route: TransitRoute;
        directions: {
          directionId: string;
          headsigns: string[];
          stopId: string;
          stopName: string;
          distanceMetres: number;
          days: Record<ServiceDay, ReturnType<typeof unpackDay>>;
        }[];
        scoreWeightedRate: number;
      }
    >();
    for (const choice of nearestByDirection.values()) {
      const { stop, service, distance: metres } = choice;
      const rid = service[1];
      if (!byRoute.has(rid))
        byRoute.set(rid, {
          ...unpackDay(service[4]),
          route: routeById.get(rid)!,
          directions: [],
          scoreWeightedRate: 0,
        });
      const item = byRoute.get(rid)!;
      item.directions.push({
        directionId: service[2],
        headsigns: service[3],
        stopId: stop.id,
        stopName: stop.name,
        distanceMetres: Math.round(metres),
        days: {
          weekday: unpackDay(service[4]),
          saturday: unpackDay(service[5]),
          sunday: unpackDay(service[6]),
        },
      });
      item.scoreWeightedRate = Math.max(
        item.scoreWeightedRate,
        distanceWeight(metres) * (service[4][4] / 6),
      );
    }
    return byRoute;
  };
  const byRoute = collectRoutes('weekday');
  const activeNearby = sorted.find(
    (s) => weekdayActive(s) && distance.get(s.id)! <= 800,
  );
  const proximity = activeNearby
    ? 25 * distanceWeight(distance.get(activeNearby.id)!)
    : 0;
  const effectiveDeparturesPerHour = [...byRoute.values()].reduce(
    (sum, r) => sum + r.scoreWeightedRate,
    0,
  );
  const usableMiddayRoutes = [...byRoute.values()].filter(
    (r) => r.scoreWeightedRate > 0,
  ).length;
  const scheduledService = 60 * Math.min(1, effectiveDeparturesPerHour / 12);
  const routeChoice = 15 * Math.min(1, usableMiddayRoutes / 4);
  const displayRoutes =
    options.serviceDay && options.serviceDay !== 'weekday'
      ? collectRoutes(options.serviceDay)
      : byRoute;
  const nearbyRoutes = [...displayRoutes.values()]
    .filter((r) => r.directions.some((d) => d.distanceMetres <= radius))
    .map(({ route, directions }) => ({
      route,
      directions: directions.filter((d) => d.distanceMetres <= radius),
    }))
    .sort(
      (a, b) =>
        Math.min(...a.directions.map((d) => d.distanceMetres)) -
        Math.min(...b.directions.map((d) => d.distanceMetres)),
    );
  return {
    coordinates: { lat, lon },
    distanceMethod:
      'Great-circle distance to published stop/platform coordinates; not walking distance.',
    referenceDates: data.metadata.coverage.referenceDates,
    feedCoverage: {
      from: data.metadata.coverage.calendarStart,
      to: data.metadata.coverage.calendarEnd,
    },
    nearestBusStops,
    nearestTrainStations,
    nearbyRoutes,
    accessEstimate: {
      value: Math.round(proximity + scheduledService + routeChoice),
      method: TRANSIT_ACCESS_METHOD,
      referenceDate: data.metadata.coverage.referenceDates.weekday,
      components: {
        proximity: Math.round(proximity * 10) / 10,
        scheduledService: Math.round(scheduledService * 10) / 10,
        routeChoice: Math.round(routeChoice * 10) / 10,
      },
      inputs: {
        nearestWeekdayStopDistanceMetres: activeNearby
          ? Math.round(distance.get(activeNearby.id)!)
          : null,
        weightedOneDirectionMiddayDeparturesPerHour:
          Math.round(effectiveDeparturesPerHour * 100) / 100,
        distinctMiddayRoutesWithin800m: usableMiddayRoutes,
      },
      explanation:
        '25 points for proximity,60 for distance-weighted scheduled weekday midday service, 15 for route choice. Nearest stop per route/direction; use the stronger direction once per route. Weights fade from 1 at 200 m to 0 at 800 m; service caps at 12 effective departures/hour and choice at 4 routes.',
    },
  };
}
