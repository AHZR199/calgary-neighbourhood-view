'use client';

import { useId } from 'react';
import {
  TRANSIT_MAP_CHOICES,
  GREEN_LINE_MAP_AVAILABLE,
  type TransitMapLayers,
  type TransitMapStatus,
} from '@/lib/atlas/map-overlays';
import './transit-layers.css';

export function TransitLayerChoices({
  layers,
  active = true,
  status = 'idle',
  onChange,
  onShowGreenLine,
}: {
  layers: TransitMapLayers;
  active?: boolean;
  status?: TransitMapStatus;
  onChange: (layers: TransitMapLayers) => void;
  onShowGreenLine: () => void;
}) {
  const id = useId();
  return (
    <fieldset className="transit-layer-choices">
      <legend>Transit on the map</legend>
      <p>
        Choose train, bus or both. These stay visible while you explore other
        data layers.
      </p>
      <div className="transit-layer-options">
        {TRANSIT_MAP_CHOICES.filter(
          (choice) => choice.id !== 'greenLine' || GREEN_LINE_MAP_AVAILABLE,
        ).map((choice) => (
          <label className="transit-layer-choice" key={choice.id}>
            <input
              type="checkbox"
              checked={active && layers[choice.id]}
              onChange={(event) =>
                onChange({
                  ...(active
                    ? layers
                    : { train: false, bus: false, greenLine: false }),
                  [choice.id]: event.target.checked,
                })
              }
              aria-describedby={`${id}-${choice.id}`}
            />
            <span>
              <strong>{choice.label}</strong>
              <small id={`${id}-${choice.id}`}>{choice.description}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="transit-data-note">
        Operating network: Calgary Transit schedule, September 9–December 20,
        2026. Routes and stops are not live arrivals; service varies by day.
      </p>
      {active && layers.greenLine && GREEN_LINE_MAP_AVAILABLE && (
        <div className="transit-planned-context">
          <strong>Green Line · Phase 1</strong>
          <p>
            Shepard to 10 Avenue / 2 Street SW. Not operating. Southeast
            construction; downtown planning and design. Map updated September
            10, 2026; future extensions are not shown.
          </p>
          <div>
            <button type="button" onClick={onShowGreenLine}>
              View Green Line route
            </button>
            <a
              href="https://www.calgary.ca/green-line/downtown-segment.html"
              target="_blank"
              rel="noreferrer"
            >
              City project updates
            </a>
          </div>
        </div>
      )}
      {active && status === 'loading' && (
        <p className="transit-load-status" role="status">
          Loading the selected transit layers…
        </p>
      )}
      {active && status === 'error' && (
        <p className="transit-load-status" role="status">
          A transit layer could not be loaded. Switch it off and on to try
          again.
        </p>
      )}
      {active && !Object.values(layers).some(Boolean) && (
        <p className="transit-load-status">
          All transit layers are off. Choose one above to show it on the map.
        </p>
      )}
    </fieldset>
  );
}

export function TransitLegend({
  layers,
  status,
}: {
  layers: TransitMapLayers;
  status: TransitMapStatus;
}) {
  return (
    <div className="transit-map-legend" aria-label="Transit map legend">
      <div className="transit-legend-items">
        {layers.train && (
          <>
            <span>
              <i className="transit-swatch red" />
              Red Line 201
            </span>
            <span>
              <i className="transit-swatch blue" />
              Blue Line 202
            </span>
          </>
        )}
        {layers.bus && (
          <span>
            <i className="transit-swatch bus" />
            Bus routes
          </span>
        )}
        {layers.greenLine && (
          <span>
            <i className="transit-swatch green" />
            Green Line · planned
          </span>
        )}
      </div>
      <small>
        {status === 'error'
          ? 'Layer unavailable · see Transit controls'
          : status === 'loading'
            ? 'Loading transit layers…'
            : !Object.values(layers).some(Boolean)
              ? 'Transit layers are off'
              : `${layers.train || layers.bus ? 'Schedule: Sep 9–Dec 20, 2026' : ''}${layers.greenLine ? `${layers.train || layers.bus ? ' · ' : ''}Dashed: planned, not operating` : ''}`}
      </small>
    </div>
  );
}
