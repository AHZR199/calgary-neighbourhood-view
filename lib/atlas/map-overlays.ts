export interface TransitMapLayers {
  train: boolean;
  bus: boolean;
  greenLine: boolean;
}

export type TransitMapStatus = 'idle' | 'loading' | 'ready' | 'error';

export const GREEN_LINE_MAP_AVAILABLE = true;

export const DEFAULT_TRANSIT_LAYERS: TransitMapLayers = {
  train: false,
  bus: false,
  greenLine: false,
};

export const TRANSIT_COLOURS = {
  redLine: '#ad6e77',
  blueLine: '#547f9f',
  bus: '#6b879b',
  greenLine: '#6c9183',
};

export const TRANSIT_MAP_CHOICES: {
  id: keyof TransitMapLayers;
  label: string;
  description: string;
}[] = [
  {
    id: 'train',
    label: 'CTrain lines & stations',
    description: 'Red and Blue lines · 83 platform points',
  },
  {
    id: 'bus',
    label: 'Bus routes & stops',
    description: '258 published routes · 6,131 stop points',
  },
  {
    id: 'greenLine',
    label: 'Green Line · planned',
    description: 'Phase 1 route & 11 planned stations · not operating',
  },
];
