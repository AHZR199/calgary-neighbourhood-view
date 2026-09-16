export const LANDMARK_DETAILS = {
  tower: {
    name: 'Calgary Tower',
    fact: '190.8 m · observation tower',
    source: 'calgary-tower',
    description:
      'A tapered concrete shaft, red crown, glazed decks and a pale roof with its distinctive central mast.',
  },
  bow: {
    name: 'The Bow',
    fact: '237.5 m · crescent-shaped tower',
    source: 'bow-landmark',
    description:
      'Blue glazing and a diagonal steel frame follow the curved footprint around its southwest-facing plaza.',
  },
  saddledome: {
    name: 'Saddledome',
    fact: 'Saddle roof · Stampede Park',
    source: 'saddledome-landmark',
    description:
      'The roof rises at the east and west ends above a red enclosure, concrete supports and a glazed concourse.',
  },
  peace: {
    name: 'Peace Bridge',
    fact: '126 m span · Bow River',
    source: 'peace-bridge-landmark',
    description:
      'Red helical steel surrounds the walking and cycling deck, with a glass canopy and updated cable railings.',
  },
  wonderland: {
    name: 'Wonderland',
    fact: 'Jaume Plensa · The Bow plaza',
    source: 'wonderland-landmark',
    description:
      'A map-scale wire portrait beside The Bow, inspired by the open mesh and elongated form of Jaume Plensa’s public sculpture.',
  },
  sky: {
    name: 'TELUS Sky',
    fact: 'Stepped terraces · twisting skyline',
    source: 'telus-sky-landmark',
    description:
      'White frames and dark glazing trace the transition from broad office floors to the rotated upper residences.',
  },
  library: {
    name: 'Central Library',
    fact: 'East Village · Calgary Public Library',
    source: 'central-library-landmark',
    description:
      'A patterned glass facade wraps a sweeping form, raised above the train passage and a warm, curved entrance.',
  },
  hall: {
    name: 'Historic City Hall',
    fact: 'Sandstone clock tower · civic campus',
    source: 'city-hall-landmark',
    description:
      'Sandstone walls, arched windows and the clock tower distinguish the historic building beside the modern Municipal Building.',
  },
  olympic: {
    name: 'Canada Olympic Park',
    fact: 'WinSport · 1988 Olympic legacy',
    source: 'olympic-park-landmark',
    description:
      'The ski-jump towers and descending ramps remain a distinctive western Calgary landmark. This is a heritage depiction; the jumps are no longer operating.',
  },
} as const;

export type LandmarkKey = keyof typeof LANDMARK_DETAILS;
export const LANDMARK_KEYS = Object.keys(LANDMARK_DETAILS) as LandmarkKey[];
export function isLandmarkKey(value: string): value is LandmarkKey {
  return Object.hasOwn(LANDMARK_DETAILS, value);
}
