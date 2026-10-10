'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Layers, Crosshair, Loader2, X, Compass, ChevronLeft, ChevronRight, Plus, Minus, Mountain, Play, Pause, Navigation, Landmark as LandmarkIcon } from 'lucide-react';
import { AddCommunityModal } from '../forms/AddCommunityModal';
import { CinematicFlyThroughHUD, type FlightCorridorItem, type WaypointInfo } from './CinematicFlyThroughHUD';
import { KindredMicroMappingModal } from './KindredMicroMappingModal';
import { getKindredLandmarksOffline, getOfflineCommunitiesGeoJSON, type KindredLandmarkItem } from '@/lib/offlineStorage';
import { SE_STATE_CODES, SE_STATES, ANIOMA_LGAS, IGBO_IDENTIFIED_LGAS, NIGERIA_BOUNDS, BEYOND_SOUTHEAST_REGIONS } from '@/lib/geo';
import { calculateNearestWaterway, getDialectForLocation, type DialectCluster, ANCESTRAL_MIGRATION_ARCS, WATERWAY_TRADE_CORRIDORS } from '@/lib/cultural';

export interface SelectedFeature {
  type: 'state' | 'lga' | 'community' | 'settlement' | 'landmark' | 'migration' | 'region';
  name: string;
  parentName?: string;
  code?: string;
  coordinates?: [number, number];
  identityStatus?: string;
  verificationStatus?: string;
  lifecycleStatus?: string;
  confirmationsCount?: number;
  zone?: 'southeast' | 'identified' | 'reference';
  placeType?: string;
  markerColor?: string;
  colorLabel?: string;
  colorExplanation?: string;
  whyMarked?: string;
  nearestRiver?: { name: string; basin: string; distanceKm: number };
  dialectCluster?: DialectCluster;
  historicalNotes?: string;
  regionId?: string;
  subtitle?: string;
  constituentLgas?: Array<{ code: string; name: string; state: string; stateCode?: string; center?: [number, number] }>;
  keyTowns?: string[];
  waterwayContext?: string;
  dialect?: string;
  dialectGreeting?: string;
  whySignificant?: string;
  traditionalMarketsAndLandmarks?: string[];
}

export type BasemapMode = 'dark' | 'satellite' | 'topo' | 'light';
export type FilterDotType = 'all' | 'verified' | 'pending' | 'homeland' | 'reference' | 'dormant' | 'contested';

export interface MapContainerHandle {
  flyToCommunity: (community: any) => void;
  flyTo: (center: [number, number], zoom: number) => void;
  resetView: () => void;
  refreshCommunities: () => void;
  openAddModal: (coords: { lon: number; lat: number }, name?: string) => void;
  getCenter?: () => { lon: number; lat: number };
  setFilterType: (filter: FilterDotType) => void;
  toggle3D: () => void;
  highlightLgas: (codes: string[]) => void;
  highlightRegion: (codes: string[], center: [number, number], zoom: number) => void;
  selectLgaByCode: (code: string) => void;
  selectStateByCode: (code: string) => void;
  inspectMigrationArc: (arc: any) => void;
  highlightDialectCluster: (cluster: any) => void;
  filterLandmarksByMarketDay: (dayName: string | null) => void;
  start3DOrbit: () => void;
  stop3DOrbit: () => void;
  setPitchPreset: (pitch: number) => void;
  startCinematicFlyThrough: (corridorId: string) => void;
  stopCinematicFlyThrough: () => void;
  openKindredMappingModal: (coords?: { lon: number; lat: number }, community?: { id: string; name: string }) => void;
  togglePinKindredMode: () => void;
  resize: () => void;
}


interface MapContainerProps {
  showStates: boolean;
  showLgas: boolean;
  showCommunities?: boolean;
  showWaterways?: boolean;
  showLandmarks?: boolean;
  showDialects?: boolean;
  activeDialectCluster?: string | null;
  showMigrationArcs?: boolean;
  showHistoricalOverlay?: boolean;
  historicalOpacity?: number;
  showDensity?: boolean;
  onToggleDensity?: (val: boolean) => void;
  /** LGA codes outside the Southeast to shade as Igbo-identified */
  identifiedLgas?: string[];
  isAddMode: boolean;
  setIsAddMode: (val: boolean) => void;
  onSelectFeature: (feature: SelectedFeature | null) => void;
  onCommunityAdded?: () => void;
  onOpenAddModal?: (coords: { lon: number; lat: number }, name?: string) => void;
  basemapMode?: BasemapMode;
  onBasemapChange?: (mode: BasemapMode) => void;
  activeFilter?: FilterDotType;
  onFilterChange?: (filter: FilterDotType) => void;
  isFiltersCollapsed?: boolean;
}

interface HoverInfo {
  x: number;
  y: number;
  name?: string;
  typeBadge?: string;
  state?: string;
  lga?: string;
  zone: 'southeast' | 'identified' | 'reference';
  colorLabel?: string;
  colorBg?: string;
  colorBorder?: string;
  colorText?: string;
}

function responsivePadding(el: HTMLElement | null) {
  if (!el) return 40;
  const { clientWidth: w, clientHeight: h } = el;
  const ratio = w < 640 ? 0.1 : 0.08;
  return Math.max(16, Math.round(Math.min(w, h) * ratio));
}

