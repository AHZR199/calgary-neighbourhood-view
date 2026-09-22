import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  FitBoundsOptions,
  LngLatBoundsLike,
  PaddingOptions,
} from 'maplibre-gl';
import { fitPlaceBounds } from '../lib/atlas/map-camera';

test('repeated neighbourhood fits leave room on a portrait map after cards, homes and landmarks', () => {
  const width = 390;
  const height = 844;
  let edge: PaddingOptions = { top: 174, bottom: 205, left: 24, right: 62 };
  const visited: LngLatBoundsLike[] = [];
  const map = {
    setPadding(padding: PaddingOptions) {
      edge = padding;
    },
    fitBounds(bounds: LngLatBoundsLike, options: FitBoundsOptions) {
      //the library subtracts both the persistent and per-fit padding.
      const extra: PaddingOptions =
        typeof options.padding === 'number'
          ? {
              top: options.padding,
              bottom: options.padding,
              left: options.padding,
              right: options.padding,
            }
          : (options.padding ?? { top: 0, bottom: 0, left: 0, right: 0 });
      assert.ok(
        width -
          (edge.left ?? 0) -
          (edge.right ?? 0) -
          (extra.left ?? 0) -
          (extra.right ?? 0) >=
          120,
      );
      assert.ok(
        height -
          (edge.top ?? 0) -
          (edge.bottom ?? 0) -
          (extra.top ?? 0) -
          (extra.bottom ?? 0) >=
          80,
      );
      visited.push(bounds);
    },
  };
  const preview = { top: 118, bottom: 443, left: 24, right: 24 };
  const hillhurst: LngLatBoundsLike = [-114.113, 51.045, -114.084, 51.064];
  const auburn: LngLatBoundsLike = [-113.99, 50.875, -113.948, 50.91];
  fitPlaceBounds(map, hillhurst, preview, { maxZoom: 14.7 });
  fitPlaceBounds(map, auburn, preview, { maxZoom: 14.7 });
  edge = { top: 174, bottom: 265, left: 24, right: 62 };
  fitPlaceBounds(map, hillhurst, preview, { maxZoom: 14.7 });
  assert.deepEqual(visited, [hillhurst, auburn, hillhurst]);
  assert.deepEqual(edge, preview);
});

test('a route fit replaces the previous property padding on a small landscape map', () => {
  let padding: PaddingOptions = { top: 110, bottom: 76, left: 24, right: 360 };
  const desired = { top: 110, bottom: 120, left: 24, right: 90 };
  const map = {
    setPadding(next: PaddingOptions) {
      padding = next;
    },
    fitBounds(_bounds: LngLatBoundsLike, options: FitBoundsOptions) {
      assert.deepEqual(padding, desired);
      assert.equal(options.padding, 0);
      assert.equal(options.bearing, 0);
      assert.equal(options.maxZoom, 13);
    },
  };
  fitPlaceBounds(map, [-114.073, 50.93, -113.96, 51.05], desired, {
    bearing: 0,
    maxZoom: 13,
  });
});
