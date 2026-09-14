'use client';

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
import type { Layer } from '@/lib/atlas/data';
import type { Overlay } from './city-map';

const overlays: { id: Overlay; label: string; description: string }[] = [
  {
    id: 'development',
    label: 'Development',
    description: 'Applications in the four detailed areas',
  },
  { id: 'transit', label: 'Transit', description: 'Public transit stops' },
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
}: {
  layer: Layer;
  overlay: Overlay;
  onLayerChange: (layer: Layer) => void;
  onOverlayChange: (overlay: Overlay) => void;
}) {
  return (
    <Dialog>
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
            Choose the information to show on the map and in place details.
          </DialogDescription>
        </div>
        <div className="map-layers-options">
          <fieldset className="map-layer-group">
            <legend>Data layers</legend>
            <div className="map-layer-grid">
              {LAYERS.map((item) => (
                <label className="map-layer-choice" key={item.id}>
                  <input
                    type="radio"
                    name="map-data-layer"
                    value={item.id}
                    checked={layer === item.id}
                    onChange={() => onLayerChange(item.id)}
                    aria-describedby={`map-layer-${item.id}-description`}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small id={`map-layer-${item.id}-description`}>
                      {item.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="map-layer-group">
            <legend>Nearby overlays</legend>
            <p>Selecting an overlay opens the Nearby layer.</p>
            <div className="map-layer-grid">
              {overlays.map((item) => (
                <label className="map-layer-choice" key={item.id}>
                  <input
                    type="radio"
                    name="map-nearby-overlay"
                    value={item.id}
                    checked={layer === 'nearby' && overlay === item.id}
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