export const MapContainer = forwardRef<MapContainerHandle, MapContainerProps>(function MapContainer(
  {
    showStates,
    showLgas,
    showCommunities = true,
    showWaterways = true,
    showLandmarks = true,
    showDialects = false,
    activeDialectCluster = null,
    showMigrationArcs = false,
    showHistoricalOverlay = false,
    historicalOpacity = 0.45,
    showDensity = false,
    onToggleDensity,
    identifiedLgas = IGBO_IDENTIFIED_LGAS,
    isAddMode,
    setIsAddMode,
    onSelectFeature,
    onCommunityAdded,
    onOpenAddModal,
    basemapMode = 'dark',
    onBasemapChange,
    activeFilter = 'all',
    onFilterChange,
    isFiltersCollapsed = false,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectFeature);
  onSelectRef.current = onSelectFeature;
  const identifiedRef = useRef<string[]>(identifiedLgas);
  identifiedRef.current = identifiedLgas;
  const onOpenAddModalRef = useRef(onOpenAddModal);
  onOpenAddModalRef.current = onOpenAddModal;

  const [pendingCoords, setPendingCoords] = useState<{ lon: number; lat: number } | null>(null);
  const [pendingName, setPendingName] = useState<string>('');
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [pitchPreset, setPitchPreset] = useState<number>(56);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const isOrbitingRef = useRef(false);
  const orbitAnimRef = useRef<number | null>(null);

  const stopOrbit = useCallback(() => {
    setIsOrbiting(false);
    isOrbitingRef.current = false;
    if (orbitAnimRef.current !== null) {
      cancelAnimationFrame(orbitAnimRef.current);
      orbitAnimRef.current = null;
    }
  }, []);

  const startOrbit = useCallback(() => {
    if (!map.current) return;
    setIsOrbiting(true);
    isOrbitingRef.current = true;
    let lastTime = performance.now();
    const step = (now: number) => {
      if (!map.current || !isOrbitingRef.current) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const currentBearing = map.current.getBearing();
      map.current.setBearing((currentBearing + dt * 6) % 360);
      orbitAnimRef.current = requestAnimationFrame(step);
    };
    orbitAnimRef.current = requestAnimationFrame(step);
  }, []);

  const toggleOrbit = useCallback(() => {
    if (isOrbitingRef.current) {
      stopOrbit();
    } else {
      startOrbit();
    }
  }, [startOrbit, stopOrbit]);

  const toggle3D = useCallback(() => {
    if (!map.current) return;
    const next = !is3D;
    setIs3D(next);
    if (next) {
      if (map.current.getSource('terrain-dem')) {
        map.current.setTerrain({ source: 'terrain-dem', exaggeration: 1.6 });
      }
      if (typeof map.current.setSky === 'function') {
        map.current.setSky({
          'sky-color': basemapMode === 'light' ? '#38bdf8' : '#030712',
          'horizon-color': basemapMode === 'light' ? '#bae6fd' : '#0d1527',
          'fog-color': basemapMode === 'light' ? '#e0f2fe' : '#090e1c',
          'fog-ground-blend': 0.75,
          'atmosphere-blend': 0.8,
        });
      }
      map.current.easeTo({ pitch: pitchPreset, bearing: -15, duration: 1000 });
    } else {
      stopOrbit();
      map.current.setTerrain(null);
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 900 });
    }
  }, [is3D, basemapMode, pitchPreset, stopOrbit]);

  const [isBasemapHudCollapsed, setIsBasemapHudCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showMobileLayersModal, setShowMobileLayersModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const waterwaysLoadedRef = useRef(false);

  function handleLocateUser() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { longitude, latitude } = pos.coords;
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 11.5,
            essential: true,
          });
          highlightPoint([longitude, latitude], '#38bdf8');
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Option 4: Kindred (Ụmụnna) & Village Landmark Micro-Mapping State ──
  const [isPinningKindred, setIsPinningKindred] = useState(false);
  const isPinningKindredRef = useRef(false);
  const [showKindredModal, setShowKindredModal] = useState(false);
  const [pendingKindredCoords, setPendingKindredCoords] = useState<{ lon: number; lat: number } | null>(null);
  const [selectedKindredCommunity, setSelectedKindredCommunity] = useState<{ id: string; name: string } | undefined>(undefined);

  const refreshKindredLandmarks = useCallback(async () => {
    if (!map.current) return;
    try {
      const offlineList = await getKindredLandmarksOffline();
      let features: any[] = [];
      try {
        const res = await fetch('/api/landmarks');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.features)) features = [...data.features];
        }
      } catch {
        // Offline: rely purely on local store
      }

      const existingIds = new Set(features.map((f: any) => f.properties?.id));
      for (const kl of offlineList) {
        if (!existingIds.has(kl.id)) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [kl.longitude, kl.latitude] },
            properties: kl,
          });
        }
      }

      const src = map.current.getSource('kindred-landmarks-source') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features } as any);
    } catch {
      // Non-fatal
    }
  }, []);

  // ── Option 3: 3D Cinematic Migration Corridor Fly-Through Engine ──
  const [activeFlightCorridor, setActiveFlightCorridor] = useState<FlightCorridorItem | null>(null);
  const activeFlightCorridorRef = useRef<FlightCorridorItem | null>(null);
  const [flightWaypointIndex, setFlightWaypointIndex] = useState(0);
  const flightWaypointIndexRef = useRef(0);
  const [isFlightPlaying, setIsFlightPlaying] = useState(false);
  const isFlightPlayingRef = useRef(false);
  const [flightSpeed, setFlightSpeed] = useState(1);
  const flightSpeedRef = useRef(1);
  const [flightBearing, setFlightBearing] = useState(0);
  const [flightPitch, setFlightPitch] = useState(64);
  const flightTimerRef = useRef<NodeJS.Timeout | null>(null);

  const buildFlightCorridor = useCallback((corridorId: string): FlightCorridorItem | null => {
    let arc = ANCESTRAL_MIGRATION_ARCS.find((a) => a.id === corridorId);
    let water = WATERWAY_TRADE_CORRIDORS.find((w) => w.id === corridorId);

    // Resilient fuzzy fallback for legacy or partial IDs
    if (!arc && !water) {
      arc =
        ANCESTRAL_MIGRATION_ARCS.find(
          (a) => a.id.toLowerCase().includes(corridorId.toLowerCase()) || corridorId.toLowerCase().includes(a.id.toLowerCase())
        ) || ANCESTRAL_MIGRATION_ARCS[0];
    }

    if (arc) {
      const o = arc.origin.coordinates;
      const d = arc.destination.coordinates;
      const steps = 6;
      const waypoints: WaypointInfo[] = [];
      for (let i = 0; i < steps; i++) {
        const frac = i / (steps - 1);
        const lateralCurvature = Math.sin(frac * Math.PI) * 0.08;
        const lon = o[0] + (d[0] - o[0]) * frac + lateralCurvature;
        const lat = o[1] + (d[1] - o[1]) * frac;
        let name = `Waypoint ${i + 1}`;
        let note = arc.description;
        if (i === 0) {
          name = `Departure: ${arc.origin.name}`;
          note = `Commencing 3D flight at ancestral origin of ${arc.origin.name}. Era: ${arc.era}.`;
        } else if (i === steps - 1) {
          name = `Arrival: ${arc.destination.name}`;
          note = `Approaching ancestral destination hub at ${arc.destination.name}. Diaspora nexus reached.`;
        } else if (i === 1) {
          name = 'Ascending Plateau Escarpment';
          note = 'Climbing the escarpment and navigating ancestral trade pathways.';
        } else if (i === 2) {
          name = 'Watershed River Crossing';
          note = 'Traversing central drainage basin and historic riverine covenants.';
        } else if (i === 3) {
          name = 'Settlement Corridor Apex';
          note = arc.description;
        } else if (i === 4) {
          name = 'Approaching Lineage Foothills';
          note = 'Gliding towards the settlement valley and contiguous kindred groves.';
        }
        waypoints.push({
          name,
          coords: [lon, lat],
          note,
          altitudeMeters: Math.round(1100 + Math.sin(frac * Math.PI) * 1100),
        });
      }
      return {
        id: arc.id,
        name: arc.name,
        type: 'migration',
        era: arc.era,
        description: arc.description,
        waypoints,
      };
    }

    if (water) {
      let riverPathCoords: Array<{ name: string; coords: [number, number]; note: string }> = [];

      if (water.id === 'waterway-lower-niger') {
        riverPathCoords = [
          { name: 'Idah / Upper River Niger Entrance', coords: [6.74, 6.75], note: 'Northern riverine entrance into Igboland and ancient trade gateway.' },
          { name: 'Asaba Ferry Head (Anioma Bank)', coords: [6.7214, 6.1982], note: 'Historic west-bank crossing connecting Anioma to the eastern homeland.' },
          { name: 'Onitsha Wharf & Commercial Port', coords: [6.7865, 6.1498], note: 'The central maritime emporium and Ezechima dynasty seat.' },
          { name: 'Atani & Osomari Riverine Heartlands', coords: [6.7320, 5.9230], note: 'Naval trading ports and historic river covenants.' },
          { name: 'Aboh Royal Naval Kingdom', coords: [6.5412, 5.5489], note: 'Command center of the Lower Niger canoe navy, controlling tariffs.' },
          { name: 'Lower Niger Estuary & Delta Crevasse', coords: [6.3500, 5.1200], note: 'Southern maritime outlet towards the Atlantic Ocean.' },
        ];
      } else if (water.id === 'waterway-imo-river') {
        riverPathCoords = [
          { name: 'Okigwe Escarpment Springs', coords: [7.3500, 5.8300], note: 'Highland source springs of the sacred Imo River (Mmiri Imo).' },
          { name: 'Umuahia - Ngwa Drainage Valley', coords: [7.4500, 5.4500], note: 'Central agricultural corridor and commercial artery.' },
          { name: 'Aba River Wharf & Market Landing', coords: [7.3680, 5.1050], note: 'Historic mercantile station connecting southern markets.' },
          { name: 'Azumini Blue River Basin', coords: [7.4200, 4.9600], note: 'Crystal-clear tributary and strategic pre-colonial trading depot.' },
          { name: 'Akwete Textile Wharf', coords: [7.3550, 4.8850], note: 'Famous textile-weaving center and direct river outlet.' },
          { name: 'Opobo Town Island Kingdom', coords: [7.5412, 4.5189], note: 'King Jaja’s coastal fortress, intercepting colonial monopolies.' },
        ];
      } else if (water.id === 'waterway-orashi-basin') {
        riverPathCoords = [
          { name: 'Oguta Lake Sacred Confluence', coords: [6.8080, 5.7120], note: 'Confluence of the twin sacred waters of Urashi and Ogbuide.' },
          { name: 'Egbema Riverine Port', coords: [6.7500, 5.5500], note: 'Freshwater swamp transport and timber artery.' },
          { name: 'Omoku River Jetty (Ogbaland)', coords: [6.6500, 5.3400], note: 'Commercial landing serving the ancient Oba of Ogbaland.' },
          { name: 'Ahoada Beach (Ekpeye Landings)', coords: [6.6450, 5.0800], note: 'Freshwater trading beach connecting inland farmers to fishers.' },
          { name: 'Degema / Abonnema Delta Creeks', coords: [6.7600, 4.7500], note: 'Navigable mangrove channels opening into the Atlantic delta.' },
        ];
      } else if (water.id === 'waterway-omambala-anambra') {
        riverPathCoords = [
          { name: 'Ibaji Highland Borderlands', coords: [6.8500, 6.7500], note: 'Upper Omambala drainage basin and fertile agricultural floodplains.' },
          { name: 'Otuocha Market Port (Aguleri)', coords: [6.8865, 6.3421], note: 'Ancestral Eri hearth and bustling agrarian river market.' },
          { name: 'Umuoba Anam Wetland Jetty', coords: [6.8400, 6.2800], note: 'Alluvial yam breadbasket and ancient dugout canoe landing.' },
          { name: 'Omambala - River Niger Confluence', coords: [6.7800, 6.1800], note: 'Majestic junction where the Omambala empties into the River Niger.' },
        ];
      } else {
        riverPathCoords = water.keyPorts.map((port, idx) => {
          const frac = idx / Math.max(1, water.keyPorts.length - 1);
          return {
            name: `Wharf: ${port}`,
            coords: [water.center[0] + (frac - 0.5) * 0.2, water.center[1] + (frac - 0.5) * 0.3] as [number, number],
            note: `Port along ${water.basin}. Commodities: ${water.historicalCommodities.join(', ')}.`,
          };
        });
      }

      const waypoints: WaypointInfo[] = riverPathCoords.map((pt, idx) => ({
        name: pt.name,
        coords: pt.coords,
        note: pt.note,
        altitudeMeters: Math.round(950 + idx * 180),
      }));

      return {
        id: water.id,
        name: water.name,
        type: 'waterway',
        era: 'Pre-Colonial Aquatic Highway',
        description: water.description,
        waypoints,
      };
    }

    return null;
  }, []);

  const flyToFlightWaypoint = useCallback((index: number, corridorOverride?: FlightCorridorItem) => {
    if (!map.current) return;
    const corridor = corridorOverride || activeFlightCorridorRef.current;
    if (!corridor || !corridor.waypoints || !corridor.waypoints[index]) return;

    setFlightWaypointIndex(index);
    flightWaypointIndexRef.current = index;

    const currentWp = corridor.waypoints[index];
    const nextWp = corridor.waypoints[index + 1] || currentWp;

    let targetBearing = map.current.getBearing();
    if (index < corridor.waypoints.length - 1) {
      const dLon = nextWp.coords[0] - currentWp.coords[0];
      const dLat = nextWp.coords[1] - currentWp.coords[1];
      const rad = Math.atan2(dLon, dLat);
      targetBearing = (rad * 180) / Math.PI;
    }
    setFlightBearing(targetBearing);
    setFlightPitch(62);

    const dur = Math.max(2500, Math.round(6500 / flightSpeedRef.current));

    // Update flight trajectory on map with current waypoint position
    const src = map.current.getSource('flight-corridor-source') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: corridor.waypoints.map((w) => w.coords),
            },
            properties: { id: 'trajectory' },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: currentWp.coords,
            },
            properties: { id: 'current-aircraft', name: currentWp.name },
          },
        ],
      });
    }

    // Departure smoothly flies in; subsequent waypoints easeTo continuously forward without jarring zoom-outs
    if (index === 0) {
      map.current.flyTo({
        center: currentWp.coords,
        zoom: 11.2,
        pitch: 62,
        bearing: targetBearing,
        duration: 2600,
        curve: 1.0,
        essential: true,
      });
    } else {
      map.current.easeTo({
        center: currentWp.coords,
        zoom: 11.2,
        pitch: 62,
        bearing: targetBearing,
        duration: dur,
        easing: (t) => t,
        essential: true,
      });
    }

    if (flightTimerRef.current) {
      clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }

    if (isFlightPlayingRef.current) {
      const waitTime = index === 0 ? 2800 : dur;
      flightTimerRef.current = setTimeout(() => {
        if (!isFlightPlayingRef.current) return;
        const nextIdx = index + 1;
        if (nextIdx < corridor.waypoints.length) {
          flyToFlightWaypoint(nextIdx, corridor);
        } else {
          setIsFlightPlaying(false);
          isFlightPlayingRef.current = false;
        }
      }, waitTime);
    }
  }, []);

  const startCinematicFlyThrough = useCallback((corridorId: string) => {
    if (!map.current) return;
    const corridor = buildFlightCorridor(corridorId);
    if (!corridor || corridor.waypoints.length === 0) return;

    // 1. Enable 3D Terrain DEM & Atmospheric Sky
    if (map.current.getSource('terrain-dem')) {
      map.current.setTerrain({ source: 'terrain-dem', exaggeration: 1.8 });
    }
    if (typeof map.current.setSky === 'function') {
      map.current.setSky({
        'sky-color': basemapMode === 'light' ? '#38bdf8' : '#030712',
        'horizon-color': basemapMode === 'light' ? '#bae6fd' : '#0d1527',
        'fog-color': basemapMode === 'light' ? '#e0f2fe' : '#090e1c',
        'fog-ground-blend': 0.75,
        'atmosphere-blend': 0.8,
      });
    }
    setIs3D(true);

    setActiveFlightCorridor(corridor);
    activeFlightCorridorRef.current = corridor;
    setIsFlightPlaying(true);
    isFlightPlayingRef.current = true;

    // Populate visual trajectory line on map immediately
    const src = map.current.getSource('flight-corridor-source') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: corridor.waypoints.map((w) => w.coords),
            },
            properties: { id: 'trajectory' },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: corridor.waypoints[0].coords,
            },
            properties: { id: 'current-aircraft', name: corridor.waypoints[0].name },
          },
        ],
      });
    }

    // Fly to first waypoint
    flyToFlightWaypoint(0, corridor);
  }, [basemapMode, buildFlightCorridor, flyToFlightWaypoint]);

  const stopCinematicFlyThrough = useCallback(() => {
    if (flightTimerRef.current) {
      clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }
    setIsFlightPlaying(false);
    isFlightPlayingRef.current = false;
    setActiveFlightCorridor(null);
    activeFlightCorridorRef.current = null;

    if (map.current) {
      const src = map.current.getSource('flight-corridor-source') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
      map.current.easeTo({ pitch: is3D ? 52 : 0, bearing: 0, zoom: 8.2, duration: 1200 });
    }
  }, [is3D]);


  const togglePlayFlight = useCallback(() => {
    const next = !isFlightPlaying;
    setIsFlightPlaying(next);
    isFlightPlayingRef.current = next;

    if (next && activeFlightCorridorRef.current) {
      flyToFlightWaypoint(flightWaypointIndexRef.current);
    } else if (flightTimerRef.current) {
      clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }
  }, [isFlightPlaying, flyToFlightWaypoint]);

  const nextFlightWaypoint = useCallback(() => {
    if (!activeFlightCorridorRef.current) return;
    const nextIdx = Math.min(activeFlightCorridorRef.current.waypoints.length - 1, flightWaypointIndexRef.current + 1);
    flyToFlightWaypoint(nextIdx);
  }, [flyToFlightWaypoint]);

  const prevFlightWaypoint = useCallback(() => {
    if (!activeFlightCorridorRef.current) return;
    const prevIdx = Math.max(0, flightWaypointIndexRef.current - 1);
    flyToFlightWaypoint(prevIdx);
  }, [flyToFlightWaypoint]);

  const handleFlightSpeedChange = useCallback((spd: number) => {
    setFlightSpeed(spd);
    flightSpeedRef.current = spd;
  }, []);


  function fitNigeria(animate = true) {
    if (!map.current) return;
    map.current.fitBounds(NIGERIA_BOUNDS, {
      padding: responsivePadding(mapContainer.current),
      duration: animate ? 600 : 0,
    });
  }

  function highlightState(code: string | string[] | null) {
    if (!map.current?.getLayer('states-selected')) return;
    if (!code || (Array.isArray(code) && code.length === 0)) {
      map.current.setFilter('states-selected', ['==', ['get', 'admin1Pcod'], '']);
    } else if (Array.isArray(code)) {
      map.current.setFilter('states-selected', ['in', ['get', 'admin1Pcod'], ['literal', code]]);
    } else {
      map.current.setFilter('states-selected', ['==', ['get', 'admin1Pcod'], code]);
    }
  }

  function highlightLga(code: string | string[] | null) {
    if (!map.current?.getLayer('lgas-selected')) return;
    if (!code || (Array.isArray(code) && code.length === 0)) {
      map.current.setFilter('lgas-selected', ['==', ['get', 'admin2Pcod'], '']);
    } else if (Array.isArray(code)) {
      map.current.setFilter('lgas-selected', ['in', ['get', 'admin2Pcod'], ['literal', code]]);
    } else {
      map.current.setFilter('lgas-selected', ['==', ['get', 'admin2Pcod'], code]);
    }
  }

  const animRef = useRef<number | null>(null);
  const activeCoordRef = useRef<[number, number] | null>(null);

  function stopBlinking() {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    activeCoordRef.current = null;
  }

  function startBlinking() {
    stopBlinking();
    let start = performance.now();
    function step(now: number) {
      if (!map.current || !activeCoordRef.current) return;
      const elapsed = (now - start) % 1500;
      const progress = elapsed / 1500; // 0 to 1

      // Pulsing radius: expands outwards
      const baseRadius = 14;
      const maxRadius = 36;
      const currentRadius = baseRadius + (maxRadius - baseRadius) * progress;

      // Pulsing opacity: fades as it expands
      const glowOpacity = (1 - progress) * 0.75;
      const ringOpacity = (1 - progress) * 0.95;

      if (map.current.getLayer('selected-point-glow')) {
        map.current.setPaintProperty('selected-point-glow', 'circle-radius', currentRadius);
        map.current.setPaintProperty('selected-point-glow', 'circle-opacity', Math.max(0.05, glowOpacity));
      }
      if (map.current.getLayer('selected-point-ring')) {
        map.current.setPaintProperty('selected-point-ring', 'circle-radius', currentRadius * 0.7);
        map.current.setPaintProperty('selected-point-ring', 'circle-stroke-opacity', Math.max(0.1, ringOpacity));
      }

      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }

  function highlightPoint(coords: [number, number] | null, color = '#fbbf24') {
    const src = map.current?.getSource('selected-point-source') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (!coords) {
      stopBlinking();
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    activeCoordRef.current = coords;
    src.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: { color },
        },
      ],
    });
    startBlinking();
  }

  useImperativeHandle(ref, () => ({
    flyToCommunity(item: any) {
      if (!map.current) return;
      const lon = item.longitude ?? (item.center ? item.center[0] : null);
      const lat = item.latitude ?? (item.center ? item.center[1] : null);

      const isLga = item.type === 'lga';
      const zoom = isLga ? 9.0 : 11.5;

      if (lon != null && lat != null) {
        map.current.flyTo({ center: [lon, lat], zoom, essential: true });
      }

      const lgaCode = item.lgaCode ?? item.lgaId ?? (isLga ? item.code : null);
      const stateCode = item.stateCode ?? item.stateId;
      highlightLga(lgaCode ?? null);
      highlightState(stateCode ?? null);

      const isSE = stateCode ? SE_STATE_CODES.includes(stateCode) : false;
      const isIdentifiedLga = lgaCode ? identifiedRef.current.includes(lgaCode) : false;
      const isIgboArea = isSE || isIdentifiedLga;

      const nearestRiver = (lon != null && lat != null) ? calculateNearestWaterway(lon, lat) : undefined;
      const dialectCluster = isIgboArea ? getDialectForLocation(item.stateName, item.lgaName) : undefined;

      if (item.source === 'community' || item.type === 'community') {
        const isChallenged = item.verificationStatus === 'challenged';
        const isPending = item.verificationStatus === 'pending';
        const markerColor = isChallenged ? '#ef4444' : isPending ? '#f59e0b' : '#10b981';
        if (lon != null && lat != null) {
          highlightPoint([lon, lat], markerColor);
        }
        onSelectRef.current({
          type: 'community',
          name: item.name,
          code: item.id,
          coordinates: [lon, lat],
          parentName: [item.lgaName && `${item.lgaName} LGA`, item.stateName && `${item.stateName} State`].filter(Boolean).join(', '),
          identityStatus: item.identityStatus,
          verificationStatus: item.verificationStatus,
          confirmationsCount: item.confirmationsCount,
          markerColor,
          colorLabel: isChallenged ? 'Challenged Submission' : isPending ? 'Pending Community' : 'Verified Community',
          colorExplanation: isChallenged
            ? 'Marked in red because this record has active community disputes.'
            : isPending
            ? 'Marked in amber awaiting confirmations and verification.'
            : 'Marked in emerald green matching the Southeast baseline because it is a verified Igbo community.',
          whyMarked: 'Documented participatory community record submitted to substantiate cultural geography.',
          nearestRiver,
          dialectCluster,
        });
      } else if (isLga) {
        const markerColor = isIgboArea ? '#10b981' : '#64748b';
        if (lon != null && lat != null) {
          highlightPoint([lon, lat], markerColor);
        }
        onSelectRef.current({
          type: 'lga',
          name: item.name,
          code: item.lgaCode,
          coordinates: lon != null && lat != null ? [lon, lat] : undefined,
          parentName: item.stateName ? `${item.stateName} State` : undefined,
          zone: isSE ? 'southeast' : isIdentifiedLga ? 'identified' : 'reference',
          placeType: 'Local Government Area (LGA)',
          markerColor,
          colorLabel: isSE ? 'Southeast Igbo Homeland' : isIdentifiedLga ? 'Identified Igbo LGA (Anioma / Rivers)' : 'Regional Administrative LGA',
          colorExplanation: isSE
            ? 'Located in the Southeast geopolitical zone.'
            : isIdentifiedLga
            ? 'Documented Igbo-identifying LGA outside the Southeast with cultural and linguistic Igbo heritage.'
            : 'Administrative Local Government Area within Nigeria.',
          whyMarked: `Administrative LGA boundary in ${item.stateName ? item.stateName + ' State' : 'Nigeria'}.`,
          nearestRiver,
          dialectCluster,
        });
      } else if (item.type === 'market' || item.type === 'marketplace' || item.type === 'landmark') {
        if (lon != null && lat != null) {
          highlightPoint([lon, lat], '#f59e0b');
        }
        onSelectRef.current({
          type: 'landmark',
          name: item.name,
          parentName: [item.lgaName && `${item.lgaName} LGA`, item.stateName && `${item.stateName} State`].filter(Boolean).join(', '),
          code: item.id,
          coordinates: lon != null && lat != null ? [lon, lat] : undefined,
          placeType: item.typeLabel || 'Traditional Market',
          markerColor: '#f59e0b',
          colorLabel: 'Golden Amber (Cultural Marker)',
          colorExplanation: 'Marked in golden amber to highlight documented traditional markets (e.g. Eke, Orie, Afor, Nkwo four-day market cycle) and civic landmarks.',
          whyMarked: 'Cultural and civic point of interest catalogued by HOTOSM / OpenStreetMap.',
          nearestRiver,
          dialectCluster,
        });
      } else {
        const placeType = item.type ? `${item.type.charAt(0).toUpperCase()}${item.type.slice(1)}` : 'Settlement';
        const markerColor = isIgboArea ? '#10b981' : '#ef4444';
        if (lon != null && lat != null) {
          highlightPoint([lon, lat], markerColor);
        }
        onSelectRef.current({
          type: 'settlement',
          name: item.name,
          parentName: [item.lgaName && `${item.lgaName} LGA`, item.stateName && `${item.stateName} State`].filter(Boolean).join(', '),
          code: item.id,
          coordinates: lon != null && lat != null ? [lon, lat] : undefined,
          placeType,
          markerColor,
          colorLabel: isIgboArea ? 'Emerald Green (Igbo Area)' : 'Crimson Red (Regional Reference)',
          colorExplanation: isIgboArea
            ? 'Marked in emerald green matching the Southeast baseline because it is located in an established Igbo homeland state or identified Igbo LGA.'
            : 'Marked in contrasting red to distinguish non-Igbo regional settlements in surrounding target states as geographic reference points.',
          whyMarked: `Physical settlement footprint catalogued by GRID3 Nigeria / HOTOSM. Classified as a ${item.type || 'settlement'}.`,
          nearestRiver,
          dialectCluster,
        });
      }
    },
    flyTo(center, zoom) {
      map.current?.flyTo({ center, zoom, essential: true });
    },
    resetView() {
      highlightState(null);
      highlightLga(null);
      highlightPoint(null);
      fitNigeria(true);
    },
    refreshCommunities() {
      const src = map.current?.getSource('communities-source') as maplibregl.GeoJSONSource | undefined;
      src?.setData('/api/map/communities.geojson');
      const densitySrc = map.current?.getSource('density-source') as maplibregl.GeoJSONSource | undefined;
      densitySrc?.setData('/api/map/igbo-density.geojson');
    },
    openAddModal(coords, name) {
      if (onOpenAddModalRef.current) {
        onOpenAddModalRef.current(coords, name);
      } else {
        setPendingCoords(coords);
        setPendingName(name || '');
      }
    },
    getCenter() {
      if (map.current) {
        const c = map.current.getCenter();
        return { lon: c.lng, lat: c.lat };
      }
      return { lon: 7.2, lat: 5.8 };
    },
    setFilterType(filter) {
      onFilterChange?.(filter);
    },
    toggle3D() {
      toggle3D();
    },
    start3DOrbit() {
      startOrbit();
    },
    stop3DOrbit() {
      stopOrbit();
    },
    setPitchPreset(pitch: number) {
      setPitchPreset(pitch);
      if (map.current && is3D) {
        map.current.easeTo({ pitch, duration: 600 });
      }
    },
    highlightLgas(codes) {
      highlightPoint(null);
      highlightLga(codes);
    },
    highlightRegion(codes, center, zoom) {
      highlightPoint(null);
      highlightLga(codes);
      map.current?.flyTo({ center, zoom, essential: true });
    },
    selectLgaByCode(code) {
      highlightPoint(null);
      highlightLga(code);
      const allBeyond = BEYOND_SOUTHEAST_REGIONS.flatMap((r) => r.lgas);
      const match = allBeyond.find((l) => l.code === code);
      if (match) {
        map.current?.flyTo({ center: match.center, zoom: 10, essential: true });
        const nearestRiver = calculateNearestWaterway(match.center[0], match.center[1]);
        const dialectCluster = getDialectForLocation(match.state, match.name);
        onSelectRef.current({
          type: 'lga',
          name: match.name,
          code: match.code,
          coordinates: match.center,
          parentName: `${match.state} State`,
          zone: 'identified',
          placeType: 'Local Government Area (LGA)',
          markerColor: '#10b981',
          colorLabel: 'Identified Igbo LGA (Beyond Southeast)',
          colorExplanation: `Documented Igbo-identifying LGA in ${match.state} State with established cultural and linguistic heritage.`,
          whyMarked: `Administrative LGA boundary in ${match.state} State within the documented cultural continuum outside the Southeast.`,
          nearestRiver,
          dialectCluster,
        });
      }
    },
    selectStateByCode(code) {
      highlightPoint(null);
      highlightLga(null);
      highlightState(code);
      const stateInfo = SE_STATES.find((s) => s.code === code);
      if (stateInfo) {
        map.current?.flyTo({ center: stateInfo.center, zoom: stateInfo.zoom, essential: true });
        const nearestRiver = calculateNearestWaterway(stateInfo.center[0], stateInfo.center[1]);
        const dialectCluster = getDialectForLocation(stateInfo.name);
        onSelectRef.current({
          type: 'state',
          name: stateInfo.name,
          code: stateInfo.code,
          coordinates: stateInfo.center,
          zone: 'southeast',
          placeType: 'State (Igbo Homeland)',
          markerColor: '#10b981',
          colorLabel: 'Southeast Igbo Homeland (100% Baseline)',
          colorExplanation: `${stateInfo.name} State is in the Southeast geopolitical zone, contiguous with neighboring Igbo-speaking communities.`,
          whyMarked: `Authoritative administrative state boundary comprising ${stateInfo.lgasCount} LGAs. Capital: ${stateInfo.capital}.`,
          historicalNotes: stateInfo.historicalSummary,
          dialect: stateInfo.dialects,
          whySignificant: `Cultural & Economic Epicenter: ${stateInfo.culturalHeart}`,
          nearestRiver,
          dialectCluster,
        });
      }
    },
    inspectMigrationArc(arc) {
      if (!map.current || !arc) return;
      highlightPoint(null);
      highlightLga(null);
      highlightState(null);

      // Fit map bounds across origin and destination
      const minLon = Math.min(arc.origin.coordinates[0], arc.destination.coordinates[0]);
      const maxLon = Math.max(arc.origin.coordinates[0], arc.destination.coordinates[0]);
      const minLat = Math.min(arc.origin.coordinates[1], arc.destination.coordinates[1]);
      const maxLat = Math.max(arc.origin.coordinates[1], arc.destination.coordinates[1]);

      map.current.fitBounds(
        [[minLon - 0.25, minLat - 0.25], [maxLon + 0.25, maxLat + 0.25]],
        { padding: 60, duration: 800, essential: true }
      );

      const centerCoord: [number, number] = [
        (arc.origin.coordinates[0] + arc.destination.coordinates[0]) / 2,
        (arc.origin.coordinates[1] + arc.destination.coordinates[1]) / 2,
      ];
      highlightPoint(arc.origin.coordinates, arc.color || '#f59e0b');

      onSelectRef.current({
        type: 'migration',
        name: arc.name,
        code: arc.id,
        coordinates: centerCoord,
        placeType: 'Ancestral Migration Corridor',
        markerColor: arc.color || '#f59e0b',
        colorLabel: `Migration Corridor (${arc.era})`,
        colorExplanation: `Historical migration arc connecting ${arc.origin.name} to ${arc.destination.name}.`,
        whyMarked: `Historical diaspora corridor: ${arc.description}`,
        historicalNotes: `Era: ${arc.era}. Origin: ${arc.origin.name} (${arc.origin.coordinates[0].toFixed(2)}°E, ${arc.origin.coordinates[1].toFixed(2)}°N) ➔ Destination: ${arc.destination.name} (${arc.destination.coordinates[0].toFixed(2)}°E, ${arc.destination.coordinates[1].toFixed(2)}°N).`,
        nearestRiver: calculateNearestWaterway(centerCoord[0], centerCoord[1]),
      });
    },
    highlightDialectCluster(cluster) {
      if (!map.current || !cluster) return;
      highlightPoint(null);

      // Fly to approximate center of dialect cluster based on state
      const clusterCenters: Record<string, [number, number]> = {
        waawa: [7.45, 6.6],
        northeastern: [8.05, 6.25],
        central: [7.15, 5.5],
        anioma: [6.45, 6.1],
        southern: [6.95, 4.95],
        crossriver: [7.9, 5.5],
        anambra_basin: [6.9, 6.2],
      };
      const center = clusterCenters[cluster.id] || [7.2, 5.8];
      map.current.flyTo({ center, zoom: 8.4, essential: true });

      onSelectRef.current({
        type: 'region',
        name: `${cluster.name} (${cluster.igboName})`,
        code: cluster.id,
        coordinates: center,
        placeType: 'Linguistic Dialect Continuum',
        markerColor: cluster.color || '#38bdf8',
        colorLabel: 'Dialect Continuum Zone',
        colorExplanation: cluster.description,
        whyMarked: `Covering areas across ${cluster.states.join(', ')} State(s). Key landmarks: ${cluster.features.join(', ')}.`,
        dialect: cluster.name,
        dialectGreeting: cluster.sampleGreeting,
        nearestRiver: calculateNearestWaterway(center[0], center[1]),
      });
    },
    filterLandmarksByMarketDay(dayName) {
      if (!map.current) return;
      if (!dayName) {
        if (map.current.getLayer('landmarks-points')) {
          map.current.setFilter('landmarks-points', null);
        }
        if (map.current.getLayer('landmarks-labels')) {
          map.current.setFilter('landmarks-labels', null);
        }
      } else {
        const lowerDay = dayName.toLowerCase();
        let terms = [lowerDay];
        if (lowerDay.includes('orie') || lowerDay.includes('oye')) {
          terms = ['orie', 'oye'];
        } else if (lowerDay.includes('af')) {
          terms = ['afor', 'afọ', 'afo'];
        } else if (lowerDay.includes('nkw')) {
          terms = ['nkwo', 'nkwọ'];
        } else if (lowerDay.includes('eke')) {
          terms = ['eke'];
        }

        const checks = terms.flatMap((term) => [
          ['in', term, ['downcase', ['coalesce', ['get', 'name'], '']]],
          ['in', term, ['downcase', ['coalesce', ['get', 'name_latin'], '']]],
        ]);

        const dayFilter: any = ['any', ...checks];
        if (map.current.getLayer('landmarks-points')) {
          map.current.setFilter('landmarks-points', dayFilter);
        }
        if (map.current.getLayer('landmarks-labels')) {
          map.current.setFilter('landmarks-labels', dayFilter);
        }

        // If zoom is less than 8, zoom in so traditional market points and labels are visible
        if (map.current.getZoom() < 8) {
          map.current.flyTo({ center: [7.2, 5.8], zoom: 8.2, essential: true });
        }
      }
    },
    startCinematicFlyThrough(corridorId: string) {
      startCinematicFlyThrough(corridorId);
    },
    stopCinematicFlyThrough() {
      stopCinematicFlyThrough();
    },
    openKindredMappingModal(coords?: { lon: number; lat: number }, community?: { id: string; name: string }) {
      if (coords) setPendingKindredCoords(coords);
      if (community) setSelectedKindredCommunity(community);
      setShowKindredModal(true);
    },
    togglePinKindredMode() {
      const next = !isPinningKindred;
      setIsPinningKindred(next);
      isPinningKindredRef.current = next;
    },
    resize() {
      map.current?.resize();
    },
  }));

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          },
          'topo-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Topo',
          },
          'light-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri Light Gray Canvas',
          },
          'historical-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/DeLorme_World_Base_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Historical Survey Archive',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#060911',
            },
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            layout: {
              visibility: basemapMode === 'satellite' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.85,
            },
          },
          {
            id: 'topo-layer',
            type: 'raster',
            source: 'topo-tiles',
            layout: {
              visibility: basemapMode === 'topo' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.85,
            },
          },
          {
            id: 'light-layer',
            type: 'raster',
            source: 'light-tiles',
            layout: {
              visibility: basemapMode === 'light' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.88,
            },
          },
          {
            id: 'historical-layer',
            type: 'raster',
            source: 'historical-tiles',
            layout: {
              visibility: showHistoricalOverlay ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': historicalOpacity,
            },
          },
        ],
      },
      bounds: NIGERIA_BOUNDS,
      fitBoundsOptions: { padding: responsivePadding(mapContainer.current) },
      minZoom: 3.5,
      maxZoom: 15,
      maxPitch: 85,
      maxBounds: [-4.0, -2.0, 22.0, 21.0],
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
    });

    mapInstance.on('error', (e) => {
      console.error('MapLibre error:', e);
    });

    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-right');

    mapInstance.on('dragstart', () => {
      if (isOrbitingRef.current) stopOrbit();
      if (isFlightPlayingRef.current) {
        setIsFlightPlaying(false);
        isFlightPlayingRef.current = false;
        if (flightTimerRef.current) {
          clearTimeout(flightTimerRef.current);
          flightTimerRef.current = null;
        }
      }
    });

    mapInstance.on('load', () => {
      // ── 3D Terrain DEM & Atmospheric Horizon ──
      mapInstance.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 13,
      });

      if (typeof mapInstance.setSky === 'function') {
        mapInstance.setSky({
          'sky-color': '#030712',
          'horizon-color': '#0d1527',
          'fog-color': '#090e1c',
          'fog-ground-blend': 0.75,
          'atmosphere-blend': 0.8,
        });
      }

      // ── States ──
      mapInstance.addSource('states-source', { type: 'geojson', data: '/data/states.geojson' });

      mapInstance.addLayer({
        id: 'states-fill',
        type: 'fill',
        source: 'states-source',
        paint: {
          'fill-color': ['match', ['get', 'admin1Pcod'], SE_STATE_CODES, '#059669', '#162032'],
          'fill-opacity': ['match', ['get', 'admin1Pcod'], SE_STATE_CODES, 0.88, 0.75],
        },
      });

      // ── LGAs ──
      mapInstance.addSource('lgas-source', { type: 'geojson', data: '/data/lgas.geojson' });

      mapInstance.addLayer({
        id: 'lgas-fill',
        type: 'fill',
        source: 'lgas-source',
        paint: {
          'fill-color': [
            'case',
            ['in', ['get', 'admin1Pcod'], ['literal', SE_STATE_CODES]], 'rgba(0,0,0,0)',
            ['in', ['get', 'admin2Pcod'], ['literal', identifiedRef.current]], '#059669',
            'rgba(0,0,0,0)',
          ],
          'fill-opacity': 0.82,
        },
      });

      mapInstance.addLayer({
        id: 'lgas-outline',
        type: 'line',
        source: 'lgas-source',
        paint: {
          'line-color': [
            'case',
            ['in', ['get', 'admin1Pcod'], ['literal', SE_STATE_CODES]], 'rgba(6, 78, 59, 0.9)',
            ['in', ['get', 'admin2Pcod'], ['literal', identifiedRef.current]], 'rgba(6, 78, 59, 0.9)',
            '#26324a',
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 0.9],
          'line-opacity': 0.8,
        },
      });

      // ── 3D Volumetric Extrusions for LGAs / Settlement Clusters ──
      mapInstance.addLayer({
        id: 'lgas-3d-extrusion',
        type: 'fill-extrusion',
        source: 'lgas-source',
        layout: {
          visibility: 'none',
        },
        paint: {
          'fill-extrusion-color': [
            'case',
            ['in', ['get', 'admin1Pcod'], ['literal', SE_STATE_CODES]], '#10b981',
            ['in', ['get', 'admin2Pcod'], ['literal', identifiedRef.current]], '#059669',
            '#0284c7',
          ],
          'fill-extrusion-height': [
            'case',
            ['in', ['get', 'admin1Pcod'], ['literal', SE_STATE_CODES]], 3200,
            ['in', ['get', 'admin2Pcod'], ['literal', identifiedRef.current]], 2000,
            700,
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.42,
        },
      });

      mapInstance.addLayer({
        id: 'states-outline',
        type: 'line',
        source: 'states-source',
        paint: {
          'line-color': ['match', ['get', 'admin1Pcod'], SE_STATE_CODES, '#6ee7b7', '#475569'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, ['match', ['get', 'admin1Pcod'], SE_STATE_CODES, 1.4, 0.8], 8, 2.4],
          'line-opacity': 0.95,
        },
      });

      mapInstance.addLayer({
        id: 'states-labels',
        type: 'symbol',
        source: 'states-source',
        minzoom: 5.0,
        layout: {
          'text-field': '{admin1Name}',
          'text-size': ['interpolate', ['linear'], ['zoom'], 5.0, 10, 7.5, 13, 9, 15],
          'text-font': ['Noto Sans Bold'],
          'text-max-width': 8,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#040814',
          'text-halo-width': 2.2,
          'text-halo-blur': 1.2,
        },
      });

      mapInstance.addLayer({
        id: 'lgas-selected',
        type: 'line',
        source: 'lgas-source',
        filter: ['==', ['get', 'admin2Pcod'], ''],
        paint: { 'line-color': '#fbbf24', 'line-width': 2 },
      });
      mapInstance.addLayer({
        id: 'states-selected',
        type: 'line',
        source: 'states-source',
        filter: ['==', ['get', 'admin1Pcod'], ''],
        paint: { 'line-color': '#fde68a', 'line-width': 2.8 },
      });

      mapInstance.addLayer({
        id: 'states-hover',
        type: 'fill',
        source: 'states-source',
        filter: ['==', ['get', 'admin1Pcod'], ''],
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.06 },
      });

      // ── Waterways (Rivers & Streams) ── Defer heavy 7MB GeoJSON to avoid main-thread mobile block
      mapInstance.addSource('waterways-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Atmospheric River Glow
      mapInstance.addLayer({
        id: 'waterways-glow',
        type: 'line',
        source: 'waterways-source',
        paint: {
          'line-color': '#0284c7',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 9, 6.0, 12, 11.0],
          'line-opacity': 0.28,
          'line-blur': 3.5,
        },
      });

      // Crisp River Spine
      mapInstance.addLayer({
        id: 'waterways-lines',
        type: 'line',
        source: 'waterways-source',
        paint: {
          'line-color': '#38bdf8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 9, 2.2, 12, 3.8],
          'line-opacity': 0.85,
        },
      });

      // ── Settlements (Towns, Villages, Cities) ──
      mapInstance.addSource('settlements-source', { type: 'geojson', data: '/data/regional_settlements.geojson' });

      mapInstance.addLayer({
        id: 'settlements-points',
        type: 'circle',
        source: 'settlements-source',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            4, ['match', ['get', 'place'], 'city', 4, 'town', 3, 2],
            7, ['match', ['get', 'place'], 'city', 6, 'town', 4.5, 3],
            10, ['match', ['get', 'place'], 'city', 9, 'town', 7, 5]
          ],
          'circle-color': [
            'case',
            // In 5 Southeast States -> Same emerald green as homeland
            ['in', ['get', 'adm1_pcode'], ['literal', SE_STATE_CODES]], '#10b981',
            // In identified Igbo peripheral LGAs (Anioma & Rivers Igbo) -> Same emerald green
            ['in', ['get', 'adm2_pcode'], ['literal', identifiedRef.current]], '#10b981',
            // Non-Igbo / outside areas -> Distinct contrasting warm red
            '#ef4444'
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#020617',
        },
      });

      mapInstance.addLayer({
        id: 'settlements-labels',
        type: 'symbol',
        source: 'settlements-source',
        minzoom: 5.5,
        layout: {
          'text-field': '{name}',
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            5.5, 9,
            8, 11,
            11, 13
          ],
          'text-offset': [0, 0.9],
          'text-anchor': 'top',
          'text-max-width': 8,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#040814',
          'text-halo-width': 2.2,
          'text-halo-blur': 1.2,
        },
      });

      // ── Cultural Landmarks & Traditional Markets ──
      mapInstance.addSource('landmarks-source', { type: 'geojson', data: '/data/cultural_landmarks.geojson' });

      mapInstance.addLayer({
        id: 'landmarks-points',
        type: 'circle',
        source: 'landmarks-source',
        minzoom: 7,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 10, 5, 12, 7],
          'circle-color': '#f59e0b',
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      mapInstance.addLayer({
        id: 'landmarks-labels',
        type: 'symbol',
        source: 'landmarks-source',
        minzoom: 8.5,
        layout: {
          'text-field': '{name}',
          'text-size': ['interpolate', ['linear'], ['zoom'], 8.5, 9.5, 11, 12],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#fde68a',
          'text-halo-color': '#040814',
          'text-halo-width': 2.2,
          'text-halo-blur': 1.2,
        },
      });

      // ── Derived Community Density Heatmap ──
      mapInstance.addSource('density-source', {
        type: 'geojson',
        data: '/api/map/igbo-density.geojson',
      });

      mapInstance.addLayer(
        {
          id: 'density-heat',
          type: 'heatmap',
          source: 'density-source',
          layout: {
            visibility: showDensity ? 'visible' : 'none',
          },
          paint: {
            // Factor dynamic point weight from verified Supabase records
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0.1, 0.1, 2.0, 1.8],
            // Scale intensity across zoom levels
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 7, 1.3, 10, 2.6],
            // Multi-spectral cartographic palette: transparent -> emerald aura -> luminous teal -> spring green -> amber -> deep warm gold
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.15, 'rgba(5, 150, 105, 0.20)',
              0.35, 'rgba(16, 185, 129, 0.45)',
              0.55, 'rgba(52, 211, 153, 0.70)',
              0.75, 'rgba(251, 191, 36, 0.86)',
              0.95, 'rgba(245, 158, 11, 0.98)',
            ],
            // Dynamic radius scaling with zoom
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 7, 32, 10, 55, 13, 80],
            // Gracefully adjust opacity at close zooms to reveal village markers
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.82, 8, 0.78, 11, 0.60, 13, 0.35],
          },
        }
      );

      // ── Communities ──
      mapInstance.addSource('communities-source', { type: 'geojson', data: '/api/map/communities.geojson' });

      mapInstance.addLayer({
        id: 'communities-glow',
        type: 'circle',
        source: 'communities-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 10, 16],
          'circle-color': [
            'case',
            ['==', ['get', 'lifecycleStatus'], 'DELISTED'], '#64748b',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_DELIST'], '#f59e0b',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_REINSTATE'], '#06b6d4',
            ['==', ['get', 'verification_status'], 'challenged'], '#ef4444',
            ['==', ['get', 'verification_status'], 'pending'], '#f59e0b',
            '#10b981'
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'lifecycleStatus'], 'DELISTED'], 0.12,
            0.32
          ],
          'circle-blur': 0.9,
        },
      });

      mapInstance.addLayer({
        id: 'communities-points',
        type: 'circle',
        source: 'communities-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 6, 8, 8, 11, 12],
          'circle-color': [
            'case',
            ['==', ['get', 'lifecycleStatus'], 'DELISTED'], '#475569',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_DELIST'], '#f59e0b',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_REINSTATE'], '#06b6d4',
            ['==', ['get', 'verification_status'], 'challenged'], '#ef4444',
            ['==', ['get', 'verification_status'], 'pending'], '#f59e0b',
            '#10b981'
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'lifecycleStatus'], 'DELISTED'], 0.45,
            1.0
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'lifecycleStatus'], 'DELISTED'], '#94a3b8',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_DELIST'], '#fef08a',
            ['==', ['get', 'lifecycleStatus'], 'CONTESTED_REINSTATE'], '#a5f3fc',
            '#ffffff'
          ],
        },
      });

      mapInstance.addLayer({
        id: 'communities-labels',
        type: 'symbol',
        source: 'communities-source',
        layout: {
          'text-field': '{name}',
          'text-size': 12,
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#fde047',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      });

      // ── Selected Point Marker (Target Pin / Beacon for Search & Click) ──
      mapInstance.addSource('selected-point-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      mapInstance.addLayer({
        id: 'selected-point-glow',
        type: 'circle',
        source: 'selected-point-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 9, 28, 12, 38],
          'circle-color': ['coalesce', ['get', 'color'], '#fbbf24'],
          'circle-opacity': 0.35,
          'circle-blur': 0.7,
        },
      });

      mapInstance.addLayer({
        id: 'selected-point-ring',
        type: 'circle',
        source: 'selected-point-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 9, 9, 14, 12, 18],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 3,
          'circle-stroke-color': ['coalesce', ['get', 'color'], '#fbbf24'],
        },
      });

      mapInstance.addLayer({
        id: 'selected-point-center',
        type: 'circle',
        source: 'selected-point-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 9, 6, 12, 8],
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        },
      });

      // ── Dialect Continuum Zones ──
      mapInstance.addSource('dialect-source', { type: 'geojson', data: '/data/dialect_zones.geojson' });

      mapInstance.addLayer({
        id: 'dialect-fill',
        type: 'fill',
        source: 'dialect-source',
        filter: ['==', '$type', 'Polygon'],
        layout: { visibility: showDialects ? 'visible' : 'none' },
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#10b981'],
          'fill-opacity': 0.12,
        },
      });

      mapInstance.addLayer({
        id: 'dialect-outline',
        type: 'line',
        source: 'dialect-source',
        filter: ['==', '$type', 'Polygon'],
        layout: { visibility: showDialects ? 'visible' : 'none' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#10b981'],
          'line-width': 1.6,
          'line-dasharray': [3, 2],
          'line-opacity': 0.65,
        },
      });

      mapInstance.addLayer({
        id: 'dialect-labels',
        type: 'symbol',
        source: 'dialect-source',
        filter: ['==', '$type', 'Point'],
        layout: {
          visibility: showDialects ? 'visible' : 'none',
          'text-field': '{name}\n({igboName})',
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 8, 12, 10, 14],
          'text-font': ['Noto Sans Bold'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#040814',
          'text-halo-width': 2.5,
          'text-halo-blur': 1,
        },
      });

      // ── Ancestral Migration Arcs ──
      mapInstance.addSource('migration-source', { type: 'geojson', data: '/data/migration_arcs.geojson' });

      mapInstance.addLayer({
        id: 'migration-glow',
        type: 'line',
        source: 'migration-source',
        filter: ['==', '$type', 'LineString'],
        layout: { visibility: showMigrationArcs ? 'visible' : 'none' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#f59e0b'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 7, 12, 12],
          'line-opacity': 0.35,
          'line-blur': 3,
        },
      });

      mapInstance.addLayer({
        id: 'migration-lines',
        type: 'line',
        source: 'migration-source',
        filter: ['==', '$type', 'LineString'],
        layout: { visibility: showMigrationArcs ? 'visible' : 'none' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#f59e0b'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 8, 2.5, 12, 4],
          'line-opacity': 0.9,
          'line-dasharray': [2, 1.5],
        },
      });

      mapInstance.addLayer({
        id: 'migration-hubs',
        type: 'circle',
        source: 'migration-source',
        filter: ['==', '$type', 'Point'],
        layout: { visibility: showMigrationArcs ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 8, 7, 12, 9],
          'circle-color': ['coalesce', ['get', 'color'], '#f59e0b'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapInstance.addLayer({
        id: 'migration-labels',
        type: 'symbol',
        source: 'migration-source',
        filter: ['==', '$type', 'Point'],
        layout: {
          visibility: showMigrationArcs ? 'visible' : 'none',
          'text-field': '{name}',
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9.5, 9, 12],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#fde68a',
          'text-halo-color': '#040814',
          'text-halo-width': 2,
        },
      });

      // ── 3D Cinematic Flight Corridor Trajectory Layer ──
      mapInstance.addSource('flight-corridor-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      mapInstance.addLayer({
        id: 'flight-corridor-glow',
        type: 'line',
        source: 'flight-corridor-source',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#10b981',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 8, 11, 16],
          'line-opacity': 0.45,
          'line-blur': 6,
        },
      });

      mapInstance.addLayer({
        id: 'flight-corridor-line',
        type: 'line',
        source: 'flight-corridor-source',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#34d399',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 11, 4.5],
          'line-opacity': 0.95,
          'line-dasharray': [3, 1.5],
        },
      });

      mapInstance.addLayer({
        id: 'flight-corridor-beacon',
        type: 'circle',
        source: 'flight-corridor-source',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 11, 10],
          'circle-color': '#38bdf8',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
        },
      });

      // ── Option 4: Kindred (Ụmụnna) & Village Landmarks ──
      mapInstance.addSource('kindred-landmarks-source', {
        type: 'geojson',
        data: '/api/landmarks',
      });

      mapInstance.addLayer({
        id: 'kindred-landmarks-glow',
        type: 'circle',
        source: 'kindred-landmarks-source',
        minzoom: 7.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7.5, 6, 11, 14],
          'circle-color': [
            'match',
            ['get', 'category'],
            'village_square', '#10b981',
            'kindred_hall', '#f59e0b',
            'sacred_grove', '#14b8a6',
            'heritage_spring', '#06b6d4',
            'market_post', '#a855f7',
            'monument', '#ec4899',
            '#38bdf8'
          ],
          'circle-opacity': 0.35,
          'circle-blur': 0.8,
        },
      });

      mapInstance.addLayer({
        id: 'kindred-landmarks-points',
        type: 'circle',
        source: 'kindred-landmarks-source',
        minzoom: 7.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7.5, 3.5, 10, 5.5, 12, 7.5],
          'circle-color': [
            'match',
            ['get', 'category'],
            'village_square', '#10b981',
            'kindred_hall', '#f59e0b',
            'sacred_grove', '#14b8a6',
            'heritage_spring', '#06b6d4',
            'market_post', '#a855f7',
            'monument', '#ec4899',
            '#38bdf8'
          ],
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      mapInstance.addLayer({
        id: 'kindred-landmarks-labels',
        type: 'symbol',
        source: 'kindred-landmarks-source',
        minzoom: 9.0,
        layout: {
          'text-field': '{name}',
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 11, 11.5],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#a5f3fc',
          'text-halo-color': '#020617',
          'text-halo-width': 2.2,
          'text-halo-blur': 1,
        },
      });

      // Hydrate offline kindred landmarks & offline communities from IndexedDB
      getKindredLandmarksOffline().then((localLandmarks) => {
        if (localLandmarks && localLandmarks.length > 0) {
          fetch('/api/landmarks')
            .then((r) => r.json())
            .then((remoteGeoJson) => {
              const features = Array.isArray(remoteGeoJson.features) ? [...remoteGeoJson.features] : [];
              const existingIds = new Set(features.map((f: any) => f.properties?.id));
              for (const kl of localLandmarks) {
                if (!existingIds.has(kl.id)) {
                  features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [kl.longitude, kl.latitude] },
                    properties: kl,
                  });
                }
              }
              const src = mapInstance.getSource('kindred-landmarks-source') as maplibregl.GeoJSONSource | undefined;
              src?.setData({ type: 'FeatureCollection', features } as any);
            })
            .catch(() => {
              const features = localLandmarks.map((kl) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [kl.longitude, kl.latitude] },
                properties: kl,
              }));
              const src = mapInstance.getSource('kindred-landmarks-source') as maplibregl.GeoJSONSource | undefined;
              src?.setData({ type: 'FeatureCollection', features } as any);
            });
        }
      });

      getOfflineCommunitiesGeoJSON().then((offlineGeo) => {
        if (offlineGeo && offlineGeo.features?.length > 0) {
          const src = mapInstance.getSource('communities-source') as maplibregl.GeoJSONSource | undefined;
          if (src && !navigator.onLine) {
            src.setData(offlineGeo);
          }
        }
      });

      const zoneOf = (stateCode: string, lgaCode?: string): HoverInfo['zone'] =>
        SE_STATE_CODES.includes(stateCode)
          ? 'southeast'
          : lgaCode && identifiedRef.current.includes(lgaCode)
          ? 'identified'
          : 'reference';

      mapInstance.on('mousemove', (e) => {
        // Track live coordinates for GIS status bar
        setCursorCoords({
          lat: Number(e.lngLat.lat.toFixed(4)),
          lng: Number(e.lngLat.lng.toFixed(4)),
          zoom: Number(mapInstance.getZoom().toFixed(1)),
        });

        const layers = ['communities-points', 'kindred-landmarks-points', 'landmarks-points', 'settlements-points', 'lgas-fill', 'states-fill'].filter(
          (l) => mapInstance.getLayer(l) && mapInstance.getLayoutProperty(l, 'visibility') !== 'none'
        );
        const feats = mapInstance.queryRenderedFeatures(e.point, { layers });
        const community = feats.find((f) => f.layer.id === 'communities-points');
        const kindred = feats.find((f) => f.layer.id === 'kindred-landmarks-points');
        const landmark = feats.find((f) => f.layer.id === 'landmarks-points');
        const settlement = feats.find((f) => f.layer.id === 'settlements-points');
        const lga = feats.find((f) => f.layer.id === 'lgas-fill');
        const state = feats.find((f) => f.layer.id === 'states-fill');

        const isDotHovered = Boolean(community || kindred || landmark || settlement);
        mapInstance.getCanvas().style.cursor = isAddActive() || isPinningKindredRef.current ? 'crosshair' : isDotHovered || state || lga ? 'pointer' : '';

        const stateCode = (state?.properties?.admin1Pcod ?? lga?.properties?.admin1Pcod ?? settlement?.properties?.adm1_pcode ?? landmark?.properties?.adm1_pcode) as string | undefined;
        mapInstance.setFilter('states-hover', ['==', ['get', 'admin1Pcod'], stateCode ?? '']);

        // 1. If hovering a kindred landmark dot
        if (kindred) {
          const p = kindred.properties as any;
          setHover({
            x: e.point.x,
            y: e.point.y,
            name: p.name,
            typeBadge: `ỤMỤNNA: ${(p.category || 'LANDMARK').toUpperCase().replace('_', ' ')}`,
            state: p.communityName ? `${p.communityName}` : undefined,
            lga: p.umunnaName ? `Ụmụnna: ${p.umunnaName}` : undefined,
            zone: 'southeast',
            colorLabel: 'Cyan: Kindred (Ụmụnna) Landmark',
            colorBg: 'bg-cyan-500/15',
            colorBorder: 'border-cyan-500/40',
            colorText: 'text-cyan-300',
          });
          return;
        }

        // 2. If hovering a community submission dot
        if (community) {
          const p = community.properties as any;
          const isChallenged = p.verification_status === 'challenged';
          const isPending = p.verification_status === 'pending';
          const colorLabel = isChallenged ? 'Challenged Submission' : isPending ? 'Pending Community' : 'Verified Igbo Community';
          const colorCls = isChallenged
            ? { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-300' }
            : isPending
            ? { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300' }
            : { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300' };

          setHover({
            x: e.point.x,
            y: e.point.y,
            name: p.name,
            typeBadge: 'Community Submission',
            state: p.state_name ? `${p.state_name} State` : undefined,
            lga: p.lga_name ? `${p.lga_name} LGA` : undefined,
            zone: zoneOf(p.state_id, p.lga_id),
            colorLabel,
            colorBg: colorCls.bg,
            colorBorder: colorCls.border,
            colorText: colorCls.text,
          });
          return;
        }

        // 2. If hovering a cultural landmark / market dot (Amber)
        if (landmark) {
          const p = landmark.properties as any;
          setHover({
            x: e.point.x,
            y: e.point.y,
            name: p.name || 'Traditional Landmark / Market',
            typeBadge: p.amenity ? `${p.amenity}`.toUpperCase() : 'CULTURAL LANDMARK',
            state: p.adm1_name ? `${p.adm1_name} State` : undefined,
            lga: p.adm2_name ? `${p.adm2_name} LGA` : undefined,
            zone: zoneOf(p.adm1_pcode, p.adm2_pcode),
            colorLabel: 'Amber: Traditional Market / Cultural Landmark',
            colorBg: 'bg-amber-500/15',
            colorBorder: 'border-amber-500/40',
            colorText: 'text-amber-300',
          });
          return;
        }

        // 3. If hovering a regional settlement dot
        if (settlement) {
          const p = settlement.properties as any;
          const isSE = p.adm1_pcode ? SE_STATE_CODES.includes(p.adm1_pcode) : false;
          const isIdentified = p.adm2_pcode ? identifiedRef.current.includes(p.adm2_pcode) : false;
          const isIgboArea = isSE || isIdentified;

          setHover({
            x: e.point.x,
            y: e.point.y,
            name: p.name || 'Settlement',
            typeBadge: p.place ? `${p.place}`.toUpperCase() : 'SETTLEMENT',
            state: p.adm1_name ? `${p.adm1_name} State` : undefined,
            lga: p.adm2_name ? `${p.adm2_name} LGA` : undefined,
            zone: zoneOf(p.adm1_pcode, p.adm2_pcode),
            colorLabel: isIgboArea ? 'Emerald: Igbo Area Settlement' : 'Red: Regional Reference Settlement',
            colorBg: isIgboArea ? 'bg-emerald-500/15' : 'bg-red-500/15',
            colorBorder: isIgboArea ? 'border-emerald-500/40' : 'border-red-500/40',
            colorText: isIgboArea ? 'text-emerald-300' : 'text-red-300',
          });
          return;
        }

        if (!stateCode) {
          setHover(null);
          return;
        }

        const lgaCode = lga?.properties?.admin2Pcod as string | undefined;
        setHover({
          x: e.point.x,
          y: e.point.y,
          state: (state?.properties?.admin1Name ?? lga?.properties?.admin1Name) as string,
          lga: lga?.properties?.admin2Name as string | undefined,
          zone: zoneOf(stateCode, lgaCode),
        });
      });

      mapInstance.on('mouseout', () => {
        setHover(null);
        if (mapInstance.getLayer('states-hover')) {
          mapInstance.setFilter('states-hover', ['==', ['get', 'admin1Pcod'], '']);
        }
      });

      mapInstance.on('click', (e) => {
        if (isPinningKindredRef.current) {
          setIsPinningKindred(false);
          isPinningKindredRef.current = false;
          setPendingKindredCoords({ lon: e.lngLat.lng, lat: e.lngLat.lat });
          setShowKindredModal(true);
          return;
        }

        if (isAddActive()) {
          if (onOpenAddModalRef.current) {
            onOpenAddModalRef.current({ lon: e.lngLat.lng, lat: e.lngLat.lat });
          } else {
            setPendingCoords({ lon: e.lngLat.lng, lat: e.lngLat.lat });
          }
          return;
        }

        const layers = [
          'communities-points',
          'kindred-landmarks-points',
          'landmarks-points',
          'settlements-points',
          'migration-lines',
          'migration-hubs',
          'lgas-fill',
          'states-fill',
        ].filter((l) => mapInstance.getLayer(l) && mapInstance.getLayoutProperty(l, 'visibility') !== 'none');
        const feats = mapInstance.queryRenderedFeatures(e.point, { layers });
        const community = feats.find((f) => f.layer.id === 'communities-points');
        const kindred = feats.find((f) => f.layer.id === 'kindred-landmarks-points');
        const landmark = feats.find((f) => f.layer.id === 'landmarks-points');
        const settlement = feats.find((f) => f.layer.id === 'settlements-points');
        const migrationFeature = feats.find((f) => f.layer.id === 'migration-lines' || f.layer.id === 'migration-hubs');
        const lga = feats.find((f) => f.layer.id === 'lgas-fill');
        const state = feats.find((f) => f.layer.id === 'states-fill');

        if (kindred) {
          const p = kindred.properties as any;
          const coords = (kindred.geometry as any)?.coordinates as [number, number] | undefined;
          if (coords) highlightPoint(coords, '#06b6d4');
          const nearestRiver = coords ? calculateNearestWaterway(coords[0], coords[1]) : undefined;
          onSelectRef.current({
            type: 'landmark',
            name: p.name,
            parentName: [p.communityName, p.umunnaName && `Kindred (${p.umunnaName})`].filter(Boolean).join(' • '),
            coordinates: coords,
            placeType: `Kindred Landmark (${(p.category || 'heritage').replace('_', ' ')})`,
            markerColor: '#06b6d4',
            colorLabel: 'Cyan: Kindred (Ụmụnna) Landmark',
            colorExplanation: p.description || 'Community-mapped ancestral village square, kindred hall, or sacred grove.',
            whyMarked: `Documented by native contributors. Category: ${p.category}. Custodian lineage: ${p.umunnaName || 'Communal'}.`,
            nearestRiver,
          });
          return;
        }

        if (community) {
          const p = community.properties as any;
          const lifecycle = p.lifecycleStatus || p.lifecycle_status || 'ACTIVE';
          const isDelisted = lifecycle === 'DELISTED';
          const isContestedDelist = lifecycle === 'CONTESTED_DELIST';
          const isContestedReinstate = lifecycle === 'CONTESTED_REINSTATE';
          const isChallenged = p.verification_status === 'challenged';
          const isPending = p.verification_status === 'pending';

          let markerColor = '#10b981';
          let colorLabel = 'Verified Community';
          let colorExplanation = 'Marked in emerald green matching the Southeast baseline because it is a verified Igbo community.';

          if (isDelisted) {
            markerColor = '#64748b';
            colorLabel = 'Delisted Settlement (Dormant)';
            colorExplanation = 'This settlement was declassified following a community quorum decision. Native residents or descendants may submit an ancestral reinstatement petition.';
          } else if (isContestedDelist) {
            markerColor = '#f59e0b';
            colorLabel = 'Delisting Quorum Inquiry Active';
            colorExplanation = 'Under active 7-day community deliberation. The community is voting on whether to declassify or retain this settlement.';
          } else if (isContestedReinstate) {
            markerColor = '#06b6d4';
            colorLabel = 'Reinstatement Quorum Active';
            colorExplanation = 'An indigenous resident has petitioned to restore this community to the active Igbo atlas. The community is currently voting on restoration.';
          } else if (isChallenged) {
            markerColor = '#ef4444';
            colorLabel = 'Challenged Submission';
            colorExplanation = 'Marked in red because this community record has active disputes awaiting review.';
          } else if (isPending) {
            markerColor = '#f59e0b';
            colorLabel = 'Pending Community';
            colorExplanation = 'Marked in amber because this submission is awaiting peer confirmations and moderator review.';
          }

          const coords = (community.geometry as any)?.coordinates as [number, number] | undefined;
          if (coords) highlightPoint(coords, markerColor);

          const nearestRiver = coords ? calculateNearestWaterway(coords[0], coords[1]) : undefined;
          const dialectCluster = getDialectForLocation(p.state_name, p.lga_name);

          onSelectRef.current({
            type: 'community',
            name: p.name,
            code: p.id,
            coordinates: coords,
            parentName: [p.lga_name && `${p.lga_name} LGA`, p.state_name && `${p.state_name} State`].filter(Boolean).join(', '),
            identityStatus: p.identity_status,
            verificationStatus: p.verification_status,
            lifecycleStatus: lifecycle,
            confirmationsCount: p.confirmations_count,
            markerColor,
            colorLabel,
            colorExplanation,
            whyMarked: 'Documented participatory community record submitted to substantiate cultural geography.',
            nearestRiver,
            dialectCluster,
          });
          return;
        }

        if (migrationFeature) {
          const p = migrationFeature.properties as any;
          onSelectRef.current({
            type: 'migration',
            name: p.name || 'Ancestral Diaspora Arc',
            placeType: 'Historical Migration Route',
            markerColor: p.color || '#f59e0b',
            colorLabel: 'Ancestral Migration Arc',
            colorExplanation: p.description || 'Pre-colonial trade, spiritual, and settlement diaspora route.',
            whyMarked: `Historical diaspora connection (${p.era || 'Pre-colonial'}). Connected hubs: ${p.originName || 'Origin'} → ${p.destinationName || 'Destination'}.`,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            historicalNotes: p.description,
          });
          return;
        }

        if (landmark) {
          const p = landmark.properties as any;
          const parent = [p.adm2_name && `${p.adm2_name} LGA`, p.adm1_name && `${p.adm1_name} State`].filter(Boolean).join(', ');
          const zone = zoneOf(p.adm1_pcode, p.adm2_pcode);
          const isMarket = /market|eke|orie|afor|nkwo/i.test(p.name || '') || p.amenity === 'marketplace';
          const coords = (landmark.geometry as any)?.coordinates as [number, number] | undefined;
          if (coords) highlightPoint(coords, '#f59e0b');

          const nearestRiver = coords ? calculateNearestWaterway(coords[0], coords[1]) : undefined;
          const dialectCluster = getDialectForLocation(p.adm1_name, p.adm2_name);

          onSelectRef.current({
            type: 'landmark',
            name: p.name || 'Traditional Market / Landmark',
            parentName: parent,
            code: p.osm_id || p.id,
            coordinates: coords,
            zone,
            placeType: isMarket ? 'Traditional Market' : 'Civic Landmark',
            markerColor: '#f59e0b',
            colorLabel: 'Golden Amber (Cultural Landmark)',
            colorExplanation: 'Marked in golden amber to highlight documented traditional markets (e.g. Eke, Orie, Afor, Nkwo four-day market cycle) and civic landmarks.',
            whyMarked: 'Documented cultural and civic landmark from OpenStreetMap / HOTOSM.',
            nearestRiver,
            dialectCluster,
          });
          return;
        }

        if (settlement) {
          const p = settlement.properties as any;
          const isSE = p.adm1_pcode ? SE_STATE_CODES.includes(p.adm1_pcode) : false;
          const isIdentified = p.adm2_pcode ? identifiedRef.current.includes(p.adm2_pcode) : false;
          const isIgboArea = isSE || isIdentified;
          const parent = [p.adm2_name && `${p.adm2_name} LGA`, p.adm1_name && `${p.adm1_name} State`].filter(Boolean).join(', ');
          const markerColor = isIgboArea ? '#10b981' : '#ef4444';
          const coords = (settlement.geometry as any)?.coordinates as [number, number] | undefined;
          if (coords) highlightPoint(coords, markerColor);

          const nearestRiver = coords ? calculateNearestWaterway(coords[0], coords[1]) : undefined;
          const dialectCluster = isIgboArea ? getDialectForLocation(p.adm1_name, p.adm2_name) : undefined;

          onSelectRef.current({
            type: 'settlement',
            name: p.name,
            parentName: parent,
            code: p.id || p.osm_id,
            coordinates: coords,
            zone: isSE ? 'southeast' : isIdentified ? 'identified' : 'reference',
            placeType: p.place ? `${p.place.charAt(0).toUpperCase()}${p.place.slice(1)}` : 'Settlement',
            markerColor,
            colorLabel: isIgboArea ? 'Emerald Green (Igbo Area)' : 'Crimson Red (Regional Reference)',
            colorExplanation: isIgboArea
              ? 'Marked in emerald green matching the Southeast baseline because it is located in an established Igbo homeland state or identified Igbo LGA.'
              : 'Marked in contrasting red to distinguish non-Igbo regional settlements in surrounding target states as geographic reference points.',
            whyMarked: isIgboArea
              ? `Physical settlement footprint catalogued by GRID3 Nigeria / HOTOSM in an established Igbo area.`
              : `Geographic reference point outside Igbo-identified areas catalogued by GRID3 Nigeria / HOTOSM to show boundary context. Not an Igbo settlement.`,
            nearestRiver,
            dialectCluster,
          });
          return;
        }

        if (lga) {
          const code = lga.properties?.admin2Pcod;
          const stateCode = lga.properties?.admin1Pcod;
          highlightPoint(null);
          highlightLga(code);
          highlightState(stateCode);

          const isSE = stateCode ? SE_STATE_CODES.includes(stateCode) : false;
          const isIdentifiedLga = code ? identifiedRef.current.includes(code) : false;
          const isIgboLga = isSE || isIdentifiedLga;

          const nearestRiver = calculateNearestWaterway(e.lngLat.lng, e.lngLat.lat);
          const dialectCluster = isIgboLga ? getDialectForLocation(lga.properties?.admin1Name, lga.properties?.admin2Name) : undefined;

          onSelectRef.current({
            type: 'lga',
            name: lga.properties?.admin2Name,
            code,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            parentName: lga.properties?.admin1Name ? `${lga.properties.admin1Name} State` : undefined,
            zone: zoneOf(stateCode, code),
            nearestRiver,
            dialectCluster,
          });
          return;
        }

        if (state) {
          const code = state.properties?.admin1Pcod;
          highlightPoint(null);
          highlightLga(null);
          highlightState(code);

          const isSEState = code ? SE_STATE_CODES.includes(code) : false;
          const nearestRiver = calculateNearestWaterway(e.lngLat.lng, e.lngLat.lat);
          const dialectCluster = isSEState ? getDialectForLocation(state.properties?.admin1Name) : undefined;

          onSelectRef.current({
            type: 'state',
            name: state.properties?.admin1Name,
            code,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            zone: zoneOf(code),
            nearestRiver,
            dialectCluster,
          });
          return;
        }

        highlightPoint(null);
        highlightLga(null);
        highlightState(null);
        onSelectRef.current(null);
      });

      setLoaded(true);
    });

    map.current = mapInstance;

    const resizeObserver = new ResizeObserver(() => {
      mapInstance.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      stopBlinking();
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  const isAddModeRef = useRef(isAddMode);
  isAddModeRef.current = isAddMode;
  function isAddActive() {
    return isAddModeRef.current;
  }

  // Basemap switcher effect
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (map.current.getLayer('satellite-layer')) {
      map.current.setLayoutProperty('satellite-layer', 'visibility', basemapMode === 'satellite' ? 'visible' : 'none');
    }
    if (map.current.getLayer('topo-layer')) {
      map.current.setLayoutProperty('topo-layer', 'visibility', basemapMode === 'topo' ? 'visible' : 'none');
    }
    if (map.current.getLayer('light-layer')) {
      map.current.setLayoutProperty('light-layer', 'visibility', basemapMode === 'light' ? 'visible' : 'none');
    }
    if (map.current.getLayer('background')) {
      map.current.setPaintProperty(
        'background',
        'background-color',
        basemapMode === 'light' ? '#f8fafc' : '#060911'
      );
    }
  }, [basemapMode, loaded]);

  // Historical overlay effect
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (map.current.getLayer('historical-layer')) {
      map.current.setLayoutProperty('historical-layer', 'visibility', showHistoricalOverlay ? 'visible' : 'none');
      map.current.setPaintProperty('historical-layer', 'raster-opacity', historicalOpacity);
    }
  }, [showHistoricalOverlay, historicalOpacity, loaded]);

  // Settlement Density heatmap & 3D Extrusions effect
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (map.current.getLayer('density-heat')) {
      map.current.setLayoutProperty('density-heat', 'visibility', showDensity ? 'visible' : 'none');
    }
    if (map.current.getLayer('lgas-3d-extrusion')) {
      const show3DVolume = showDensity && is3D;
      map.current.setLayoutProperty('lgas-3d-extrusion', 'visibility', show3DVolume ? 'visible' : 'none');
    }
  }, [showDensity, is3D, loaded]);

  // 3D Terrain DEM Mesh & Atmosphere Synchronization
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (is3D) {
      if (map.current.getSource('terrain-dem')) {
        map.current.setTerrain({ source: 'terrain-dem', exaggeration: 1.6 });
      }
      if (typeof map.current.setSky === 'function') {
        map.current.setSky({
          'sky-color': basemapMode === 'light' ? '#38bdf8' : '#030712',
          'horizon-color': basemapMode === 'light' ? '#bae6fd' : '#0d1527',
          'fog-color': basemapMode === 'light' ? '#e0f2fe' : '#090e1c',
          'fog-ground-blend': 0.75,
          'atmosphere-blend': 0.8,
        });
      }
    } else {
      map.current.setTerrain(null);
    }
  }, [is3D, basemapMode, loaded]);

  // Dialect continuum visibility effect
  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showDialects ? 'visible' : 'none';
    ['dialect-fill', 'dialect-outline', 'dialect-labels'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showDialects, loaded]);

  // Active Dialect Cluster highlighting effect
  useEffect(() => {
    if (!loaded || !map.current) return;

    if (!activeDialectCluster) {
      if (map.current.getLayer('dialect-fill')) {
        map.current.setPaintProperty('dialect-fill', 'fill-opacity', 0.12);
      }
      if (map.current.getLayer('dialect-outline')) {
        map.current.setPaintProperty('dialect-outline', 'line-width', 1.6);
      }
      return;
    }

    if (map.current.getLayer('dialect-fill')) {
      map.current.setPaintProperty('dialect-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'id'], activeDialectCluster], 0.38,
        0.05,
      ]);
    }
    if (map.current.getLayer('dialect-outline')) {
      map.current.setPaintProperty('dialect-outline', 'line-width', [
        'case',
        ['==', ['get', 'id'], activeDialectCluster], 3.2,
        1.2,
      ]);
    }
  }, [activeDialectCluster, loaded]);

  // Migration arcs visibility effect
  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showMigrationArcs ? 'visible' : 'none';
    ['migration-glow', 'migration-lines', 'migration-hubs', 'migration-labels'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showMigrationArcs, loaded]);

  // Dot opacity filtering effect
  useEffect(() => {
    if (!loaded || !map.current) return;

    if (activeFilter === 'all') {
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', 0.9);
      }
      if (map.current.getLayer('communities-points')) {
        map.current.setPaintProperty('communities-points', 'circle-opacity', 1.0);
      }
      return;
    }

    if (activeFilter === 'verified') {
      if (map.current.getLayer('communities-points')) {
        map.current.setPaintProperty('communities-points', 'circle-opacity', [
          'case',
          ['==', ['get', 'verification_status'], 'verified'], 1.0,
          0.15
        ]);
      }
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', 0.1);
      }
    } else if (activeFilter === 'pending') {
      if (map.current.getLayer('communities-points')) {
        map.current.setPaintProperty('communities-points', 'circle-opacity', [
          'case',
          ['==', ['get', 'verification_status'], 'pending'], 1.0,
          0.15
        ]);
      }
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', 0.1);
      }
    } else if (activeFilter === 'homeland') {
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', [
          'case',
          ['in', ['get', 'adm1_pcode'], ['literal', SE_STATE_CODES]], 0.95,
          ['in', ['get', 'adm2_pcode'], ['literal', identifiedRef.current]], 0.95,
          0.1
        ]);
      }
    } else if (activeFilter === 'reference') {
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', [
          'case',
          ['in', ['get', 'adm1_pcode'], ['literal', SE_STATE_CODES]], 0.1,
          ['in', ['get', 'adm2_pcode'], ['literal', identifiedRef.current]], 0.1,
          0.95
        ]);
      }
    } else if (activeFilter === 'dormant') {
      if (map.current.getLayer('communities-points')) {
        map.current.setPaintProperty('communities-points', 'circle-opacity', [
          'case',
          ['==', ['get', 'lifecycleStatus'], 'DELISTED'], 1.0,
          0.1
        ]);
      }
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', 0.1);
      }
    } else if (activeFilter === 'contested') {
      if (map.current.getLayer('communities-points')) {
        map.current.setPaintProperty('communities-points', 'circle-opacity', [
          'case',
          ['any', ['==', ['get', 'lifecycleStatus'], 'CONTESTED_DELIST'], ['==', ['get', 'lifecycleStatus'], 'CONTESTED_REINSTATE']], 1.0,
          0.1
        ]);
      }
      if (map.current.getLayer('settlements-points')) {
        map.current.setPaintProperty('settlements-points', 'circle-opacity', 0.1);
      }
    }
  }, [activeFilter, loaded]);

  // Layer visibility
  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showStates ? 'visible' : 'none';
    ['states-fill', 'states-outline', 'states-hover'].forEach((l) => map.current!.getLayer(l) && map.current!.setLayoutProperty(l, 'visibility', v));
  }, [showStates, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showLgas ? 'visible' : 'none';
    ['lgas-fill', 'lgas-outline'].forEach((l) => map.current!.getLayer(l) && map.current!.setLayoutProperty(l, 'visibility', v));
  }, [showLgas, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showCommunities ? 'visible' : 'none';
    ['communities-glow', 'communities-points', 'communities-labels'].forEach((l) => map.current!.getLayer(l) && map.current!.setLayoutProperty(l, 'visibility', v));
  }, [showCommunities, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    if (showWaterways && !waterwaysLoadedRef.current) {
      waterwaysLoadedRef.current = true;
      const src = map.current.getSource('waterways-source') as maplibregl.GeoJSONSource | undefined;
      src?.setData('/data/igbo_waterways.geojson');
    }
    const v = showWaterways ? 'visible' : 'none';
    ['waterways-glow', 'waterways-lines'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showWaterways, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showLandmarks ? 'visible' : 'none';
    ['landmarks-points', 'landmarks-labels'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showLandmarks, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showDialects ? 'visible' : 'none';
    ['dialect-fill', 'dialect-outline', 'dialect-labels'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showDialects, loaded]);

  useEffect(() => {
    if (!loaded || !map.current) return;
    const v = showMigrationArcs ? 'visible' : 'none';
    ['migration-glow', 'migration-lines', 'migration-hubs', 'migration-labels'].forEach((l) => {
      if (map.current!.getLayer(l)) map.current!.setLayoutProperty(l, 'visibility', v);
    });
  }, [showMigrationArcs, loaded]);

  // Re-shade LGAs when the identified set changes (e.g. a new community is documented)
  useEffect(() => {
    if (!loaded || !map.current) return;
    const inSE = ['in', ['get', 'admin1Pcod'], ['literal', SE_STATE_CODES]];
    const inIdentified = ['in', ['get', 'admin2Pcod'], ['literal', identifiedLgas]];
    map.current.setPaintProperty('lgas-fill', 'fill-color', ['case', inSE, 'rgba(0,0,0,0)', inIdentified, '#059669', 'rgba(0,0,0,0)']);
    map.current.setPaintProperty('lgas-outline', 'line-color', [
      'case', inSE, 'rgba(6, 78, 59, 0.9)', inIdentified, 'rgba(6, 78, 59, 0.9)', '#26324a',
    ]);
  }, [identifiedLgas, loaded]);

  const zoneStyles: Record<HoverInfo['zone'], { label: string; cls: string }> = {
    southeast: { label: 'Southeast · Igbo homeland', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    identified: { label: 'Identified Igbo LGA', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    reference: { label: 'Reference geography', cls: 'bg-white/5 text-slate-400 border-white/10' },
  };

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden bg-[#060911]">
      {/* Placement mode banner */}
      {isAddMode && (
        <div className={`absolute ${isFiltersCollapsed ? 'top-3' : 'top-[82px] sm:top-[86px]'} left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-amber-400/50 text-amber-200 text-[11px] font-medium shadow-2xl flex items-center gap-2 whitespace-nowrap transition-all duration-200`}>
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          Tap the map where the community is located
          <button type="button" onClick={() => setIsAddMode(false)} className="ml-1 text-amber-300/80 hover:text-white underline underline-offset-2">
            Cancel
          </button>
        </div>
      )}

      {/* Modern Basemap Style Toggle & 3D Tilt HUD (Desktop: Collapsible for clean map focus) */}
      <div className={`absolute ${isFiltersCollapsed ? 'top-2.5 sm:top-3' : 'top-[82px] sm:top-[86px]'} right-3 sm:right-4 z-20 hidden sm:flex items-center transition-all duration-200`}>
        {isBasemapHudCollapsed ? (
          <button
            type="button"
            onClick={() => setIsBasemapHudCollapsed(false)}
            className="h-9 w-9 rounded-xl bg-[#090e1c]/90 hover:bg-[#0f172a] border border-white/15 text-slate-200 hover:text-white shadow-2xl backdrop-blur-xl transition-all active:scale-95 hover:border-emerald-500/40 flex items-center justify-center relative group"
            title="Expand Map Style, Density & 3D Controls"
            aria-label="Expand Map Style Controls"
          >
            <Layers className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
            {(is3D || showDensity) && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        ) : (
          <div className="flex items-center p-0.5 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/10 shadow-2xl gap-0.5 animate-in fade-in slide-in-from-right-2 duration-200">
            <button
              type="button"
              onClick={() => onBasemapChange?.('dark')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                basemapMode === 'dark'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dark midnight glassmorphic cartography"
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => onBasemapChange?.('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                basemapMode === 'satellite'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="High-resolution satellite imagery"
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => onBasemapChange?.('topo')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                basemapMode === 'topo'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Topographic physical relief (Udi Hills, Nsukka plateau)"
            >
              Topographic
            </button>
            <button
              type="button"
              onClick={() => onBasemapChange?.('light')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                basemapMode === 'light'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Clean academic cartography"
            >
              Light
            </button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={() => onToggleDensity?.(!showDensity)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 ${
                showDensity
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Derived Spatial Presence Heatmap"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showDensity ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>Density Map</span>
            </button>

            <button
              type="button"
              onClick={toggle3D}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 ${
                is3D
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 3D Elevation Terrain, Physical Relief & Atmospheric Sky"
            >
              <Mountain className={`w-3 h-3 ${is3D ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>3D Terrain</span>
              <span className={`w-1.5 h-1.5 rounded-full ${is3D ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
            </button>

            {is3D && (
              <>
                {/* 3D Tilt Angle Switcher */}
                <button
                  type="button"
                  onClick={() => {
                    const nextPitch = pitchPreset === 56 ? 74 : 56;
                    setPitchPreset(nextPitch);
                    map.current?.easeTo({ pitch: nextPitch, duration: 700 });
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-medium text-amber-200/90 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all"
                  title="Switch between 56° Oblique angle and 74° Deep Horizon view"
                >
                  <span>{pitchPreset}°</span>
                </button>

                {/* 360° Cinematic Orbit */}
                <button
                  type="button"
                  onClick={toggleOrbit}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all flex items-center gap-1 ${
                    isOrbiting
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 animate-pulse shadow-sm'
                      : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                  }`}
                  title={isOrbiting ? 'Stop 360° Drone Orbit' : 'Start 360° Drone Cinematic Orbit'}
                >
                  {isOrbiting ? <Pause className="w-2.5 h-2.5 text-emerald-400" /> : <Play className="w-2.5 h-2.5 text-amber-400" />}
                  <span>{isOrbiting ? 'Orbiting' : 'Orbit'}</span>
                </button>
              </>
            )}

            {/* 3D Cinematic Fly-Through Trigger */}
            <button
              type="button"
              onClick={() => {
                if (activeFlightCorridor) {
                  stopCinematicFlyThrough();
                } else {
                  startCinematicFlyThrough('nri-hegemony');
                }
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all flex items-center gap-1 ${
                activeFlightCorridor
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-sm animate-pulse'
                  : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
              }`}
              title="3D Cinematic Fly-Through along ancestral migration arcs and waterways"
            >
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span>{activeFlightCorridor ? 'Exit Flight' : 'Fly 3D'}</span>
            </button>

            {/* Pin Kindred Landmark Trigger */}
            <button
              type="button"
              onClick={() => {
                const next = !isPinningKindred;
                setIsPinningKindred(next);
                isPinningKindredRef.current = next;
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all flex items-center gap-1 ${
                isPinningKindred
                  ? 'bg-teal-500/30 text-teal-300 border border-teal-500/50 shadow-sm ring-1 ring-teal-400'
                  : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
              }`}
              title="Click map to micro-map an ancestral village square, kindred hall, or sacred grove"
            >
              <LandmarkIcon className="w-3 h-3 text-teal-400" />
              <span>Pin Kindred</span>
            </button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Collapse HUD Button */}
            <button
              type="button"
              onClick={() => setIsBasemapHudCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Collapse into compact icon (clean map view)"
              aria-label="Collapse map style bar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Spatial Presence Heatmap Legend & Disclaimer Card */}
      {showDensity && (
        <div className={`absolute ${isFiltersCollapsed ? 'top-14 sm:top-16' : 'top-[82px] sm:top-[86px]'} left-3 sm:left-4 z-20 max-w-[280px] sm:max-w-xs rounded-2xl bg-[#090e1c]/90 backdrop-blur-xl border border-amber-500/30 p-3.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-white font-display uppercase tracking-wider">
                Derived Spatial Presence
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleDensity?.(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-md"
              title="Close density overlay"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gradient Spectrum Bar */}
          <div className="space-y-1 mb-2.5">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-950 via-emerald-500 via-amber-400 to-amber-500 shadow-inner" />
            <div className="flex justify-between text-[9px] font-mono font-medium text-slate-400">
              <span>Dispersed Settlements</span>
              <span>Dense Settlement Cluster</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed font-sans border-t border-white/10 pt-2">
            Calculated dynamically from verified settlement points, community confirmations, and confidence scores.
            <span className="block text-slate-400 font-medium mt-1 italic">
              Note: Low density represents fewer documented records, never absence of people.
            </span>
          </p>
        </div>
      )}

      {/* Floating Action Controls Stack on Map */}
      <div className={`absolute ${isFiltersCollapsed ? 'top-14 sm:top-14' : 'top-[82px] sm:top-[128px]'} right-3 sm:right-4 z-20 flex flex-col gap-2 items-center transition-all duration-200`}>
        {/* Mobile & Desktop 3D Fly-Through Floating Button */}
        <button
          type="button"
          onClick={() => {
            if (activeFlightCorridor) {
              stopCinematicFlyThrough();
            } else {
              startCinematicFlyThrough('nri-hegemony');
            }
          }}
          className={`h-9 w-9 rounded-xl backdrop-blur-xl border flex items-center justify-center shadow-xl active:scale-95 transition-all ${
            activeFlightCorridor
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/40 animate-pulse'
              : 'bg-[#090e1c]/90 border-white/15 text-slate-300 hover:text-white hover:border-cyan-500/40 hover:bg-[#0f172a]'
          }`}
          title={activeFlightCorridor ? 'Exit 3D Fly-Through' : '3D Cinematic Fly-Through'}
          aria-label="3D Cinematic Fly-Through"
        >
          <Navigation className={`w-4 h-4 ${activeFlightCorridor ? 'text-cyan-300' : 'text-cyan-400'}`} />
        </button>

        {/* Mobile Basemap, Density & 3D Drawer Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowMobileLayersModal(true)}
          className="sm:hidden h-9 w-9 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/15 text-slate-300 hover:text-white flex items-center justify-center shadow-xl active:scale-95 transition-all relative"
          title="Change Basemap & Perspective"
          aria-label="Change Basemap"
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          {(is3D || showDensity) && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() => {
            if (map.current) map.current.zoomIn({ duration: 300 });
          }}
          className="h-9 w-9 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/15 text-slate-300 hover:text-white flex items-center justify-center shadow-xl active:scale-90 transition-all hover:border-emerald-500/40 hover:bg-[#0f172a]"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() => {
            if (map.current) map.current.zoomOut({ duration: 300 });
          }}
          className="h-9 w-9 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/15 text-slate-300 hover:text-white flex items-center justify-center shadow-xl active:scale-90 transition-all hover:border-emerald-500/40 hover:bg-[#0f172a]"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4 text-emerald-400" />
        </button>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleLocateUser}
          className={`h-9 w-9 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/15 flex items-center justify-center shadow-xl active:scale-95 transition-all ${
            isLocating ? 'text-amber-400 ring-2 ring-amber-400/40' : 'text-slate-300 hover:text-white'
          }`}
          title="Center on my current GPS location"
          aria-label="Locate me"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <Crosshair className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        {/* Recenter Map Button */}
        <button
          type="button"
          onClick={() => {
            if (map.current) {
              map.current.easeTo({ center: [7.25, 5.85], zoom: 6.8, pitch: is3D ? 52 : 0, bearing: is3D ? -15 : 0, duration: 800 });
            }
          }}
          className="h-9 w-9 rounded-xl bg-[#090e1c]/90 backdrop-blur-xl border border-white/15 text-slate-300 hover:text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          title="Recenter Map View"
          aria-label="Recenter Map View"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Mobile Basemap, Density & 3D Drawer Modal */}
      {showMobileLayersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden flex flex-col justify-end p-3 animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0a101f] border border-white/15 p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white font-display">Map Style & View Controls</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileLayersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'dark' as BasemapMode, label: 'Dark Midnight', desc: 'Glassmorphic' },
                { id: 'satellite' as BasemapMode, label: 'Satellite', desc: 'High-res imagery' },
                { id: 'topo' as BasemapMode, label: 'Topographic', desc: 'Physical relief' },
                { id: 'light' as BasemapMode, label: 'Light', desc: 'Academic cartography' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onBasemapChange?.(b.id);
                    setShowMobileLayersModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    basemapMode === b.id
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="block text-xs font-bold text-white">{b.label}</span>
                  <span className="block text-[10px] text-slate-400">{b.desc}</span>
                </button>
              ))}
            </div>

            {/* Density Presence Heatmap Toggle for Mobile */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-white">Density Presence Map</span>
                <span className="block text-[10px] text-slate-400">Multi-spectral spatial heatmap</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleDensity?.(!showDensity)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  showDensity
                    ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                    : 'bg-white/[0.06] border border-white/10 text-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showDensity ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{showDensity ? 'Density Active' : 'Enable Density'}</span>
              </button>
            </div>

            {/* 3D Perspective & Terrain for Mobile */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-white flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-amber-400" />
                  3D Elevation Terrain
                </span>
                <span className="block text-[10px] text-slate-400">
                  {is3D ? `Active (${pitchPreset}° angle + DEM relief)` : 'Physical hills, ridges & valleys'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {is3D && (
                  <button
                    type="button"
                    onClick={toggleOrbit}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-mono font-medium transition-all flex items-center gap-1 ${
                      isOrbiting
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 animate-pulse'
                        : 'bg-white/[0.06] border border-white/10 text-slate-300'
                    }`}
                  >
                    {isOrbiting ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    <span>Orbit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggle3D}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    is3D
                      ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                      : 'bg-white/[0.06] border border-white/10 text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${is3D ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{is3D ? '3D Active' : 'Enable 3D'}</span>
                </button>
              </div>
            </div>

            {/* 3D Cinematic Fly-Through for Mobile */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  3D Cinematic Fly-Through
                </span>
                <span className="block text-[10px] text-slate-400">
                  {activeFlightCorridor ? `Active: ${activeFlightCorridor.name}` : 'Fly over ancestral highways & waterways'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMobileLayersModal(false);
                  if (activeFlightCorridor) {
                    stopCinematicFlyThrough();
                  } else {
                    startCinematicFlyThrough('nri-hegemony');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFlightCorridor
                    ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-300'
                    : 'bg-white/[0.06] border border-white/10 text-slate-300'
                }`}
              >
                <span>{activeFlightCorridor ? 'Stop Flight' : 'Fly 3D'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip (pointer devices) */}
      {hover && !isAddMode && (
        <div
          className="pointer-events-none absolute z-20 hidden sm:block"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="rounded-xl bg-slate-950/95 border border-white/10 shadow-2xl px-3 py-2.5 min-w-[180px] max-w-[280px]">
            {hover.typeBadge && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                  {hover.typeBadge}
                </span>
              </div>
            )}
            <p className="text-[13px] font-bold text-white font-display leading-tight">
              {hover.name || hover.state || 'Location'}
            </p>
            {(hover.name ? (hover.lga || hover.state) : hover.lga) && (
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                {[hover.lga, hover.state].filter(Boolean).join(', ')}
              </p>
            )}
            {hover.colorLabel ? (
              <span className={`inline-block mt-2 text-[9px] uppercase tracking-wider font-mono font-semibold px-1.5 py-0.5 rounded border ${hover.colorBg} ${hover.colorBorder} ${hover.colorText}`}>
                {hover.colorLabel}
              </span>
            ) : (
              <span className={`inline-block mt-1.5 text-[9px] uppercase tracking-wider font-mono font-semibold px-1.5 py-0.5 rounded border ${zoneStyles[hover.zone].cls}`}>
                {zoneStyles[hover.zone].label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* GIS Coordinate & Status Bar HUD */}
      {cursorCoords && (
        <div className="hidden sm:flex absolute bottom-3 left-3 z-20 items-center gap-2 px-2.5 py-1 rounded-lg bg-[#080d1a]/85 border border-white/[0.08] backdrop-blur-md text-[10px] font-mono text-slate-400 select-none shadow-lg">
          <span className="text-emerald-400 font-semibold">{cursorCoords.lat}&deg;N, {cursorCoords.lng}&deg;E</span>
          <span className="text-slate-600">&bull;</span>
          <span>Zoom {cursorCoords.zoom}x</span>
        </div>
      )}

      <div
        ref={mapContainer}
        data-addmode={isAddMode ? 'true' : 'false'}
        className={`w-full h-full ${isAddMode ? 'cursor-crosshair' : ''}`}
      />

      {/* Atmospheric Peripheral Map Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(6,9,17,0.75)_100%)] z-10" />

      {/* Active Kindred Landmark Pinning Banner */}
      {isPinningKindred && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#0a0f1d]/95 border border-teal-500/50 rounded-2xl shadow-2xl px-4 py-2 backdrop-blur-xl flex items-center gap-3 animate-pulse">
          <LandmarkIcon className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-xs text-white font-medium">
            Click anywhere on the map to place an Ụmụnna square (Obi/Ilo), kindred hall, or sacred grove
          </span>
          <button
            onClick={() => {
              setIsPinningKindred(false);
              isPinningKindredRef.current = false;
            }}
            className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded-lg bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3D Cinematic Fly-Through Cockpit HUD Overlay */}
      {activeFlightCorridor && (
        <CinematicFlyThroughHUD
          activeCorridor={activeFlightCorridor}
          currentWaypointIndex={flightWaypointIndex}
          totalWaypoints={activeFlightCorridor.waypoints.length}
          isPlaying={isFlightPlaying}
          bearing={flightBearing}
          pitch={flightPitch}
          speed={flightSpeed}
          onTogglePlay={togglePlayFlight}
          onNextWaypoint={nextFlightWaypoint}
          onPrevWaypoint={prevFlightWaypoint}
          onChangeSpeed={handleFlightSpeedChange}
          onSelectCorridor={(id) => startCinematicFlyThrough(id)}
          onExit={stopCinematicFlyThrough}
        />
      )}


      {/* Kindred (Ụmụnna) & Village Landmark Micro-Mapping Modal */}
      {showKindredModal && (
        <KindredMicroMappingModal
          isOpen={showKindredModal}
          initialCoords={pendingKindredCoords || undefined}
          initialCommunity={selectedKindredCommunity}
          onClose={() => {
            setShowKindredModal(false);
            setPendingKindredCoords(null);
            setSelectedKindredCommunity(undefined);
          }}
          onLandmarkCreated={() => {
            refreshKindredLandmarks();
          }}
        />
      )}

      {pendingCoords && (
        <AddCommunityModal
          coordinates={pendingCoords}
          initialName={pendingName}
          onClose={() => {
            setPendingCoords(null);
            setPendingName('');
            setIsAddMode(false);
          }}
          onSuccess={() => {
            const src = map.current?.getSource('communities-source') as maplibregl.GeoJSONSource | undefined;
            src?.setData('/api/map/communities.geojson');
            setPendingCoords(null);
            setPendingName('');
            setIsAddMode(false);
            onCommunityAdded?.();
          }}
        />
      )}
    </div>
  );
});

export default MapContainer;
