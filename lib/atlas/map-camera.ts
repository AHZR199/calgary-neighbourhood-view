import type {
  FitBoundsOptions,
  LngLatBoundsLike,
  PaddingOptions,
} from 'maplibre-gl';

type BoundsMap = {
  setPadding: (padding: PaddingOptions) => unknown;
  fitBounds: (bounds: LngLatBoundsLike, options: FitBoundsOptions) => unknown;
};

export function fitPlaceBounds(
  map: BoundsMap,
  bounds: LngLatBoundsLike,
  padding: PaddingOptions,
  options: Omit<FitBoundsOptions, 'padding'>,
) {
  //maplibre adds fitBounds padding to the map's existing edge padding.
  //reserve the sheet's space once, including after a property or landmark view.
  map.setPadding(padding);
  map.fitBounds(bounds, { ...options, padding: 0 });
}
