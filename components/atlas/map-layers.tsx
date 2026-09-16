'use client';

import { useState } from 'react';
import { ChevronDown, Layers3 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LAYERS } from '@/lib/atlas/data';
import {
  LANDMARK_DETAILS,
  LANDMARK_KEYS,
  type LandmarkKey,
} from '@/lib/atlas/landmarks';
import type { Layer } from '@/lib/atlas/data';
import type { Overlay } from './city-map';
import type {
  TransitMapLayers,
  TransitMapStatus,
} from '@/lib/atlas/map-overlays';
import { TransitLayerChoices } from './transit-layers';

const overlays: { id: Overlay; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'Base map and selected place' },
  {
    id: 'development',
    label: 'Development',
    description: 'Applications in the four detailed areas',
  },
  {
    id: 'parks',
    label: 'Parks & pathways',
    description: 'City parks and pathway connections',
  },
  {
    id: 'flood',
    label: 'Regulatory flood map',
    description: 'City regulatory flood boundaries',
  },
  {
    id: 'hazard',
    label: 'Flood hazard',
    description: 'Alberta design-flood hazard areas',
  },
  {
    id: 'noise',
    label: 'Aircraft noise',
    description: 'Airport noise exposure forecasts',
  },
];

export function MapLayers({
  layer,
  overlay,
  onLayerChange,
  onOverlayChange,
  transitLayers,
  transitStatus,
  onTransitLayersChange,
  onShowGreenLine,
  onShowLandmark,
}: {
  layer: Layer;
  overlay: Overlay;
  onLayerChange: (layer: Layer) => void;
  onOverlayChange: (overlay: Overlay) => void;
  transitLayers: TransitMapLayers;
  transitStatus: TransitMapStatus;
  onTransitLayersChange: (layers: TransitMapLayers) => void;
  onShowGreenLine: () => void;
  onShowLandmark: (landmark: LandmarkKey) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="map-layers-button glass">
          <Layers3 size={19} aria-hidden="true" />
          <span>Map layers</span>
          <small>{LAYERS.find((item) => item.id === layer)?.label}</small>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="map-layers-dialog">
        <div className="map-layers-heading">
          <DialogTitle>Map layers</DialogTitle>
          <DialogDescription>
            Add transport routes or an area overlay to the map.
          </DialogDescription>
        </div>
        <div className="map-layers-options">
          <label className="mobile-details-picker">
            <span>Place details</span>
            <select
              value={layer}
              onChange={(event) => {
                onLayerChange(event.target.value as Layer);
                setOpen(false);
              }}
            >
              {LAYERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <TransitLayerChoices
            layers={transitLayers}
            status={transitStatus}
            onChange={onTransitLayersChange}
            onShowGreenLine={() => {
              setOpen(false);
              onShowGreenLine();
            }}
          />
          <fieldset className="map-layer-group">
            <legend>Area overlay</legend>
            <div className="map-layer-grid">
              {overlays.map((item) => (
                <label className="map-layer-choice" key={item.id}>
                  <input
                    type="radio"
                    name="map-nearby-overlay"
                    value={item.id}
                    checked={
                      item.id === 'none'
                        ? layer !== 'nearby' || overlay === 'none'
                        : layer === 'nearby' && overlay === item.id
                    }
                    onChange={() => onOverlayChange(item.id)}
                    aria-describedby={`map-overlay-${item.id}-description`}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small id={`map-overlay-${item.id}-description`}>
                      {item.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <details className="map-landmarks-picker">
            <summary>
              Calgary landmarks <span>Explore the city in 3D</span>
            </summary>
            <div>
              {LANDMARK_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onShowLandmark(key);
                  }}
                >
                  {LANDMARK_DETAILS[key].name}
                </button>
              ))}
            </div>
          </details>
        </div>
        <div className="map-layers-footer">
          <DialogClose asChild>
            <button type="button" className="primary-button">
              Show map
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
