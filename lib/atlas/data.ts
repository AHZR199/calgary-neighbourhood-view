import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import {
  summarizeConstruction,
  type ConstructionRecord,
} from './property-records';
export type Layer =
  'overview' | 'property' | 'crime' | 'water' | 'air' | 'politics' | 'nearby';
export type View = 'explore' | 'finder' | 'saved' | 'sources' | 'about';
export interface Community {
  comm_code: string;
  name: string;
  label: string;
  class: string;
  sector: string;
  centroid: [number, number];
  bounds: [number, number, number, number];
}
export interface Property {
  recordId: string;
  rollNumber: string;
  address: string;
  communityCode: string;
  communityId?: string;
  communityName: string;
  rollYear: number;
  assessedValue: number;
  residentialAssessedValue: number;
  nonResidentialAssessedValue: number;
  yearBuilt: number | null;
  construction?: ConstructionRecord;
  longitude: number;
  latitude: number;
  geometry?: MultiPolygon | Polygon;
  mpRepresentativeId?: string;
  mlaRepresentativeId?: string;
  councillorRepresentativeId?: string;
  federalRiding?: string;
  provincialRiding?: string;
  sourceUrl: string;
  subPropertyUse?: string;
}
export interface Crime {
  name: string;
  communityCode: string;
  monthly: {
    period: string;
    year: number;
    month: number;
    publishedCount: number | null;
  }[];
  latestYearComparison: {
    current: { publishedCount: number | null };
    prior: { publishedCount: number | null };
    changePercent: number | null;
  };
  latestYearCategories: {
    category: string;
    currentPublishedCount: number | null;
    priorPublishedCount: number | null;
  }[];
}
export interface Representative {
  id: string;
  level: string;
  role: string;
  district: string;
  name: string | null;
  displayName?: string;
  party: string | null;
  sourceUrl: string;
  profileUrl?: string;
  status?: string;
}
export interface Pipe {
  materialSummary: string;
  matchLabel: string;
  matchQuality: string;
  knownMaterials: string[];
  installedYears: number[];
  records: {
    material: string;
    materialLabel?: string;
    installedDate?: string;
    diameterMm?: number;
    [key: string]: unknown;
  }[];
}
export interface WaterSummary {
  name: string;
  'water-mains': { count: number; byMaterialOrType: Record<string, number> };
  'water-breaks': {
    count: number;
    recordsSince2021: number;
    recordsSince2025: number;
  };
  'water-service-lines': {
    count: number;
    byMaterialOrType: Record<string, number>;
  };
}
export interface Air {
  observationPeriod: { at: string; label: string };
  city: {
    aqhi: number;
    displayAqhi: number;
    displayLabel?: string;
    riskCategory: string;
  };
  stations: {
    id: string;
    name: string;
    aqhi: number;
    displayAqhi: number;
    displayLabel?: string;
    observedAt?: string;
    riskCategory: string;
  }[];
  unavailableStations?: { id: string; name: string; observedAt: string }[];
  recentCityObservations: { observedAt: string; aqhi: number }[];
  live?: boolean;
  fetchedAt?: string;
}
export interface Aggregate {
  count: number;
  median: number;
  mean: number;
  year: number;
  label: string;
  sourceUrl: string;
}
export interface AtlasData {
  communities: FeatureCollection<MultiPolygon | Polygon, Community>;
  properties: Property[];
  crime: Record<string, Crime>;
  air: Air;
  representatives: Representative[];
  pipes: Record<string, Pipe>;
  water: Record<string, WaterSummary>;
  aggregates: Record<string, Aggregate>;
  communityWards: Record<string, string | null>;
}
export const CORE = ['HIL', 'SSD', 'BRD', 'BLN'];
export const LAYERS: { id: Layer; label: string; description: string }[] = [
  { id: 'overview', label: 'Overview', description: 'Neighbourhood profile' },
  {
    id: 'property',
    label: 'Property',
    description: 'Home records, sunlight & ownership costs',
  },
  {
    id: 'crime',
    label: 'Crime',
    description: 'Historical records & current CPS source',
  },
  { id: 'water', label: 'Water', description: 'Public water infrastructure' },
  {
    id: 'air',
    label: 'Air & radon',
    description: 'Outdoor air & indoor radon context',
  },
  {
    id: 'politics',
    label: 'Civic',
    description: 'Your elected representatives',
  },
  {
    id: 'nearby',
    label: 'Nearby',
    description: 'Schools, transport & everyday life',
  },
];
export const TAX_RATE = 0.0066499;
export const MUNICIPAL_RATE = 0.0038906;
export const PROVINCIAL_RATE = 0.0027593;
export const money = (n: number, digits = 0) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
export const compactMoney = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}m` : `$${Math.round(n / 1000)}k`;
export const number = (n: number) => new Intl.NumberFormat('en-CA').format(n);
export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s/-])\S/g, (c) => c.toUpperCase())
    .replace(/\b(Nw|Ne|Sw|Se)\b/g, (c) => c.toUpperCase())
    .replace(/\bAv\b/g, 'Ave');
export const communityLabel = (c?: Community) =>
  c
    ? titleCase(c.name).replace(
        'Bridgeland/Riverside',
        'Bridgeland / Riverside',
      )
    : 'Hillhurst';
export const coreDescriptions: Record<string, string> = {
  HIL: 'Kensington streets, established homes, and the Bow River at your doorstep.',
  SSD: 'A riverside neighbourhood between the downtown bridges and McHugh Bluff.',
  BRD: 'Hillside streets and a village centre, just across the river from downtown.',
  BLN: 'A dense mix of homes, restaurants, and public spaces south of downtown.',
};
export const readableMaterial = (s: string) =>
  ({
    CI: 'Cast iron',
    PVC: 'PVC',
    ST: 'Steel',
    YDI: 'Jacketed ductile iron',
    DI: 'Ductile iron',
    CON: 'Concrete',
    PVCG: 'Gasketed PVC',
    CU: 'Copper',
    UNK: 'Unknown',
    BDI: 'Ductile iron',
    PDI: 'Ductile iron',
    YST: 'Jacketed steel',
    PE: 'Polyethylene',
  })[s] || s;
export async function loadAtlas(): Promise<AtlasData> {
  const get = async <T>(name: string): Promise<T> => {
    const r = await fetch(`/data/${name}`);
    if (!r.ok) throw new Error('City records are temporarily unavailable.');
    return r.json() as Promise<T>;
  };
  const [
    communities,
    properties,
    crime,
    air,
    reps,
    pipes,
    water,
    aggregates,
    quadrants,
  ] = await Promise.all([
    get<AtlasData['communities']>('communities.geojson'),
    get<Property[]>('properties.json'),
    get<{ communities: Record<string, Crime> }>('crime.json'),
    get<Air>('air.json'),
    get<{
      representatives: Representative[];
      communities: {
        communityCode: string;
        councillorRepresentativeId: string | null;
      }[];
    }>('representatives.json'),
    get<{ byRollNumber: Record<string, Pipe> }>('pipes.json'),
    get<{ communities: Record<string, WaterSummary> }>('water-summary.json'),
    get<Record<string, Aggregate>>('assessment-summary.json').catch(() => ({})),
    get<AtlasData['communities']>('quadrants.geojson'),
  ]);
  return {
    communities: {
      ...communities,
      features: [...communities.features, ...quadrants.features],
    },
    properties: properties.map((property) => {
      const construction = summarizeConstruction(
        [property.yearBuilt],
        property.rollYear,
      );
      return { ...property, yearBuilt: construction.year, construction };
    }),
    communityWards: Object.fromEntries(
      reps.communities.map((c) => [
        c.communityCode,
        c.councillorRepresentativeId,
      ]),
    ),
    crime: Object.fromEntries(
      (Object.values(crime.communities) as Crime[])
        .filter((c) => !!c.communityCode)
        .map((c) => [c.communityCode, c]),
    ),
    air,
    representatives: reps.representatives,
    pipes: pipes.byRollNumber,
    water: water.communities,
    aggregates,
  };
}
export const SOURCES = [
  {
    id: 'neighbourhood-finder',
    category: 'Nearby',
    name: 'Find a neighbourhood: profiles and ranking',
    publisher:
      'App calculations · City of Calgary · OpenStreetMap contributors',
    url: '/data/neighbourhood-finder.json',
    date: 'Built 16 Sep 2026 · individual input dates retained in the download',
    scope:
      '223 City Residential-class communities · 219 with assessment summaries',
    detail:
      'Recommendations use the priorities and limits you choose, calculated in your browser. Assessment quartiles summarize eligible 2026 residential accounts across mixed property types; they are not asking prices, sales, affordability advice or an inventory of available homes. The optional budget limit checks the community median. Location, amenity, transit and school distances use a labelled area reference point and straight-line geometry; they are not route times or school assignments. Weighted scores are original comparison heuristics, not probabilities or official ratings. Scores are weighted means of available selected measures. Missing evidence is disclosed with weighted coverage; an overall score is shown only when at least 70% of selected weight has data. Hard limits are not silently relaxed. No demographic, political, historic-crime or radon data enters the ranking. The download includes formulas, input hashes, source dates and attribution. Contains information licensed under the Open Government Licence – City of Calgary and OpenStreetMap data available under ODbL; source extracts remain available from the data download.',
  },
  {
    id: 'calgary-tower',
    category: 'Map',
    name: 'Calgary Tower landmark illustration',
    publisher: 'Original app geometry · height reference: Calgary Tower',
    url: 'https://www.calgarytower.com/architecture',
    date: 'Model and references reviewed 16 Sep 2026',
    scope: 'Approximate 3D landmark · published overall height 190.8 m',
    detail:
      'Original Three.js geometry depicts the tapered concrete shaft, red apron, glazed decks, pale roof, rooflights and mast. Its overall height follows the operator’s published figure; placement follows the mapped OpenStreetMap footprint centroid. Smaller dimensions and colours are illustrative, not survey or architectural measurements. No third-party model, photograph, texture or logo is bundled. The illustration does not imply the owner’s endorsement or establish rights in the underlying architecture. Three.js licence terms appear in the third-party notices.',
  },
  {
    id: 'bow-landmark',
    category: 'Map',
    name: 'The Bow: crescent and facade',
    publisher: 'Original app geometry · references: Zeidler / Otis',
    url: 'https://zeidler.com/projects/the-bow/',
    date: 'References reviewed 16 Sep 2026',
    scope: 'Illustrative model · 237.5 m published height',
    detail:
      'The mapped crescent footprint, blue glazing, six-storey diagonal frame and stepped roof inform the original model. Zeidler describes the facade and sky gardens; the Otis project page gives a height of 237.5 m. Footprint and placement derive from OpenStreetMap. Individual glazing, frame sizes and roof equipment are approximate. No commercial model, photograph, sculpture, drawing asset or logo is copied.',
  },
  {
    id: 'saddledome-landmark',
    category: 'Map',
    name: 'Saddledome: roof and structure',
    publisher: 'Original app geometry · operator and engineering references',
    url: 'https://www.scotiabanksaddledome.com/building-design/',
    date: 'References reviewed 16 Sep 2026',
    scope: 'Illustrative saddle roof · external height approximate',
    detail:
      'The original model depicts the curved saddle roof, edge beam, supports, red enclosure and concourse. Published engineering research describes east–west sagging and north–south hogging cables, informing the roof orientation. The 41 m model peak and fine dimensions are illustrative; the operator’s 89-foot interior clearance is not used as the building’s external height. Location follows the City community-services point checked against the mapped outline. No venue branding or third-party model is bundled.',
  },
  {
    id: 'peace-bridge-landmark',
    category: 'Map',
    name: 'Peace Bridge: helical structure and railings',
    publisher: 'Original app geometry · Santiago Calatrava / City of Calgary',
    url: 'https://calatrava.com/projects/peace-bridge-calgary.html',
    date: 'References reviewed 16 Sep 2026 · railing update Nov 2023',
    scope: '126 m span · 8 m overall width · 5.85 m structural height',
    detail:
      'Published architect dimensions inform an original oval helical steel structure with a glazed canopy and separated walking/cycle surfaces. The City’s November 2023 repair notice confirms that steel tension cables replaced the side glass railings. Map alignment follows the OpenStreetMap footprint. Member sizes, helix details and height above the flat river map are approximate. No reference photograph, architectural drawing or third-party model is bundled.',
  },
  {
    id: 'telus-sky-landmark',
    category: 'Map',
    name: 'TELUS Sky: stepped tower',
    publisher: 'Original app geometry · BIG / Custom Metal',
    url: 'https://big.dk/projects/telus-sky-4861',
    date: 'References reviewed 16 Sep 2026',
    scope: '222.3 m published height · illustrative facade',
    detail:
      'Original floor plates, stepped terraces and pale frames follow the tower’s transition from broad office floors to a diagonal residential slab. BIG describes its form; facade contractor Custom Metal publishes the 222.3 m height. Location follows OpenStreetMap. Fine details are approximate; the model does not reproduce the Northern Lights artwork, a logo, a photograph or an external mesh.',
  },
  {
    id: 'wonderland-landmark',
    category: 'Map',
    name: 'Wonderland: public-art context',
    publisher: 'Jaume Plensa · independent map illustration',
    url: 'https://jaumeplensa.com/works-and-projects/public-space/wonderland-2012',
    date: 'References reviewed 16 Sep 2026',
    scope: '12 m published height · simplified wire portrait',
    detail:
      'Wonderland (2012) is a sculpture by Jaume Plensa. The artist publishes painted stainless steel and dimensions of 12 × 7.8 × 10.7 m. This independently constructed map-scale approximation uses generic head profiles and an open wire structure; it is not an exact reproduction or an artist-supplied model. No copied mesh or photograph is bundled. Attribution and original code do not establish permission for all uses of the underlying artwork; see the public-sharing review before republishing or adapting it.',
  },
  {
    id: 'central-library-landmark',
    category: 'Map',
    name: 'Central Library: facade and raised entrance',
    publisher: 'Original app geometry · Snøhetta',
    url: 'https://www.snohetta.com/projects/calgary-central-library',
    date: 'References reviewed 16 Sep 2026',
    scope: 'Illustrative model · height and panel layout approximate',
    detail:
      'The architect describes a glass and aluminium hexagonal facade and a western-red-cedar entrance lifted above the train route. The original model uses the mapped curved footprint, a patterned skin and an open, wood-lined arch. Its 28.5 m height and fine dimensions are illustrative. One unrelated building sharing the Library’s coarse map identifier is restored from the attributed public context extract before that identifier is suppressed.',
  },
  {
    id: 'city-hall-landmark',
    category: 'Map',
    name: 'Historic City Hall and municipal context',
    publisher: 'Original app geometry · City of Calgary',
    url: 'https://www.calgary.ca/arts-culture/heritage-sites/city-hall-character.html',
    date: 'References reviewed 16 Sep 2026',
    scope: 'Sandstone, clock tower and civic campus · approximate details',
    detail:
      'City heritage records describe the Richardsonian Romanesque sandstone building, round arches and clock tower. The original geometry follows the mapped footprint with illustrative windows, roof and clock details. The City describes the tower as more than 32 m tall; model dimensions are approximate. Modern Municipal Building context follows separately attributed map geometry. No City crest, logo, reference photograph or architectural drawing is bundled.',
  },
  {
    id: 'olympic-park-landmark',
    category: 'Map',
    name: 'Canada Olympic Park: ski-jump heritage',
    publisher: 'Original app geometry · Heritage Calgary / WinSport',
    url: 'https://www.heritagecalgary.ca/heritage-calgary-blog/inventory1000',
    date: 'References reviewed 16 Sep 2026',
    scope: '58 m main tower · former ski jumps',
    detail:
      'Heritage Calgary identifies a physical main-tower height of 58 m: the common “90 m jump” name is not the tower height. Original geometry follows mapped towers, inruns and landing-strip alignment. The flat map does not represent the site’s full hillside terrain; landing-ground treatment and fine details are approximate. WinSport decommissioned the jumps in 2018; these are shown as heritage landmarks, not operating facilities.',
  },
  {
    id: 'library-building-context',
    category: 'Map',
    name: 'Preserved building beside the landmark area',
    publisher: 'OpenStreetMap contributors · OpenFreeMap',
    url: '/data/library-building-restore.geojson',
    date: 'References reviewed 16 Sep 2026',
    scope: 'Single companion polygon · 21 m mapped height',
    detail:
      'This minimal ODbL extract restores the unrelated polygon that shares the Central Library’s merged basemap feature identifier. Its original render height and base are preserved, so replacing the Library model does not remove another building. The file records the tile snapshot and method; it is map geometry, not a survey.',
  },
  {
    id: 'landmark-footprints',
    category: 'Map',
    name: 'Landmark footprint alignment',
    publisher: 'OpenStreetMap contributors · OpenFreeMap',
    url: '/data/landmark-footprints.geojson',
    date: 'Retrieved 16 Sep 2026 · map snapshot 13 Sep',
    scope: 'Published alignment and placement geometry for Calgary landmarks',
    detail:
      'This small downloadable extract retains the footprint geometries, source identities and attribution used to align the detailed Calgary landmarks and cross-check source location points. The database is available under ODbL 1.0, with a direct licence link in its metadata. Source geometry is cartographic and can change. The nearby amenities and downtown-distance calculations retain their own documented reference points; adding landmark models does not silently change those measurements.',
  },
  {
    id: 'construction',
    category: 'Property',
    name: 'Recorded construction year',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/4bsw-nn7w',
    date: '2026 assessment roll · schema reviewed 16 Sep 2026',
    scope: 'Exact assessment account · City year_of_construction field',
    detail:
      'The source defines this as Account AYOC (Actual year of construction). It is not a completion certificate or renovation date. Duplicate parcel rows for the same account are checked for agreement; conflicting years, non-integer values, years 1800 or earlier and future dates remain unconfirmed. The lower bound is an app plausibility rule, not a City-documented sentinel. Unit accounts are kept separate. Bundled examples retain their original snapshot dates; address searches query the current source.',
  },
  {
    id: 'sales',
    category: 'Property',
    name: 'Sale-history availability',
    publisher: 'City of Calgary · Alberta Land Titles',
    url: 'https://www.calgary.ca/property-owners/assessment/mytax.html',
    date: 'Access and reuse checked 16 Sep 2026',
    scope: 'Individual sale dates and prices · unavailable in this app',
    detail:
      'The reviewed open assessment datasets do not include transaction dates or prices. myTax provides a signed-in, valuation-period sales search with restrictions on automated extraction and republication. Alberta title and transfer documents involve paid access and are not a free public-reuse feed. These services are linked, not scraped. An unavailable sale record does not mean never sold; assessment changes and title-registration dates are not substituted for sale prices or sale dates.',
  },
  {
    id: 'solar',
    category: 'Environment',
    name: 'Sun position & seasonal daylight',
    publisher: 'App calculations from NOAA published equations',
    url: 'https://gml.noaa.gov/grad/solcalc/solareqns.PDF',
    date: 'Method reviewed 16 Sep 2026 · date chosen by visitor',
    scope: 'Selected property coordinates · unobstructed horizon',
    detail:
      'Approximate solar bearing clockwise from true north and geometric elevation are calculated in the browser. Sunrise and sunset use the conventional −0.833° horizon threshold. Daylight duration is not direct-sun exposure at the home. Trees, buildings, terrain, weather, facade orientation, glazing and roof pitch are not modelled. No solar API, device-location access or tracking is used. NOAA no longer maintains its online calculator; the app uses an independently implemented approximation with reference checks, not a certified design tool.',
  },
  {
    id: 'solar-orientation',
    category: 'Environment',
    name: 'Window orientation & comfort',
    publisher: 'Natural Resources Canada',
    url: 'https://prod-natural-resources.azure.cloud.nrcan-rncan.gc.ca/energy-efficiency/home-energy-efficiency/keeping-heat-section-8-upgrading-windows-exterior-doors',
    date: 'Guidance checked 16 Sep 2026',
    scope: 'General orientation trade-offs · visitor-selected facing direction',
    detail:
      'South-facing windows can support winter solar gains; summer shading and glazing still matter. East and west exposure change the timing of sun, glare and heat. The app paraphrases general guidance and does not identify a universally ideal orientation, infer window direction from an address or estimate energy performance. Verify the actual rooms and obstructions on site.',
  },
  {
    id: 'solar-time',
    category: 'Environment',
    name: 'Calgary solar-display time',
    publisher: 'Government of Alberta',
    url: 'https://www.alberta.ca/albertas-new-time-system-abt',
    date: 'Time rule checked 16 Sep 2026',
    scope: 'Calgary local time · historical DST and permanent Alberta Time',
    detail:
      'Alberta says clocks will not return to Mountain Standard Time in November 2026 and will remain UTC−6 year-round. Solar controls apply that rule explicitly because some browser time-zone databases still contain the previous autumn clock change. Earlier dates use historical America/Edmonton time. A skipped spring hour is unavailable; a repeated autumn hour uses its first occurrence.',
  },
  {
    id: 'schools',
    category: 'Nearby',
    name: 'Schools by grade group and distance',
    publisher: 'City of Calgary / Government of Alberta',
    url: 'https://data.calgary.ca/d/fd9t-tdn2',
    date: 'City updated 1 Sep 2026 · Alberta directory 14 Sep · retrieved 16 Sep',
    scope: '499 school locations · citywide directory',
    detail:
      'The City inventory has 506 points; seven post-secondary sites are excluded from this directory. Published flags identify 385 elementary, 202 junior-high and 111 high-school records, with overlap between levels; 31 records have no reported level. Grade labels are broad groups, not exact grade ranges. All institutions on a shared campus remain separate. Area filters use civic polygons, not attendance zones. Distances are straight-line from the labelled home or area reference point, not walking routes. Private Early Childhood Services operators are outside the source coverage. Check current grades, programs, capacity and designated-school eligibility with the school board. Contains information licensed under the Open Government Licence – City of Calgary and the Open Government Licence – Alberta.',
  },
  {
    id: 'school-websites',
    category: 'Nearby',
    name: 'Official school website links',
    publisher: 'Government of Alberta, Education',
    url: 'https://open.canada.ca/data/en/dataset/3542f7c1-fe9b-4203-aa01-8c859a871bd3',
    date: 'Directory extract 14 Sep 2026 · retrieved 16 Sep',
    scope:
      'Source-published links matched by school name, address and authority',
    detail:
      'The Alberta school and authority workbook is explicitly covered by the Open Government Licence – Alberta. Website links are attached only after a unique exact normalized name, address and authority match to a City school. No guessed domains, fuzzy matches, staff contacts or school logos are used. Missing, invalid and unmatched links stay unavailable. Individual destinations have not all been checked for uptime. The downloadable school file retains both publishers’ attribution, source hashes and the joining method.',
  },
  {
    id: 'essentials',
    category: 'Nearby',
    name: 'Everyday places, child care & fitness',
    publisher: 'City of Calgary / OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    date: 'Retrieved 14 Sep 2026 · individual source dates retained',
    scope:
      'Citywide mapped grocery, healthcare, park, school, community, child care and gym points',
    detail:
      'City sources: fd9t-tdn2 schools, x34e-bcjz community services, m9y7-ui7j libraries and kami-qbfh parks. OSM supplements groceries, pharmacies, clinics, child care and fitness venues. Library records were last updated February 2025. A mapped venue does not establish licensing, availability or current hours. Straight-line nearest-place distances and an original six-category proximity heuristic; the separate coverage and methodology downloads describe each transformation. Calgary Tower is the fixed downtown reference, from City Community Services.',
  },

  {
    id: 'development',
    category: 'Nearby',
    name: 'Development applications',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/6933-unw5',
    date: 'Applied 13 Sep 2025–12 Sep 2026 · source updated 12 Sep 2026',
    scope: 'Four central communities · individual applications',
    detail:
      '178 applications retain the City’s descriptions and current statuses. Signs, changes of use, renovations and cancelled applications are included. Application and approval do not establish construction start or completion.',
  },
  {
    id: 'transit',
    category: 'Nearby',
    name: 'Calgary Transit stops, routes & schedules',
    publisher: 'Calgary Transit / City of Calgary',
    url: 'https://data.calgary.ca/d/npk7-z3bj',
    date: 'Feed 9 Sep–20 Dec 2026 · captured 14 Sep 2026',
    scope: '6,214 citywide stops, 260 routes and CTrain platform groups',
    detail:
      'Official GTFS. Train platforms are identified by their served rail routes. Independent bus and CTrain map controls show source route shapes and stops; the lines are scheduled paths, not live vehicles or walking connections. Nearby routes use published stops within 800 m of the selected point. Weekday, Saturday and Sunday sample dates are shown separately; schedules are not live arrivals. An original transit access estimate combines straight-line proximity, distance-weighted midday service and distinct route choice. Planned Green Line service is excluded. No proprietary Transit Score data is used.',
  },
  {
    id: 'green-line',
    category: 'Nearby',
    name: 'Green Line Phase 1 · planned route & stations',
    publisher: 'City of Calgary',
    url: 'https://www.calgary.ca/green-line/downtown-segment.html',
    date: 'Map data updated 10 Sep 2026 · checked 16 Sep 2026',
    scope: 'Shepard to 10 Avenue / 2 Street SW · not operating',
    detail:
      'The dashed overlay uses the City’s current interactive-map geometry: 27 Phase 1 line segments and 11 planned stations. The southeast section is under construction; the downtown surface route was selected on 8 September 2026 and remains in planning and design. The older open-data alignment was not used because it retains superseded downtown geometry. Cartographic positions are approximate. Future extensions are not shown; opening dates, station access and service frequency are not guaranteed. Planned service does not contribute to transit-access estimates. Downloadable geometry retains City Open Government Licence attribution and exact service provenance.',
  },
  {
    id: 'assessments',
    category: 'Property',
    name: '2026 property assessments',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/4bsw-nn7w',
    date: '2026 assessment roll · retrieved 13 Sep 2026',
    scope: 'Individual assessment account / parcel',
    detail:
      'Assessed value is the City’s annual valuation, not a listing or sale price. The map includes 199 distinct assessment accounts in four central communities; address search also queries the City’s current roll. Parcel markers are approximate. Community statistics cover 499,477 distinct eligible accounts across 248 communities, never the map sample. Eligibility: positive Residential-class assessment, improved property (LI), and an R-prefixed use code; some accounts represent multi-unit buildings.',
  },
  {
    id: 'tax',
    category: 'Property',
    name: 'Property tax rates & calculation',
    publisher: 'City of Calgary',
    url: 'https://www.calgary.ca/property-owners/taxes/bill-rate-calculation.html',
    date: '2026 residential rates · verified 13 Sep 2026',
    scope: 'Annual estimate for a residential assessment',
    detail:
      '2026 total residential rate: 0.0066499 (municipal 0.0038906 + provincial 0.0027593). Estimate = assessed value × rate. Adjustments, supplementary assessments, arrears and fees are excluded. Future scenarios are user assumptions, not predictions or adopted future tax rates.',
  },
  {
    id: 'crime',
    category: 'Crime',
    name: 'Historical crime records · 2018–2019',
    publisher: 'City of Calgary / Calgary Police Service',
    url: 'https://data.calgary.ca/d/848s-4m4z',
    date: '2018–2019 · retrieved 14 Sep 2026',
    scope: '270 matched communities · eight named crime categories',
    detail:
      'City-open Community Crime and Disorder Statistics (2012–2019), restricted to 2018 and 2019 and eight named Crime categories. Disorder excluded. Missing monthly or category records remain unknown; annual totals require all 12 months, and incomplete comparisons are suppressed. These are historical counts, not current conditions or safety ratings. The latest CPS report is linked separately because an open redistribution licence for its workbook was not established.',
  },
  {
    id: 'mains',
    category: 'Water',
    name: 'Public water mains',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/Services-and-Amenities/Public-Water-Main/w6h9-w33i',
    date: 'Retrieved 13 Sep 2026',
    scope: 'Mapped public main segments · four central communities',
    detail:
      'Material, diameter and installation records describe public infrastructure. A material or age does not establish condition, replacement timing, or a homeowner’s liability. Segments crossing community boundaries can occur in multiple community summaries.',
  },
  {
    id: 'services',
    category: 'Water',
    name: 'Public water service lines',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/Health-and-Safety/Public-Water-Service-Lines/ta76-7bfx',
    date: 'Retrieved 13 Sep 2026',
    scope: 'Public service connection · address match',
    detail:
      'An exact City address match is distinguished from a building-address candidate when a unit number is removed. Missing matches mean unknown. All recorded materials are retained where an address has multiple records; the data does not establish which are active. Private service lines and interior plumbing are not verified by this source.',
  },
  {
    id: 'breaks',
    category: 'Water',
    name: 'Historical water main breaks',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/dpcu-jr23',
    date: 'Retrieved 13 Sep 2026',
    scope: 'Published historical event locations',
    detail:
      'This is a history, not a forecast of future failures. Public break records are not linked to a main with a shared identifier. The interface shows counts from 2021 onward separately from the longer archive. No replacement probability or bill is inferred.',
  },
  {
    id: 'air',
    category: 'Environment',
    name: 'Calgary Air Quality Health Index',
    publisher: 'Environment and Climate Change Canada',
    url: 'https://weather.gc.ca/airquality/pages/multiple_stations/abaq-002_e.html',
    date: 'Hourly observations · observation time displayed in the app',
    scope: 'City and monitoring stations',
    detail:
      'AQHI describes short-term air quality. Monitoring-station values are not neighbourhood or property exposure measurements, and they do not establish long-term pollution levels. Real-time observations can be revised. If refresh fails, the timestamped saved observation remains visible.',
  },
  {
    id: 'boundaries',
    category: 'Geography',
    name: 'Community boundaries',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/surr-xmvs',
    date: 'Retrieved 13 Sep 2026',
    scope: 'Citywide community polygons',
    detail:
      'Official community boundaries, simplified for display. The City’s planning sectors are not the four postal quadrants. Search supports City community names; electoral boundaries are separate and can intersect a community.',
  },
  {
    id: 'federal',
    category: 'Civic',
    name: 'Members of Parliament',
    publisher: 'House of Commons',
    url: 'https://www.ourcommons.ca/MEMBERS/en/search',
    date: 'Current affiliations verified 13 Sep 2026',
    scope: 'Federal electoral district',
    detail:
      'Current officeholders and party affiliations come from the official member directory. Property assignments use the parcel display point within Elections Canada’s boundaries in effect from 2025. Election history and current affiliation are distinct.',
  },
  {
    id: 'provincial',
    category: 'Civic',
    name: 'Current MLA directory · external link',
    publisher: 'Legislative Assembly of Alberta / Elections Alberta',
    url: 'https://www.assembly.ab.ca/members/members-of-the-legislative-assembly',
    date: 'Directory link only · 2019 district boundaries',
    scope: 'Provincial electoral division',
    detail:
      'Current MLA names, parties and vacancy status are available in the linked Assembly directory and are not reproduced in this demo. District matching uses the Elections Alberta boundary snapshot effective March 19, 2019. Historical provincial election results are separately sourced from Elections Alberta. Exact property assignments are preferred over a blanket community assignment.',
  },
  {
    id: 'municipal',
    category: 'Civic',
    name: 'Calgary City Council',
    publisher: 'City of Calgary',
    url: 'https://www.calgary.ca/council/findyourcouncillor.html',
    date: 'Verified 13 Sep 2026',
    scope: 'Municipal ward',
    detail:
      'Councillors and ward coverage are taken from official City pages. An unverified municipal party affiliation is left unspecified, rather than labelled independent.',
  },
  {
    id: 'elections',
    category: 'Civic',
    name: 'Official election results',
    publisher: 'Elections Canada & Elections Alberta',
    url: 'https://www.elections.ca/content.aspx?section=res&dir=rep/off/45gedata&document=index&lang=e',
    date: '2025 federal · 2023 provincial',
    scope: 'District election results',
    detail:
      'Historical winners and vote shares are sourced to the election authority. Redistribution changes the geographic area behind a district name, so results from different boundary vintages are not presented as directly comparable.',
  },
  {
    id: 'history',
    category: 'Property',
    name: 'Property assessment history',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/4ur7-wsgc',
    date: '2017–2025 history + 2026 current roll',
    scope: 'Assessment account across annual rolls',
    detail:
      'Historical roll strings can omit leading zeros. Account identifiers are normalized without changing their identity, assessment values are parsed from source text, and identical parcel repeats are collapsed rather than summed. Conflicting values and missing years remain gaps. Changes to an account, improvements or valuation policy can affect comparisons.',
  },
  {
    id: 'demographics',
    category: 'Nearby',
    name: 'Population, age & household size',
    publisher: 'City of Calgary / Statistics Canada',
    url: 'https://data.calgary.ca/d/f9wk-wej9',
    date: '2021 Census · 2022 community geography · retrieved 14 Sep 2026',
    scope: 'Citywide community profiles, where published values exist',
    detail:
      'Open datasets f9wk-wej9 (population and age) and msjx-5ygv (household size). Private households only; collective dwellings excluded. Published rounding is preserved, and missing values remain unknown. Historical population is not a current estimate. Income, tenure and additional profile tables are linked at the City rather than copied from PDFs with unconfirmed redistribution terms.',
  },
  {
    id: 'quadrants',
    category: 'Geography',
    name: 'Address quadrants & boundary geometry',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/g2n2-qnvh',
    date: 'Boundary geometry updated 26 Jul 2021 · 2026 address-based assessments',
    scope: 'NE, NW, SE, SW · distinct from planning sectors',
    detail:
      'The expressly open 2021 quadrant geometry provides map context. Assessment statistics are grouped independently by the official quadrant suffix on 2026 addresses; they are not recalculated from the older polygons. A community can cross quadrant boundaries, so crime and census figures are not allocated to quadrants.',
  },
  {
    id: 'aerial',
    category: 'Geography',
    name: 'Calgary 2025 aerial imagery',
    publisher: 'City of Calgary',
    url: 'https://maps.calgary.ca/CalgaryImagery/',
    date: 'Imagery acquired July and August 2025',
    scope: 'Citywide orthophotography · public web viewing',
    detail:
      'Direct City image tiles are viewed under the public-viewing permission in the City’s January 2026 orthophoto guide. They are not proxied, downloaded or included in printable briefs. Aerial imagery is a dated photograph; the overlaid 3D buildings are a separate OpenStreetMap-derived model and do not use photorealistic building textures.',
  },
  {
    id: 'flood',
    category: 'Environment',
    name: 'Municipal regulatory flood map',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/tp6q-x2v7',
    date: 'Current published City layer · 1983 calculation basis',
    scope: 'Regulatory designations near four central communities',
    detail:
      'The official layer identifies floodway, flood fringe and normal river channel. It is separate from the newer provincial physical-hazard study. Display geometry is clipped and simplified, so it does not provide parcel clearance or determine insurance or legal obligations.',
  },
  {
    id: 'flood-hazard',
    category: 'Environment',
    name: 'Bow & Elbow flood-hazard study',
    publisher: 'Government of Alberta',
    url: 'https://www.alberta.ca/final-flood-maps',
    date: 'Finalized 15 May 2025',
    scope: 'Provincial design-flood evidence · bounded central display extract',
    detail:
      'The newer study includes Springbank and Glenmore mitigation context. The app preserves river, study, zone and flow-regime fields and excludes larger-return-period comparison scenarios from this view. This evidence is not silently substituted for Calgary’s current regulatory map. Check the exact address in Alberta’s Flood Awareness Map.',
  },
  {
    id: 'noise',
    category: 'Environment',
    name: 'Noise Exposure Forecast contours',
    publisher: 'City of Calgary · Transport Canada methodology',
    url: 'https://data.calgary.ca/d/g5qu-w8fb',
    date: 'Published planning contours · retrieved 13 Sep 2026',
    scope: 'Airport vicinity · NEF indices',
    detail:
      'NEF is a planning metric, not a measured decibel value or a live flight-noise reading. Areas outside contours may still experience aircraft noise. The app does not infer indoor sound levels or a home’s acoustic performance.',
  },
  {
    id: 'parks',
    category: 'Nearby',
    name: 'Parks, pathways & public amenities',
    publisher: 'City of Calgary',
    url: 'https://data.calgary.ca/d/kami-qbfh',
    date: 'Retrieved 13 Sep 2026',
    scope: 'Four study communities plus nearby mapped assets',
    detail:
      'The map combines park sites, pathways (qndb-27qm) and amenity equipment (7v8c-cjjm). A park can have multiple mapped site features. Pathway length is a geometry calculation within the boundary, not a walking route or a measure of access. Open entrances, accessibility and temporary closures need direct confirmation.',
  },
  {
    id: 'pm25',
    category: 'Environment',
    name: 'Recent fine-particle observations',
    publisher: 'City of Calgary · provincial monitoring stations',
    url: 'https://data.calgary.ca/d/g9s5-qhu5',
    date: '13 Aug–12 Sep 2026',
    scope: 'Three stations · provisional hourly observations',
    detail:
      'Repeated station-hour records are deduplicated before calculating daily values. A daily mean is shown only with 24 valid hours. Missing values stay blank, and source timestamps are retained without an inferred timezone. These near-real-time values have not completed quality assurance and do not establish long-term exposure at a property.',
  },
  {
    id: 'radon',
    category: 'Environment',
    name: 'Calgary-region indoor radon survey',
    publisher: 'Health Canada',
    url: 'https://open.canada.ca/data/dataset/744d8a3b-b9e0-41b8-be5f-5f869a36a221',
    date: 'Survey 2012–2013 · retrieved 16 Sep 2026',
    scope: 'Calgary census metropolitan area · 99 historical measurements',
    detail:
      'Derived from the federal open CSV: 14 of 99 readings strictly exceed 200 Bq/m³, or 14.1% of this unweighted historical sample. One reading equals 200. Tests lasted 61–149 days; 96 lasted at least 90 days. This is not a current prevalence estimate or an address-level prediction. Very small postal-area cells do not support neighbourhood rankings. Postal identifiers are omitted from the app extract. Contains information licensed under the Open Government Licence – Canada; app calculations are unofficial and unendorsed. Newer 2024 research is linked separately, not redistributed.',
  },
  {
    id: 'radon-testing',
    category: 'Environment',
    name: 'Radon testing & action guidance',
    publisher: 'Health Canada',
    url: 'https://www.canada.ca/en/health-canada/services/publications/health-risks-safety/guide-radon-measurements-residential-dwellings.html',
    date: 'Guidance checked 16 Sep 2026',
    scope: 'Individual home · long-term measurement',
    detail:
      'Testing is needed for the specific dwelling: neighbouring homes can differ. Current guidance calls for a long-term test with at least 91 days during the heating season, on the lowest normally occupied level. Health Canada recommends corrective action within one year when the average annual result exceeds 200 Bq/m³, sooner at higher levels. Below the guideline does not mean zero risk. The app does not collect or interpret visitors’ own measurements.',
  },
  {
    id: 'mortgage',
    category: 'Ownership',
    name: 'Mortgage planning calculations',
    publisher: 'Financial Consumer Agency of Canada · CMHC',
    url: 'https://itools-ioutils.fcac-acfc.gc.ca/MC-CH/MortgageCalculator.aspx',
    date: 'Rules checked 13 Sep 2026 · interest rates are user inputs',
    scope: 'Illustrative owner-occupied 1–2-unit fixed-rate purchase',
    detail:
      'Monthly payments use the stated nominal annual rate compounded semiannually. Minimum down payments and estimated default-insurance tiers use the current published rules. A 30-year high-ratio illustration requires an explicit Home Start eligibility assumption. The result is a planning subtotal, not a lender quote, approval or prediction of renewal rates.',
  },
  {
    id: 'utilities',
    category: 'Ownership',
    name: 'Residential water & cart rates',
    publisher: 'City of Calgary',
    url: 'https://www.calgary.ca/water/water-utility/residential-water-rates-and-billing.html',
    date: 'Published 2026 rates',
    scope: 'Residential metered service and applicable City cart recipients',
    detail:
      'The worksheet calculates metered water, wastewater using the 0.88 return factor, fixed water/wastewater/stormwater charges, and three cart charges when selected. Fixed charges are prorated by billing days. A 19 m³, 30-day example with all three carts is $139.72; calendar-month budgeting is normalized separately. Condo inclusion, billing class and service applicability must be confirmed.',
  },
  {
    id: 'registration',
    category: 'Ownership',
    name: 'Land-title registration fees',
    publisher: 'Government of Alberta',
    url: 'https://www.alberta.ca/system/files/sartr-land-titles-and-surveys-common-documents-fee-schedule.pdf',
    date: 'Schedule effective May 2026 · published 19 May 2026',
    scope: 'Ordinary transfer and new mortgage · one-title estimate',
    detail:
      'The worksheet uses $50 plus $5 for each $5,000 or portion of the relevant value or registered principal, separately for transfer and mortgage. Additional titles, instruments, exemptions and collateral amounts can change the amount. Legal fees, inspection costs and closing adjustments are outside this estimate.',
  },
  {
    id: 'condo',
    category: 'Ownership',
    name: 'Condo reserves & property documents',
    publisher: 'Government of Alberta · City of Calgary',
    url: 'https://www.alberta.ca/reserve-funds',
    date: 'Guidance checked 13 Sep 2026',
    scope: 'Actual condominium and transaction documents',
    detail:
      'Condo fees, reserve-fund position, special assessments, title matters and local-improvement balances are not inferred from an area average. Missing costs remain unconfirmed in the worksheet. Consult the current condo documents, title and City tax information report for the particular transaction.',
  },
];
