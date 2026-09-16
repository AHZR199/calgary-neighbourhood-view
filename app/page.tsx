'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Map as MapIcon,
  Bookmark,
  Info,
  Layers3,
  BookOpen,
  Compass,
  Plus,
  Minus,
  House,
  Droplets,
  Landmark,
  Wind,
  Shield,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Check,
  X,
  Columns3,
  Printer,
  Trash2,
  Construction,
  RefreshCw,
} from 'lucide-react';
import {
  SegmentedControl,
  Segment,
} from '@/components/atlas/segmented-control';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import {
  AirPanel,
  BuyerChecklist,
  CivicPanel,
  CrimePanel,
  Overview,
  PropertyPanel,
  SourcesView,
  WaterPanel,
} from '@/components/atlas/panels';
import type { Overlay } from '@/components/atlas/city-map';
import { MobilityReport, ReportAttribution } from '@/components/atlas/mobility';
import {
  clearBrowserResearch,
  LOCAL_DATA_CHANGED,
} from '@/lib/atlas/privacy-storage';
import { AboutView } from '@/components/atlas/about';
import { MapLayers } from '@/components/atlas/map-layers';
import { TransitLegend } from '@/components/atlas/transit-layers';
import {
  DEFAULT_TRANSIT_LAYERS,
  type TransitMapLayers,
  type TransitMapStatus,
} from '@/lib/atlas/map-overlays';
import { NearbyPanel, type NearbySection } from '@/components/atlas/nearby';
import { resolveRepresentatives } from '@/lib/atlas/geography';
import { getPublicPropertyDetails } from '@/lib/atlas/property-details';
import { HomeResearchNotes } from '@/components/atlas/property-facts';
import { PlaceActions } from '@/components/atlas/place-actions';
import {
  CORE,
  LAYERS,
  communityLabel,
  loadAtlas,
  money,
  number,
  TAX_RATE,
  titleCase,
} from '@/lib/atlas/data';
import { LANDMARK_DETAILS as landmarkDetails } from '@/lib/atlas/landmarks';
import type { AtlasData, Layer, Property, View } from '@/lib/atlas/data';
const CityMap = dynamic(() => import('@/components/atlas/city-map'), {
  ssr: false,
});
const NeighbourhoodFinder = dynamic(() =>
  import('@/components/atlas/neighbourhood-finder').then(
    (module) => module.NeighbourhoodFinder,
  ),
);
const layerIcons = {
  overview: Layers3,
  property: House,
  crime: Shield,
  water: Droplets,
  air: Wind,
  politics: Landmark,
  nearby: Construction,
};
interface SavedPlace {
  id: string;
  code: string;
  title: string;
  property?: Property;
}

export default function Home() {
  const [data, setData] = useState<AtlasData | null>(null),
    [dataError, setDataError] = useState(''),
    [loadAttempt, setLoadAttempt] = useState(0);
  const [code, setCode] = useState('HIL'),
    [property, setProperty] = useState<Property | null>(null),
    [layer, setLayer] = useState<Layer>('overview'),
    [view, setView] = useState<View>('explore');
  const [basemap, setBasemap] = useState<'atlas' | 'aerial'>('atlas'),
    [overlay, setOverlay] = useState<Overlay>('none');
  const [nearbySection, setNearbySection] = useState<NearbySection>('schools');
  const [transitLayers, setTransitLayers] = useState<TransitMapLayers>(
      DEFAULT_TRANSIT_LAYERS,
    ),
    [transitStatus, setTransitStatus] = useState<TransitMapStatus>('idle');
  const [is3d, setIs3d] = useState(true),
    [action, setAction] = useState({ type: 'start', id: 0 });
  const [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(''),
    [remoteResults, setRemoteResults] = useState<Property[]>([]),
    [searchBusy, setSearchBusy] = useState(false),
    [searchError, setSearchError] = useState('');
  const [saved, setSaved] = useState<SavedPlace[]>([]),
    [compare, setCompare] = useState<string[]>([]),
    [compareOpen, setCompareOpen] = useState(false),
    [reportOpen, setReportOpen] = useState(false),
    [expanded, setExpanded] = useState(false);
  const [mapFocused, setMapFocused] = useState(false);
  const [finderVisited, setFinderVisited] = useState(false);
  const [landmarkView, setLandmarkView] = useState<
    keyof typeof landmarkDetails | null
  >(null);
  const [sourceFocus, setSourceFocus] = useState(''),
    [toast, setToast] = useState(''),
    [refreshing, setRefreshing] = useState(false),
    [refreshError, setRefreshError] = useState('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const saveRequested = useRef(false);
  const panelScroll = useRef<HTMLDivElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const community = useMemo(
    () =>
      data?.communities.features.find((f) => f.properties.comm_code === code)
        ?.properties,
    [data, code],
  );
  const placeId = property ? `p:${property.rollNumber}` : `c:${code}`;
  const name = property
    ? titleCase(property.address)
    : communityLabel(community);
  const currentPlace: SavedPlace = {
    id: placeId,
    code,
    title: name,
    ...(property ? { property } : {}),
  };
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3400);
  }
  useEffect(() => {
    let cancelled = false;
    loadAtlas()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        const params = new URLSearchParams(location.search),
          initialCode = params.get('community'),
          roll = params.get('property');
        if (
          initialCode &&
          d.communities.features.some(
            (f) => f.properties.comm_code === initialCode,
          )
        )
          setCode(initialCode);
        if (roll) {
          const p = d.properties.find((p) => p.rollNumber === roll);
          if (p) {
            setProperty(p);
            setCode(p.communityCode);
            setLayer('property');
          } else if (params.get('address')) {
            void fetch('/api/assessments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: params.get('address')! }),
              cache: 'no-store',
              referrerPolicy: 'no-referrer',
            })
              .then((r) => r.json() as Promise<{ records?: Property[] }>)
              .then((response) => {
                const found = response.records?.find(
                  (p) => p.rollNumber === roll,
                );
                if (found && !cancelled) {
                  setProperty(found);
                  setCode(found.communityCode);
                  setLayer('property');
                  setData((current) =>
                    current
                      ? {
                          ...current,
                          properties: [...current.properties, found],
                        }
                      : current,
                  );
                  void resolveRepresentatives(found, d.representatives)
                    .then((resolved) => {
                      if (cancelled) return;
                      setProperty((old) =>
                        old?.rollNumber === roll ? resolved : old,
                      );
                      setData((current) =>
                        current
                          ? {
                              ...current,
                              properties: current.properties.map((p) =>
                                p.rollNumber === roll ? resolved : p,
                              ),
                            }
                          : current,
                      );
                    })
                    .catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
        const l = params.get('layer');
        if (LAYERS.some((x) => x.id === l)) setLayer(l as Layer);
      })
      .catch(() => {
        if (!cancelled)
          setDataError(
            'City records could not be loaded. Reconnect and try again.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);
  useEffect(() => {
    try {
      const rows = JSON.parse(
        localStorage.getItem('calgary-atlas-saved') || '[]',
      );
      if (Array.isArray(rows))
        // eslint-disable-next-line react-hooks/set-state-in-effect -- load browser saves after hydration
        setSaved(
          rows
            .filter(
              (x) =>
                x &&
                typeof x.id === 'string' &&
                typeof x.code === 'string' &&
                typeof x.title === 'string',
            )
            .slice(0, 30),
        );
    } catch {}
    setPreferencesLoaded(true);
    function syncSaved(event: Event) {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== 'calgary-atlas-saved'
      )
        return;
      // another tab may have cleared the list; don't save the old copy again
      saveRequested.current = false;
      try {
        const rows = JSON.parse(
          localStorage.getItem('calgary-atlas-saved') || '[]',
        );
        setSaved(
          Array.isArray(rows)
            ? rows
                .filter(
                  (x) =>
                    x &&
                    typeof x.id === 'string' &&
                    typeof x.code === 'string' &&
                    typeof x.title === 'string',
                )
                .slice(0, 30)
            : [],
        );
      } catch {
        setSaved([]);
      }
    }
    window.addEventListener('storage', syncSaved);
    window.addEventListener(LOCAL_DATA_CHANGED, syncSaved);
    return () => {
      window.removeEventListener('storage', syncSaved);
      window.removeEventListener(LOCAL_DATA_CHANGED, syncSaved);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (preferencesLoaded && saveRequested.current)
      try {
        if (saved.length)
          localStorage.setItem('calgary-atlas-saved', JSON.stringify(saved));
        else localStorage.removeItem('calgary-atlas-saved');
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- show a message if browser storage fails
        notify('This browser could not save your places.');
      }
  }, [saved, preferencesLoaded]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((x) => !x);
      }
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    panelScroll.current?.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('.layer-dock [data-state=checked]')?.scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [code, property?.rollNumber, layer]);
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear old results before the next search
    setRemoteResults([]);
    setSearchError('');
    if (q.length < 3 || !/[0-9]/.test(q)) {
      setSearchBusy(false);
      return;
    }
    const controller = new AbortController();
    setSearchBusy(true);
    const timer = setTimeout(() => {
      fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
        .then(async (r) => {
          const d = (await r.json()) as { error: string; records: Property[] };
          if (!r.ok) throw Error(d.error);
          return d.records;
        })
        .then((rows) => {
          setRemoteResults(rows);
          setSearchBusy(false);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setSearchError(
              e.message || 'Address search is temporarily unavailable.',
            );
            setSearchBusy(false);
          }
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);
  function chooseCommunity(next: string) {
    setLandmarkView(null);
    setMapFocused(false);
    setCode(next);
    setProperty(null);
    setView('explore');
    setSearchOpen(false);
    setQuery('');
  }
  function chooseProperty(p: Property) {
    setLandmarkView(null);
    setMapFocused(false);
    setData((d) =>
      d && !d.properties.some((x) => x.rollNumber === p.rollNumber)
        ? { ...d, properties: [...d.properties, p] }
        : d,
    );
    setProperty(p);
    setCode(p.communityCode);
    setLayer('property');
    setView('explore');
    if (data && !p.mpRepresentativeId)
      void resolveRepresentatives(p, data.representatives)
        .then((resolved) => {
          setProperty((old) =>
            old?.rollNumber === p.rollNumber ? resolved : old,
          );
          setData((d) =>
            d
              ? {
                  ...d,
                  properties: d.properties.map((x) =>
                    x.rollNumber === p.rollNumber ? resolved : x,
                  ),
                }
              : d,
          );
        })
        .catch(() => {});
    setSearchOpen(false);
    setQuery('');
  }
  useEffect(() => {
    if (!property || !data || data.pipes[property.rollNumber]) return;
    let cancelled = false;
    getPublicPropertyDetails(property)
      .then((detail) => {
        if (!cancelled && detail.pipe)
          setData((current) =>
            current
              ? {
                  ...current,
                  pipes: {
                    ...current.pipes,
                    [property.rollNumber]: detail.pipe!,
                  },
                }
              : current,
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [property, data]);
  function chooseLayer(l: Layer) {
    if (landmarkView) setAction({ type: 'returnToPlace', id: Date.now() });
    setLandmarkView(null);
    setMapFocused(false);
    setLayer(l);
    setView('explore');
  }
  function showSource(id: string) {
    setSourceFocus(id);
    setView('sources');
  }
  function toggleSaved(place = currentPlace) {
    saveRequested.current = true;
    setSaved((old) =>
      old.some((s) => s.id === place.id)
        ? old.filter((s) => s.id !== place.id)
        : [place, ...old].slice(0, 30),
    );
    notify(
      saved.some((s) => s.id === place.id)
        ? 'Removed from saved places'
        : 'Saved on this device',
    );
  }
  function clearLocalData() {
    try {
      clearBrowserResearch();
      saveRequested.current = false;
      setSaved([]);
      notify('Saved places and checklists cleared from this browser.');
    } catch {
      notify('This browser could not clear your saved data.');
    }
  }
  function toggleCompare(id = placeId) {
    if (compare.includes(id)) setCompare((old) => old.filter((x) => x !== id));
    else if (compare.length < 3) {
      setCompare((old) => [...old, id]);
      notify('Added to comparison');
    } else notify('Compare up to three places at a time');
  }
  async function refreshAir() {
    setRefreshing(true);
    setRefreshError('');
    try {
      const r = await fetch('/api/air-quality');
      if (!r.ok) throw Error();
      const next = (await r.json()) as Partial<AtlasData['air']>;
      setData((d) => (d ? { ...d, air: { ...d.air, ...next } } : d));
    } catch {
      setRefreshError(
        'Refresh unavailable. The dated observation above is still shown.',
      );
    } finally {
      setRefreshing(false);
    }
  }
  async function sharePlace() {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('community', code);
    url.searchParams.set('layer', layer);
    if (property) {
      url.searchParams.set('property', property.rollNumber);
      url.searchParams.set('address', property.address);
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      notify('Link copied');
    } catch {
      notify('Copy this page address after opening the shared view');
      history.replaceState(null, '', url);
    }
  }
  function resolvePlace(id: string): SavedPlace | undefined {
    if (id.startsWith('p:')) {
      const p =
        data?.properties.find((p) => p.rollNumber === id.slice(2)) ||
        saved.find((s) => s.id === id)?.property;
      return p
        ? {
            id,
            code: p.communityCode,
            title: titleCase(p.address),
            property: p,
          }
        : undefined;
    }
    const c = data?.communities.features.find(
      (f) => f.properties.comm_code === id.slice(2),
    )?.properties;
    return c ? { id, code: c.comm_code, title: communityLabel(c) } : undefined;
  }
  const stateRef = useRef({ data, code, property, layer, view, compare });
  useEffect(() => {
    stateRef.current = { data, code, property, layer, view, compare };
  });
  const actionRef = useRef({
    chooseCommunity,
    chooseProperty,
    chooseLayer,
    resolvePlace,
  });
  useEffect(() => {
    actionRef.current = {
      chooseCommunity,
      chooseProperty,
      chooseLayer,
      resolvePlace,
    };
  });
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const settled = () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
    const entries = [
      {
        name: 'get_atlas_state',
        title: 'Read Calgary Neighbourhood View state',
        description:
          'Read the selected community, property, layer and comparison list. Does not change anything.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: (input: unknown) => {
          if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            Object.keys(input).length
          )
            throw Error('This read action takes no parameters.');
          const s = stateRef.current;
          return {
            community: s.code,
            property: s.property?.rollNumber ?? null,
            layer: s.layer,
            view: s.view,
            comparison: s.compare,
            recordsLoaded: !!s.data,
          };
        },
      },
      {
        name: 'select_place',
        title: 'Select a Calgary place',
        description:
          'Navigate the map to a loaded community code/name or an included assessment account. Updates visible selection.',
        inputSchema: {
          type: 'object',
          properties: { place: { type: 'string' } },
          required: ['place'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const q =
            typeof input === 'object' && input !== null
              ? 'place' in input
                ? input.place
                : null
              : null;
          if (typeof q !== 'string' || q.length > 100)
            throw Error('A place name, code or account is required.');
          const d = stateRef.current.data;
          if (!d) throw Error('Records are still loading.');
          const p = d.properties.find(
            (p) =>
              p.rollNumber === q || p.address.toLowerCase() === q.toLowerCase(),
          );
          const c = d.communities.features.find(
            (f) =>
              f.properties.comm_code === q.toUpperCase() ||
              f.properties.name.toLowerCase() === q.toLowerCase(),
          );
          if (p) actionRef.current.chooseProperty(p);
          else if (c) actionRef.current.chooseCommunity(c.properties.comm_code);
          else
            throw Error(
              'Place not found. Search an address in the interface to load additional records.',
            );
          await settled();
          return { selected: p?.address ?? c?.properties.name };
        },
      },
      {
        name: 'set_map_layer',
        title: 'Change map layer',
        description:
          'Display a Calgary Neighbourhood View data layer and its matching details panel.',
        inputSchema: {
          type: 'object',
          properties: {
            layer: { type: 'string', enum: LAYERS.map((l) => l.id) },
          },
          required: ['layer'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const l =
            typeof input === 'object' && input !== null && 'layer' in input
              ? input.layer
              : null;
          if (!LAYERS.some((x) => x.id === l))
            throw Error('Unknown map layer.');
          actionRef.current.chooseLayer(l as Layer);
          await settled();
          return { layer: l };
        },
      },
      {
        name: 'compare_places',
        title: 'Compare places',
        description:
          'Open a side-by-side comparison of two or three loaded communities or properties. IDs use c:COMMUNITY_CODE or p:ASSESSMENT_ACCOUNT.',
        inputSchema: {
          type: 'object',
          properties: {
            places: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 3,
              uniqueItems: true,
            },
          },
          required: ['places'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const p =
            typeof input === 'object' && input !== null && 'places' in input
              ? input.places
              : null;
          if (
            !Array.isArray(p) ||
            p.length < 2 ||
            p.length > 3 ||
            p.some((x) => typeof x !== 'string') ||
            new Set(p).size !== p.length ||
            p.some((x) => !actionRef.current.resolvePlace(x))
          )
            throw Error('Choose two or three distinct loaded places.');
          setCompare(p);
          setCompareOpen(true);
          await settled();
          return { places: p, comparisonOpen: true };
        },
      },
    ];
    for (const entry of entries) {
      try {
        Promise.resolve(
          context.registerTool(entry, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  const searchCommunities =
    data?.communities.features
      .map((f) => f.properties)
      .filter(
        (c) =>
          !query ||
          `${c.name} ${c.comm_code} ${c.sector}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort(
        (a, b) =>
          (CORE.includes(a.comm_code) ? -1 : 1) -
            (CORE.includes(b.comm_code) ? -1 : 1) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, query ? 9 : 4) ?? [];
  const searchProperties = useMemo(() => {
    const local =
      data?.properties.filter(
        (p) =>
          query.length > 1 &&
          p.address.toLowerCase().includes(query.toLowerCase()),
      ) ?? [];
    return [
      ...new Map(
        [...local, ...remoteResults].map((p) => [p.rollNumber, p]),
      ).values(),
    ].slice(0, 25);
  }, [data, query, remoteResults]);
  const selectedSaved = saved.some((s) => s.id === placeId);
  const comparisonRecords = compare.map((id) => {
    const place = resolvePlace(id);
    const stats = place ? data?.aggregates[place.code] : undefined;
    const assessment = place?.property?.assessedValue ?? stats?.median;
    const crime = place ? data?.crime[place.code] : undefined;
    const water = place ? data?.water[place.code] : undefined;
    const pipe = place?.property
      ? data?.pipes[place.property.rollNumber]
      : undefined;
    const publishedCrime = crime?.latestYearComparison.current.publishedCount;
    return {
      id,
      place,
      values: [
        assessment != null ? money(assessment) : null,
        assessment != null ? money(assessment * TAX_RATE) : null,
        place?.property?.yearBuilt ?? null,
        publishedCrime != null ? `${number(publishedCrime)} published` : null,
        water?.['water-breaks'].recordsSince2021 ?? null,
        pipe?.knownMaterials.length ? pipe.materialSummary : null,
        data
          ? `${data.air.city.displayAqhi} · ${data.air.city.riskCategory}`
          : null,
      ],
    };
  });
  const reportAssessment =
    property?.assessedValue ?? data?.aggregates[code]?.median;
  const reportCrime =
    data?.crime[code]?.latestYearComparison.current.publishedCount;
  const reportPipeRecord = property ? data?.pipes[property.rollNumber] : null;
  const reportPipe = reportPipeRecord?.knownMaterials.length
    ? reportPipeRecord.materialSummary
    : null;

  return (
    <main className={`atlas-app ${view !== 'explore' ? 'workspace-open' : ''}`}>
      <a
        className="skip-link"
        href={view === 'explore' ? '#place-details' : '#workspace-content'}
        onClick={(event) => {
          event.preventDefault();
          if (view === 'explore') {
            setMapFocused(false);
            setExpanded(true);
          }
          requestAnimationFrame(() => {
            document
              .getElementById(
                view === 'explore' ? 'place-details' : 'workspace-content',
              )
              ?.focus({ preventScroll: true });
          });
        }}
      >
        {view === 'explore' ? 'Skip to place details' : 'Skip to page content'}
      </a>
      <CityMap
        active={view === 'explore'}
        basemap={basemap}
        overlay={overlay}
        transitLayers={transitLayers}
        onTransitStatus={setTransitStatus}
        mapFocused={mapFocused}
        landmark={landmarkView}
        data={data}
        community={community}
        property={property}
        layer={layer}
        is3d={is3d}
        action={action}
        onCommunity={chooseCommunity}
        onPropertyRecord={chooseProperty}
        onSearch={() => setSearchOpen(true)}
        onProperty={(roll) => {
          const p = data?.properties.find((p) => p.rollNumber === roll);
          if (p) chooseProperty(p);
        }}
        onReady={() => {}}
      />
      <div className="map-vignette" />
      <header className="atlas-header">
        <Link
          className="brand"
          href="/"
          aria-label="Calgary Neighbourhood View home"
          data-dialog-focus-fallback
        >
          <span className="brand-copy">
            <small>CALGARY</small>
            <span className="brand-name">Neighbourhood View</span>
          </span>
        </Link>
        <SegmentedControl
          aria-label="Main views"
          value={view}
          onValueChange={(v) => {
            setView(v as View);
            if (v === 'finder') setFinderVisited(true);
            if (v === 'sources') setSourceFocus('');
          }}
          className="header-tabs"
        >
          <div data-slot="tabs-list">
            <Segment value="explore" aria-label="Explore">
              <MapIcon size={16} />
              <span>Explore</span>
            </Segment>
            <Segment value="finder" aria-label="Find a neighbourhood">
              <Compass size={16} />
              <span>Find</span>
            </Segment>
            <Segment value="saved" aria-label="Saved places">
              <Bookmark size={16} />
              <span>Saved{saved.length > 0 && <b>{saved.length}</b>}</span>
            </Segment>
            <Segment value="sources" aria-label="Sources">
              <BookOpen size={16} />
              <span>Sources</span>
            </Segment>
            <Segment value="about" aria-label="About">
              <Info size={16} />
              <span>About</span>
            </Segment>
          </div>
        </SegmentedControl>
        <div className="header-right">
          <span>Property & neighbourhood research</span>
          <small>Calgary, Alberta</small>
        </div>
      </header>
      {view === 'explore' && (
        <>
          <section className="search-zone">
            <button
              className="search-bar glass"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={19} />
              <span>Address, neighbourhood or quadrant</span>
              <kbd>⌘ K</kbd>
            </button>
          </section>
          <div
            className="basemap-switch glass"
            role="group"
            aria-label="Map appearance"
          >
            <button
              className={basemap === 'atlas' ? 'active' : ''}
              onClick={() => setBasemap('atlas')}
              aria-pressed={basemap === 'atlas'}
            >
              Map
            </button>
            <button
              className={basemap === 'aerial' ? 'active' : ''}
              onClick={() => setBasemap('aerial')}
              aria-pressed={basemap === 'aerial'}
            >
              Aerial <span>2025</span>
            </button>
          </div>
          <MapLayers
            onShowLandmark={(landmark) => {
              setLandmarkView(landmark);
              setExpanded(false);
              setMapFocused(true);
              setIs3d(true);
              setAction({ type: landmark, id: Date.now() });
            }}
            layer={layer}
            overlay={overlay}
            transitLayers={transitLayers}
            transitStatus={transitStatus}
            onTransitLayersChange={setTransitLayers}
            onShowGreenLine={() => {
              setLandmarkView(null);
              setExpanded(false);
              setMapFocused(true);
              setAction({ type: 'greenLine', id: Date.now() });
            }}
            onLayerChange={chooseLayer}
            onOverlayChange={(value) => {
              setOverlay(value);
              setNearbySection(
                value === 'none'
                  ? 'schools'
                  : value === 'transit'
                    ? 'gettingAround'
                    : value === 'development'
                      ? 'development'
                      : 'checks',
              );
              if (value === 'transit')
                setTransitLayers((current) =>
                  Object.values(current).some(Boolean)
                    ? current
                    : { ...current, train: true },
                );
              chooseLayer('nearby');
            }}
          />
          <div className="map-tools glass">
            <button
              onClick={() => setAction({ type: 'in', id: Date.now() })}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus size={19} />
            </button>
            <button
              onClick={() => setAction({ type: 'out', id: Date.now() })}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus size={19} />
            </button>
            <span />
            <button
              onClick={() => setAction({ type: 'north', id: Date.now() })}
              aria-label="Point map north"
              title="Point north"
            >
              <Compass size={20} />
            </button>
            <button
              className={is3d ? 'selected' : ''}
              onClick={() => setIs3d((x) => !x)}
              aria-label={is3d ? 'Switch to 2D map' : 'Switch to 3D map'}
              aria-pressed={is3d}
            >
              {is3d ? '3D' : '2D'}
            </button>
          </div>
          {landmarkView && (
            <aside className="landmark-card" aria-label="Landmark details">
              <button
                className="landmark-back"
                onClick={() => {
                  setLandmarkView(null);
                  setMapFocused(false);
                  setAction({ type: 'returnToPlace', id: Date.now() });
                }}
              >
                <ChevronLeft size={14} /> Return to {name}
              </button>
              <span className="landmark-eyebrow">CALGARY LANDMARK</span>
              <h1 id="place-details" tabIndex={-1}>
                {landmarkDetails[landmarkView].name}
              </h1>
              <p className="landmark-fact">
                {landmarkDetails[landmarkView].fact}
              </p>
              <p>{landmarkDetails[landmarkView].description}</p>
              <small>
                Original 3D illustration. Fine dimensions and materials are
                approximate.
              </small>
              <button
                className="landmark-source"
                onClick={() => showSource(landmarkDetails[landmarkView].source)}
              >
                Model references <ArrowUpRight size={13} />
              </button>
            </aside>
          )}
          {!landmarkView && (
            <aside
              className={`inspector ${expanded ? 'expanded' : ''} ${mapFocused ? 'map-focused' : ''}`}
              aria-label="Place details"
            >
              <button
                className="drawer-handle"
                onClick={() => setExpanded((x) => !x)}
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
              >
                <span />
              </button>
              <div className="inspector-heading">
                {property && (
                  <button
                    className="back-to-community"
                    onClick={() => {
                      setProperty(null);
                      setLayer('overview');
                    }}
                  >
                    <ChevronLeft size={14} />
                    {communityLabel(community)}
                  </button>
                )}
                <div className="panel-topline">
                  <span className="eyebrow">
                    {property
                      ? 'PROPERTY RECORD'
                      : community?.class === 'Quadrant'
                        ? 'QUADRANT PROFILE'
                        : LAYERS.find((l) => l.id === layer)?.description ||
                          'NEIGHBOURHOOD PROFILE'}
                  </span>
                  <div className="heading-actions">
                    <PlaceActions
                      compared={compare.includes(placeId)}
                      onCompare={() => toggleCompare()}
                      onShare={sharePlace}
                      onBrief={() => setReportOpen(true)}
                    />
                    <button
                      className={`icon-button ${selectedSaved ? 'is-saved' : ''}`}
                      onClick={() => toggleSaved()}
                      aria-label={
                        selectedSaved ? 'Unsave place' : 'Save on this device'
                      }
                      title={
                        selectedSaved ? 'Unsave place' : 'Save on this device'
                      }
                    >
                      {selectedSaved ? (
                        <Bookmark size={18} fill="currentColor" />
                      ) : (
                        <Bookmark size={18} />
                      )}
                    </button>
                    <button
                      className="icon-button mobile-expand"
                      onClick={() => setExpanded((x) => !x)}
                      aria-label={
                        expanded ? 'Collapse details' : 'Expand details'
                      }
                    >
                      {expanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronUp size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <h1
                  id="place-details"
                  tabIndex={-1}
                  className={property ? 'address-heading' : ''}
                >
                  {name}
                </h1>
                <button
                  className="map-details-open"
                  type="button"
                  aria-controls="place-details-body"
                  aria-expanded={false}
                  onClick={() => {
                    setMapFocused(false);
                    setExpanded(false);
                    requestAnimationFrame(() =>
                      document
                        .getElementById('place-details')
                        ?.focus({ preventScroll: true }),
                    );
                  }}
                >
                  Show details <ChevronUp size={16} aria-hidden="true" />
                </button>
                <p className="area-subtitle">
                  {property ? communityLabel(community) : 'Calgary'}
                  <span>·</span>
                  {community ? titleCase(community.sector) : 'Centre'}{' '}
                  <small>
                    {community?.class === 'Quadrant'
                      ? 'quadrant'
                      : 'planning sector'}
                  </small>
                </p>
              </div>
              <div
                id="place-details-body"
                className="inspector-scroll"
                ref={panelScroll}
              >
                {data && community ? (
                  <>
                    {layer === 'overview' && (
                      <Overview
                        property={property}
                        data={data}
                        community={community}
                        onLayer={chooseLayer}
                        onSun={() => {
                          chooseLayer('property');
                          requestAnimationFrame(() => {
                            const tool =
                              document.querySelector<HTMLDetailsElement>(
                                '[data-solar-details]',
                              );
                            if (!tool) return;
                            tool.open = true;
                            tool
                              .querySelector('summary')
                              ?.focus({ preventScroll: true });
                            tool.scrollIntoView({
                              block: 'start',
                              behavior: matchMedia(
                                '(prefers-reduced-motion: reduce)',
                              ).matches
                                ? 'instant'
                                : 'smooth',
                            });
                          });
                        }}
                        onNearby={(section) => {
                          setNearbySection(section);
                          setOverlay('none');
                          chooseLayer('nearby');
                        }}
                        onProperty={chooseProperty}
                        onSource={showSource}
                      />
                    )}{' '}
                    {layer === 'property' && (
                      <PropertyPanel
                        key={`${code}:${property?.rollNumber ?? 'area'}`}
                        data={data}
                        community={community}
                        property={property}
                        onProperty={chooseProperty}
                        onSource={showSource}
                        onSearch={() => setSearchOpen(true)}
                      />
                    )}{' '}
                    {layer === 'crime' && (
                      <CrimePanel
                        quadrant={community.class === 'Quadrant'}
                        crime={data.crime[code]}
                        onSource={showSource}
                      />
                    )}{' '}
                    {layer === 'water' && (
                      <WaterPanel
                        key={`${code}:${property?.rollNumber ?? 'area'}`}
                        data={data}
                        community={community}
                        property={property}
                        onSource={showSource}
                        onSearch={() => setSearchOpen(true)}
                      />
                    )}{' '}
                    {layer === 'air' && (
                      <AirPanel
                        air={data.air}
                        onRefresh={refreshAir}
                        refreshing={refreshing}
                        refreshError={refreshError}
                        onSource={showSource}
                      />
                    )}{' '}
                    {layer === 'politics' && (
                      <CivicPanel
                        data={data}
                        community={community}
                        property={property}
                        onProperty={chooseProperty}
                        onSource={showSource}
                      />
                    )}{' '}
                    {layer === 'nearby' && (
                      <NearbyPanel
                        key={code}
                        section={nearbySection}
                        onSectionChange={(section) => {
                          setNearbySection(section);
                          setOverlay(
                            section === 'development'
                              ? 'development'
                              : section === 'checks'
                                ? 'parks'
                                : 'none',
                          );
                        }}
                        community={community}
                        property={property}
                        onSource={showSource}
                        overlay={overlay}
                        onOverlay={(value) => {
                          setOverlay(value);
                          if (value === 'transit')
                            setTransitLayers((current) =>
                              Object.values(current).some(Boolean)
                                ? current
                                : { ...current, train: true },
                            );
                        }}
                        transitLayers={transitLayers}
                        transitStatus={transitStatus}
                        onTransitLayersChange={setTransitLayers}
                        onShowGreenLine={() => {
                          setLandmarkView(null);
                          setExpanded(false);
                          setMapFocused(true);
                          setAction({ type: 'greenLine', id: Date.now() });
                        }}
                      />
                    )}
                  </>
                ) : dataError ? (
                  <div className="inline-empty">
                    <strong>Records unavailable</strong>
                    <p>{dataError}</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setDataError('');
                        setLoadAttempt((n) => n + 1);
                      }}
                    >
                      <RefreshCw size={16} />
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="records-loading">
                    <div />
                    <span>Opening Calgary’s public records…</span>
                  </div>
                )}
              </div>
              <div className="inspector-footer">
                <BookOpen size={13} />
                <button
                  onClick={() =>
                    showSource(
                      layer === 'property'
                        ? 'assessments'
                        : layer === 'overview'
                          ? 'boundaries'
                          : layer === 'water'
                            ? 'services'
                            : layer === 'politics'
                              ? 'federal'
                              : layer === 'nearby'
                                ? 'development'
                                : layer,
                    )
                  }
                >
                  Sources & coverage
                </button>
                <Link className="privacy-link" href="/privacy" prefetch={false}>
                  Privacy
                </Link>
                <Link className="privacy-link" href="/terms" prefetch={false}>
                  Terms
                </Link>
              </div>
            </aside>
          )}
          {!landmarkView && (
            <div
              className={`map-legend glass ${Object.values(transitLayers).some(Boolean) ? 'has-transit-legend' : ''}`}
            >
              {!(layer === 'nearby' && overlay === 'transit') && (
                <div className="primary-map-legend">
                  <span className={`legend-dot ${layer}`} />
                  <span>
                    {layer === 'water'
                      ? 'Public mains · material'
                      : layer === 'crime'
                        ? 'Historical crime counts · 2019'
                        : layer === 'air'
                          ? 'Regional AQHI · city observation'
                          : layer === 'politics'
                            ? 'Electoral boundaries'
                            : layer === 'nearby'
                              ? {
                                  none: 'Zoom in to select a home',
                                  development: 'Development applications',
                                  transit: 'Published transit network',
                                  parks: 'Parks & pathways',
                                  flood: 'City regulatory flood map',
                                  hazard: 'Alberta design-flood hazard',
                                  noise: 'Airport noise forecasts · NEF',
                                }[overlay]
                              : property
                                ? 'Click a home to select its assessment'
                                : 'Zoom in to select a home'}
                  </span>
                </div>
              )}
              {(Object.values(transitLayers).some(Boolean) ||
                (layer === 'nearby' && overlay === 'transit')) && (
                <TransitLegend layers={transitLayers} status={transitStatus} />
              )}
            </div>
          )}
          <nav className="layer-dock glass" aria-label="Explore data layers">
            <SegmentedControl
              aria-label="Data layers"
              value={layer}
              onValueChange={(v) => chooseLayer(v as Layer)}
            >
              <div className="layer-navigation">
                <div data-slot="tabs-list">
                  {LAYERS.map((l) => {
                    const Icon = layerIcons[l.id];
                    return (
                      <Segment value={l.id} key={l.id} title={l.description}>
                        <Icon size={18} />
                        <span>{l.label}</span>
                      </Segment>
                    );
                  })}
                </div>
              </div>
            </SegmentedControl>
          </nav>
          {compare.length > 0 && (
            <button
              className="compare-tray"
              onClick={() => setCompareOpen(true)}
            >
              <Columns3 size={17} />
              <span>Compare places</span>
              <b>{compare.length}</b>
              <ArrowRight size={15} />
            </button>
          )}
        </>
      )}
      {finderVisited && (
        <div hidden={view !== 'finder'}>
          <NeighbourhoodFinder
            active={view === 'finder'}
            onExplore={(nextCode) => {
              chooseCommunity(nextCode);
              setLayer('overview');
            }}
            onCompare={(codes) => {
              setCompare(codes.map((nextCode) => `c:${nextCode}`));
              setCompareOpen(true);
            }}
            onSource={showSource}
          />
        </div>
      )}
      {view === 'sources' && (
        <SourcesView focus={sourceFocus} onBack={() => setView('explore')} />
      )}
      {view === 'about' && (
        <AboutView
          onBack={() => setView('explore')}
          onSources={() => setView('sources')}
          onClearLocalData={clearLocalData}
        />
      )}
      {view === 'saved' && (
        <section
          id="workspace-content"
          tabIndex={-1}
          className="workspace-view saved-view"
        >
          <div className="workspace-heading">
            <div>
              <h1>Saved places</h1>
              <p>
                Your property and neighbourhood shortlist, stored in this
                browser.
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setView('explore')}
            >
              Explore Calgary <ArrowRight size={16} />
            </button>
          </div>
          {saved.length ? (
            <>
              <div className="saved-toolbar">
                <span>
                  {saved.length} saved {saved.length === 1 ? 'place' : 'places'}
                </span>
                <button
                  className="primary-button"
                  disabled={compare.length < 2}
                  onClick={() => setCompareOpen(true)}
                >
                  <Columns3 size={16} />
                  Compare selected ({compare.length})
                </button>
              </div>
              <div className="saved-grid">
                {saved.map((s) => {
                  const stat = data?.aggregates[s.code],
                    c = data?.communities.features.find(
                      (f) => f.properties.comm_code === s.code,
                    )?.properties;
                  return (
                    <article key={s.id} className="saved-card">
                      <div className="saved-card-heading">
                        <span>
                          {c
                            ? s.property
                              ? communityLabel(c)
                              : `${titleCase(c.sector)} ${c.class === 'Quadrant' ? 'quadrant' : 'planning sector'}`
                            : 'Calgary'}
                        </span>
                        <button
                          className="icon-button"
                          onClick={() => {
                            saveRequested.current = true;
                            setSaved((old) => old.filter((x) => x.id !== s.id));
                          }}
                          aria-label={`Remove ${s.title} from saved places`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="saved-card-body">
                        <small>
                          {s.property ? 'PROPERTY' : 'NEIGHBOURHOOD'}
                        </small>
                        <h2>{s.title}</h2>
                        <p>
                          {s.property
                            ? money(s.property.assessedValue)
                            : stat
                              ? money(stat.median)
                              : 'City records'}
                          <span>
                            {s.property ? 'assessment' : 'median assessment'}
                          </span>
                        </p>
                        <div>
                          <button
                            className="text-button"
                            onClick={() =>
                              s.property
                                ? chooseProperty(s.property)
                                : chooseCommunity(s.code)
                            }
                          >
                            Explore place <ArrowRight size={14} />
                          </button>
                          <label className="compare-checkbox">
                            <input
                              type="checkbox"
                              checked={compare.includes(s.id)}
                              onChange={() => toggleCompare(s.id)}
                            />
                            Compare
                          </label>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="saved-empty">
              <h2>No saved places yet</h2>
              <p>
                Save an address or neighbourhood, then compare up to three
                places.
              </p>
              <button
                className="primary-button"
                onClick={() => setView('explore')}
              >
                Start exploring <ArrowRight size={17} />
              </button>
            </div>
          )}
          <p className="saved-privacy-note">
            Saved on this browser only.{' '}
            <Link href="/privacy" prefetch={false}>
              Privacy & browser data
            </Link>
          </p>
        </section>
      )}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">
            Find a Calgary address or neighbourhood
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search official neighbourhoods and City property assessments.
          </DialogDescription>
          <Command shouldFilter={false}>
            <div className="search-dialog-heading">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search an address or neighbourhood…"
                aria-label="Search an address or neighbourhood"
              />
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <CommandList aria-busy={searchBusy}>
              {searchCommunities.length > 0 && (
                <CommandGroup
                  heading={
                    query ? 'Neighbourhoods' : 'Start with a neighbourhood'
                  }
                >
                  {searchCommunities.map((c) => (
                    <CommandItem
                      key={c.comm_code}
                      value={c.comm_code}
                      onSelect={() => chooseCommunity(c.comm_code)}
                    >
                      <span className="search-result-icon">
                        <Layers3 size={18} />
                      </span>
                      <span>
                        <strong>{communityLabel(c)}</strong>
                        <small>{titleCase(c.sector)} planning sector</small>
                      </span>
                      {CORE.includes(c.comm_code) && (
                        <span className="search-coverage">
                          Detailed profile
                        </span>
                      )}
                      <ArrowUpRight size={15} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchProperties.length > 0 && (
                <CommandGroup heading="Property assessments">
                  {searchProperties.map((p) => (
                    <CommandItem
                      key={p.rollNumber}
                      value={p.rollNumber}
                      onSelect={() => chooseProperty(p)}
                    >
                      <span className="search-result-icon">
                        <House size={18} />
                      </span>
                      <span>
                        <strong>{titleCase(p.address)}</strong>
                        <small>
                          {titleCase(p.communityName)} · {p.rollYear}
                        </small>
                      </span>
                      <b>{money(p.assessedValue)}</b>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchBusy && (
                <div className="search-state">
                  <RefreshCw size={15} className="spin" />
                  Searching City assessment records…
                </div>
              )}
              {searchError && <div className="search-state">{searchError}</div>}
              {!searchBusy &&
                !searchError &&
                !searchCommunities.length &&
                !searchProperties.length && (
                  <CommandEmpty>
                    No matching records. Try a street number and street name.
                  </CommandEmpty>
                )}
            </CommandList>
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {searchBusy
                ? 'Searching City assessment records…'
                : searchError ||
                  `${searchCommunities.length} neighbourhoods and ${searchProperties.length} property records available.`}
            </div>
            <div className="search-footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> to navigate <kbd>↵</kbd> to open
              </span>
              <span>City of Calgary</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="comparison-dialog">
          <DialogTitle>Compare places</DialogTitle>
          <DialogDescription>
            Compare up to three places. Community counts describe different
            sized areas and are not safety rankings.
          </DialogDescription>
          {compare.length < 2 ? (
            <div className="inline-empty">
              <Columns3 size={25} />
              <strong>Add another place</strong>
              <p>
                Use Compare on any neighbourhood or property to build your
                comparison.
              </p>
              <button
                className="primary-button"
                onClick={() => setCompareOpen(false)}
              >
                Keep exploring <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="comparison-scroll">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Public records</th>
                    {compare.map((id) => {
                      const p = resolvePlace(id);
                      return (
                        <th key={id}>
                          {p?.title}
                          <button
                            aria-label={`Remove ${p?.title} from comparison`}
                            onClick={() =>
                              setCompare((old) => old.filter((x) => x !== id))
                            }
                          >
                            <X size={14} />
                          </button>
                          <small>
                            {p?.property ? 'Property' : 'Neighbourhood'}
                          </small>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Assessment',
                    'Estimated annual tax',
                    'Year built',
                    'Crime · historical 2019',
                    'Recorded main breaks · since 2021',
                    'Public service material',
                    'City AQHI',
                  ].map((label, index) =>
                    comparisonRecords.some(
                      (record) => record.values[index] != null,
                    ) ? (
                      <tr key={label}>
                        <th>{label}</th>
                        {comparisonRecords.map(({ id, place, values }) => (
                          <td key={id}>
                            {values[index]}
                            {values[index] != null &&
                              index === 0 &&
                              !place?.property && (
                                <small>
                                  Community median · eligible accounts
                                </small>
                              )}
                            {values[index] != null && index === 3 && (
                              <small>
                                Historical 2019 · selected categories
                              </small>
                            )}
                          </td>
                        ))}
                      </tr>
                    ) : null,
                  )}
                  <tr>
                    <th>Getting around</th>
                    {compare.map((id) => {
                      const place = resolvePlace(id);
                      const area =
                        data?.communities.features.find(
                          (f) => f.properties.comm_code === place?.code,
                        )?.properties ?? null;
                      return (
                        <td key={id}>
                          <MobilityReport
                            community={area}
                            property={place?.property ?? null}
                            comparison
                          />
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <ReportAttribution />
          <div className="comparison-footer">
            <button
              className="text-button"
              onClick={() => {
                setCompare([]);
                setCompareOpen(false);
              }}
            >
              Clear comparison
            </button>
            <button className="secondary-button" onClick={() => window.print()}>
              <Printer size={15} />
              Print comparison
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="report-dialog">
          <div className="report-brand">
            <strong>
              Calgary <span>Neighbourhood View</span>
            </strong>
            <span>PROPERTY & NEIGHBOURHOOD BRIEF</span>
          </div>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {communityLabel(community)} · Public record brief · Prepared{' '}
            {new Date().toLocaleDateString('en-CA')}
          </DialogDescription>
          {data && (
            <>
              {(reportAssessment != null ||
                reportCrime != null ||
                reportPipe) && (
                <div className="report-metrics">
                  {reportAssessment != null && (
                    <>
                      <div>
                        <small>
                          {property
                            ? '2026 assessment'
                            : 'Median 2026 assessment'}
                        </small>
                        <strong>{money(reportAssessment)}</strong>
                      </div>
                      <div>
                        <small>Estimated annual property tax</small>
                        <strong>{money(reportAssessment * TAX_RATE)}</strong>
                      </div>
                    </>
                  )}
                  {reportCrime != null && (
                    <div>
                      <small>Crime · historical 2019</small>
                      <strong>{reportCrime}</strong>
                      <span>Historical 2019 · selected categories</span>
                    </div>
                  )}
                  {reportPipe && (
                    <div>
                      <small>Public service connection</small>
                      <strong>{reportPipe}</strong>
                    </div>
                  )}
                </div>
              )}
              <MobilityReport
                community={community ?? null}
                property={property}
              />
              <HomeResearchNotes property={property} />
              <section className="report-context">
                <h3>Place & ownership context</h3>
                <p>
                  {property
                    ? `City assessment account ${property.rollNumber}.${property.yearBuilt != null ? ` Recorded construction year: ${property.yearBuilt}.` : ''}`
                    : data.aggregates[code]
                      ? `${data.aggregates[code].count.toLocaleString()} eligible residential assessment accounts. The median describes this cohort, not an individual home or sale price.`
                      : ''}{' '}
                  The 2026 residential tax rate is 0.0066499. Estimates exclude
                  unconfirmed local improvements, special charges, arrears and
                  adjustments.
                </p>
                <p>
                  Calgary AQHI:{' '}
                  {data.air.city.displayLabel ?? data.air.city.displayAqhi} ·{' '}
                  {data.air.city.riskCategory}. Observed{' '}
                  {data.air.observationPeriod.label}. Regional observations do
                  not measure air quality at this property.
                </p>
                {data.water[code] && (
                  <p>
                    {data.water[code]['water-breaks'].recordsSince2021}{' '}
                    published water-main break records since 2021 in the
                    selected community. Public main history does not establish
                    the condition of private service lines or interior plumbing.
                  </p>
                )}
                <h3>Representation</h3>
                {property ? (
                  data.representatives
                    .filter((r) =>
                      [
                        property.mpRepresentativeId,
                        property.mlaRepresentativeId,
                        property.councillorRepresentativeId,
                      ].includes(r.id),
                    )
                    .map((r) => (
                      <p key={r.id}>
                        <strong>
                          {r.role}: {r.name || r.displayName || 'Vacant seat'}
                        </strong>{' '}
                        · {r.district}
                        {r.party ? ` · ${r.party}` : ''} ·{' '}
                        <a href={r.profileUrl ?? r.sourceUrl}>
                          {r.status === 'link-only'
                            ? 'Official MLA directory'
                            : 'Official record'}
                        </a>
                      </p>
                    ))
                ) : (
                  <p>
                    Select an exact property to resolve federal, provincial and
                    municipal boundaries. Neighbourhoods can intersect multiple
                    electoral districts.
                  </p>
                )}
                <h3>Address checks</h3>
                <p>
                  Check both the City regulatory flood map and Alberta’s newer
                  design-flood study. Confirm school eligibility, development
                  status, radon testing, private plumbing, condo documents and
                  insurance with the relevant address records.
                </p>
              </section>
              <BuyerChecklist placeId={placeId} />
              <div className="report-sources">
                <h3>Sources & interpretation</h3>
                <p>
                  City of Calgary assessment roll and 2026 residential tax
                  rates; Open Calgary historical crime dataset 848s-4m4z,
                  covering 2018–2019; City public water service lines. Sources
                  retrieved or reviewed 13–16 September 2026. Assessments are
                  not sale prices. Tax values are estimates. Crime records are
                  historical and do not describe current conditions. Public
                  service records do not verify private or interior plumbing.
                </p>
                <a href="https://data.calgary.ca/d/4bsw-nn7w">
                  City assessment records
                </a>
                <a href="https://data.calgary.ca/d/848s-4m4z">
                  Historical crime data · 2018–2019
                </a>
                <a href="https://www.calgarypolice.ca/transparency-and-accountability/crime-statistics.html">
                  Current CPS statistics · external source
                </a>
                <a href="https://www.calgary.ca/property-owners/taxes/bill-rate-calculation.html">
                  2026 tax rates
                </a>
              </div>
              <ReportAttribution />
            </>
          )}
          <button
            className="primary-button report-print"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print or save as PDF
          </button>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="atlas-toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </main>
  );
}
