import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import type {
  Feature as GeoJsonFeature,
  FeatureCollection as GeoJsonFeatureCollection,
  LineString as GeoJsonLineString,
} from "geojson";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import "mapbox-gl/dist/mapbox-gl.css";
import "./map.css";
import type {
  FeatureIdentifier,
  GeoJSONSourceSpecification,
} from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export type SurfaceSummary = {
  total: number;
  breakdown: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
};

type Props = {
  route: number[][];
  records: ActivityRecord[];
  initialLng: number;
  initialLat: number;
  focusedRecordId?: number | null;
  onRecordHover?: (recordId: number | null) => void;
  onSurfaceSummary?: (summary: SurfaceSummary | null) => void;
};

interface ActivityRecord {
  id: number;
  coordinates?: Coordinates;
  distance: number;
  speed: number;
  timeStamp?: number;
  heartRate?: number;
}

const hasCoordinates = (
  record: ActivityRecord,
): record is ActivityRecord & { coordinates: Coordinates } =>
  record.coordinates?.x !== undefined && record.coordinates?.y !== undefined;

export interface Coordinates {
  x: number;
  y: number;
}

const ensureArrowImage = (mapInstance: mapboxgl.Map) => {
  if (mapInstance.hasImage("route-arrow")) {
    return;
  }

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#0f172a";
  context.lineWidth = 6;
  context.lineJoin = "round";
  context.lineCap = "round";

  context.save();
  context.translate(size / 2, size / 2);
  context.rotate(Math.PI / 2);
  context.translate(-size / 2, -size / 2);

  context.beginPath();
  context.moveTo(size / 2, size * 0.12);
  context.lineTo(size * 0.86, size * 0.84);
  context.lineTo(size / 2, size * 0.64);
  context.lineTo(size * 0.14, size * 0.84);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();

  const imageData = context.getImageData(0, 0, size, size);
  mapInstance.addImage("route-arrow", imageData, { pixelRatio: 2 });
};

const buildRouteMarkers = (route: number[][]) => {
  if (!route.length) {
    return [];
  }

  const start = route[0];
  const finish = route[route.length - 1];

  return [
    {
      type: "Feature" as const,
      properties: { markerType: "start" },
      geometry: {
        type: "Point" as const,
        coordinates: start,
      },
    },
    {
      type: "Feature" as const,
      properties: { markerType: "finish" },
      geometry: {
        type: "Point" as const,
        coordinates: finish,
      },
    },
  ];
};

const SURFACE_ALIAS: Record<string, string> = {
  asphalt: "Paved",
  paved: "Paved",
  concrete: "Paved",
  cobblestone: "Paved",
  sett: "Paved",
  paving_stones: "Paved",
  metal: "Paved",
  wood: "Paved",
  unpaved: "Unpaved",
  gravel: "Gravel",
  fine_gravel: "Gravel",
  compacted: "Gravel",
  pebblestone: "Gravel",
  dirt: "Dirt",
  ground: "Dirt",
  earth: "Dirt",
  clay: "Dirt",
  mud: "Trail",
  sand: "Trail",
  grass: "Trail",
  snow: "Trail",
  ice: "Trail",
  path: "Trail",
  track: "Trail",
  rock: "Trail",
};

const CLASS_ALIAS: Record<string, string> = {
  motorway: "Paved",
  trunk: "Paved",
  primary: "Paved",
  secondary: "Paved",
  tertiary: "Paved",
  street: "Paved",
  service: "Paved",
  residential: "Paved",
  path: "Trail",
  footway: "Trail",
  cycleway: "Trail",
  track: "Trail",
  pedestrian: "Trail",
  bridleway: "Trail",
};

export const SURFACE_COLORS: Record<string, string> = {
  Paved: "#0ea5e9",
  Unpaved: "#64748b",
  Gravel: "#f59e0b",
  Dirt: "#92400e",
  Trail: "#16a34a",
  "Unknown surface": "#9ca3af",
};

const normalizeSurfaceLabel = (
  surface?: string | null,
  roadClass?: string | null,
): string => {
  const normalizedSurface = surface ? SURFACE_ALIAS[surface.toLowerCase()] : undefined;
  if (normalizedSurface) {
    return normalizedSurface;
  }

  const normalizedClass = roadClass ? CLASS_ALIAS[roadClass.toLowerCase()] : undefined;
  if (normalizedClass) {
    return normalizedClass;
  }

  return "Unknown surface";
};

export default function LazyMap({
  route,
  records,
  initialLat,
  initialLng,
  focusedRecordId,
  onRecordHover,
  onSurfaceSummary,
}: Props) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(9);
  const [hoveredRecordId, setHoveredRecordId] = useState<number | null>(null);
  const mapReady = useRef(false);
  const lastFocusedId = useRef<number | null>(null);
  const lastHoveredId = useRef<number | null>(null);
  const activeMarker = useRef<mapboxgl.Marker | null>(null);
  const activeMarkerElement = useRef<HTMLDivElement | null>(null);
  const activeMarkerAdded = useRef(false);
  const desiredFocusedIdRef = useRef<number | null>(focusedRecordId ?? null);
  const coordinateLookup = useMemo(() => {
    const lookup = new Map<number, Coordinates>();
    for (const record of records) {
      if (
        record.coordinates?.x !== undefined &&
        record.coordinates?.y !== undefined
      ) {
        lookup.set(record.id, {
          x: record.coordinates.x,
          y: record.coordinates.y,
        });
      }
    }
    return lookup;
  }, [records]);
  desiredFocusedIdRef.current = focusedRecordId ?? null;

  const fitRouteBounds = useCallback(
    (targetRoute: number[][], animate = false) => {
      if (!map.current || !targetRoute.length) {
        return;
      }

      if (targetRoute.length === 1) {
        map.current.setCenter([targetRoute[0][0], targetRoute[0][1]]);
        return;
      }

      const first = targetRoute[0] as [number, number];
      const bounds = targetRoute.reduce(
        (acc, coords) => acc.extend([coords[0], coords[1]] as [number, number]),
        new mapboxgl.LngLatBounds(first, first),
      );

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: animate ? 650 : 0,
        maxZoom: 15,
      });
    },
    [],
  );

  const computeSurfaceSummary = useCallback(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    if (!route.length) {
      onSurfaceSummary?.(null);
      const surfaceSource = map.current.getSource("route-surface") as
        | mapboxgl.GeoJSONSource
        | undefined;
      surfaceSource?.setData({
        type: "FeatureCollection",
        features: [],
      } as GeoJsonFeatureCollection<GeoJsonLineString>);
      return;
    }

    const counts = new Map<string, number>();
    const segments: GeoJsonFeature<GeoJsonLineString>[] = [];
    const queryStep = Math.max(1, Math.floor(route.length / 1200));

    let lastDetectedLabel = "Unknown surface";
    let currentLabel: string | null = null;
    let currentCoords: number[][] = [];

    const pushSegment = (label: string | null, coords: number[][]) => {
      if (!label || coords.length < 2) {
        return;
      }
      segments.push({
        type: "Feature",
        properties: {
          surface: label,
          color: SURFACE_COLORS[label] ?? SURFACE_COLORS["Unknown surface"],
        },
        geometry: {
          type: "LineString",
          coordinates: coords.map(([lngCoord, latCoord]) => [lngCoord, latCoord]),
        },
      });
    };

    for (let index = 0; index < route.length; index += 1) {
      const coord = route[index];
      if (index % queryStep === 0) {
        const projected = map.current.project([coord[0], coord[1]]);
        const features = map.current.queryRenderedFeatures(projected);

        let matched = false;
        for (const feature of features) {
          const layerId = feature.layer?.id ?? "";
          if (!layerId.startsWith("road")) {
            continue;
          }

          const properties = feature.properties ?? {};
          const detected = normalizeSurfaceLabel(
            typeof properties.surface === "string" ? properties.surface : undefined,
            typeof properties.class === "string" ? properties.class : undefined,
          );
          lastDetectedLabel = detected;
          matched = true;
          break;
        }

        if (!matched) {
          lastDetectedLabel = "Unknown surface";
        }
      }

      counts.set(
        lastDetectedLabel,
        (counts.get(lastDetectedLabel) ?? 0) + 1,
      );

      if (currentLabel === null) {
        currentLabel = lastDetectedLabel;
        currentCoords = [[coord[0], coord[1]]];
        continue;
      }

      if (lastDetectedLabel !== currentLabel) {
        currentCoords.push([coord[0], coord[1]]);
        pushSegment(currentLabel, currentCoords);
        currentLabel = lastDetectedLabel;
        currentCoords = [[coord[0], coord[1]]];
      } else {
        currentCoords.push([coord[0], coord[1]]);
      }
    }

    if (currentLabel && currentCoords.length >= 2) {
      pushSegment(currentLabel, currentCoords);
    }

    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    if (!total) {
      onSurfaceSummary?.(null);
      const surfaceSource = map.current.getSource("route-surface") as
        | mapboxgl.GeoJSONSource
        | undefined;
      surfaceSource?.setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    const breakdown = Array.from(counts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: count / total,
      }))
      .sort((a, b) => b.count - a.count);

    const surfaceSource = map.current.getSource("route-surface") as
      | mapboxgl.GeoJSONSource
      | undefined;
    surfaceSource?.setData({
      type: "FeatureCollection",
      features: segments,
    } as GeoJsonFeatureCollection<GeoJsonLineString>);

    onSurfaceSummary?.({
      total,
      breakdown: breakdown.length
        ? breakdown
        : [
            {
              label: "Unknown surface",
              count: total,
              percentage: 1,
            },
          ],
    });
  }, [route, onSurfaceSummary]);

  useEffect(() => {
    void focusedRecordId;
  }, [focusedRecordId]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: route.length
          ? [route[0][0], route[0][1]]
          : [initialLng, initialLat],
        zoom: route.length ? 11 : zoom,
        cooperativeGestures: true,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right",
      );

      map.current.on("move", () => {
        setLng(parseFloat(map.current!.getCenter().lng.toFixed(4)));
        setLat(parseFloat(map.current!.getCenter().lat.toFixed(4)));
        setZoom(parseFloat(map.current!.getZoom().toFixed(2)));
      });

      // Add the route source
      map.current.on("load", () => {
        mapReady.current = true;
        ensureArrowImage(map.current!);
        const geojson: GeoJSONSourceSpecification = {
          type: "geojson",
          lineMetrics: true,
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: route,
            },
          } as GeoJsonFeature<GeoJsonLineString>,
        };

        map.current!.addSource("route", geojson);

        map.current!.addSource(
          "route-surface",
          {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            } as GeoJsonFeatureCollection<GeoJsonLineString>,
          } as GeoJSONSourceSpecification,
        );

        // Add the route base/outline
        map.current!.addLayer({
          id: "route-outline",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0f172a",
            "line-width": 10,
            "line-opacity": 0.45,
          },
        });

        // Add the main route stroke
        map.current!.addLayer({
          id: "route-main",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1f2937",
            "line-width": 5,
            "line-opacity": 0.6,
          },
        });

        map.current!.addLayer({
          id: "route-surface",
          type: "line",
          source: "route-surface",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#38bdf8"],
            "line-width": 6,
            "line-opacity": 0.95,
          },
        });

        map.current!.addLayer({
          id: "route-direction",
          type: "symbol",
          source: "route",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 90,
            "icon-image": "route-arrow",
            "icon-size": 0.38,
            "icon-allow-overlap": true,
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-keep-upright": false,
          },
          paint: {
            "icon-opacity": 0.92,
          },
        });

        map.current!.addSource(
          "route-markers",
          {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: buildRouteMarkers(route),
            } as GeoJsonFeatureCollection,
          } as GeoJSONSourceSpecification,
        );

        map.current!.addLayer({
          id: "route-markers",
          type: "circle",
          source: "route-markers",
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "match",
              ["get", "markerType"],
              "start",
              "#22c55e",
              "finish",
              "#ef4444",
              "#3b82f6",
            ],
            "circle-stroke-color": "#0f172a",
            "circle-stroke-width": 1.5,
          },
        });

        if (!activeMarkerElement.current) {
          activeMarkerElement.current = document.createElement("div");
          activeMarkerElement.current.className =
            "map-active-point map-active-point--hidden";
        }

        if (!activeMarker.current && activeMarkerElement.current) {
          activeMarker.current = new mapboxgl.Marker({
            element: activeMarkerElement.current,
            pitchAlignment: "map",
            rotationAlignment: "map",
            anchor: "center",
          });
        }

        // Add a circle layer for each record
        const points = records
          .filter(hasCoordinates)
          .map((record) => ({
            type: "Feature" as const,
            id: record.id,
            properties: {
              id: record.id,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [record.coordinates!.x, record.coordinates!.y],
            },
          }));

        const pointsSource: GeoJSONSourceSpecification = {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points,
          } as GeoJsonFeatureCollection,
        };

        map.current!.addSource("points", pointsSource);

        map.current!.addLayer({
          id: "points",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": [
              "case",
              ["boolean", ["feature-state", "focus"], false],
              9,
              ["boolean", ["feature-state", "hover"], false],
              7,
              5,
            ],
            "circle-color": [
              "case",
              ["boolean", ["feature-state", "focus"], false],
              "#f97316",
              ["boolean", ["feature-state", "hover"], false],
              "#38bdf8",
              "rgba(0,0,0,0)",
            ],
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "focus"], false],
              2,
              ["boolean", ["feature-state", "hover"], false],
              2,
              0,
            ],
            "circle-stroke-color": [
              "case",
              ["boolean", ["feature-state", "focus"], false],
              "#1e293b",
              ["boolean", ["feature-state", "hover"], false],
              "#0f172a",
              "rgba(0,0,0,0)",
            ],
            "circle-opacity": [
              "case",
              [
                "any",
                ["boolean", ["feature-state", "focus"], false],
                ["boolean", ["feature-state", "hover"], false],
              ],
              1,
              0,
            ],
          },
        });

        // Handle hover events
        map.current!.on(
          "mousemove",
          "points",
          (e: mapboxgl.MapMouseEvent) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const featureId =
                (feature.id as number | undefined) ??
                (feature.properties?.id as number | undefined);
              if (featureId === undefined) {
                return;
              }

              if (lastHoveredId.current === featureId) {
                return;
              }

              if (
                lastHoveredId.current != null &&
                lastHoveredId.current !== featureId
              ) {
                map.current!.setFeatureState(
                  { source: "points", id: lastHoveredId.current } as FeatureIdentifier,
                  { hover: false },
                );
              }

              map.current!.setFeatureState(
                { source: "points", id: featureId } as FeatureIdentifier,
                { hover: true },
              );
              lastHoveredId.current = featureId;
              setHoveredRecordId((prev) => (prev === featureId ? prev : featureId));
              onRecordHover?.(featureId);
            }
          },
        );

        // Change cursor to pointer when hovering over points
        map.current!.on("mouseenter", "points", () => {
          map.current!.getCanvas().style.cursor = "pointer";
        });

        map.current!.on("mouseleave", "points", () => {
          map.current!.getCanvas().style.cursor = "";
          const previousHoverId = lastHoveredId.current;
          if (previousHoverId != null) {
            map.current!.setFeatureState(
              { source: "points", id: previousHoverId } as FeatureIdentifier,
              { hover: false },
            );
            lastHoveredId.current = null;
          }
          setHoveredRecordId((prev) => (prev === null ? prev : null));
          if (previousHoverId != null) {
            onRecordHover?.(null);
          }
        });

        if (route.length) {
          fitRouteBounds(route);
          if (map.current) {
            map.current.once("idle", () => {
              computeSurfaceSummary();
            });
          }
        } else {
          onSurfaceSummary?.(null);
        }
      });
    }
  }, [
    lng,
    lat,
    zoom,
    route,
    records,
    onRecordHover,
    initialLng,
    initialLat,
    fitRouteBounds,
    computeSurfaceSummary,
    onSurfaceSummary,
  ]);

  useEffect(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    const routeSource = map.current.getSource("route") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (routeSource) {
      routeSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route,
        },
      } as GeoJsonFeature<GeoJsonLineString>);
    }

    const pointsSource = map.current.getSource("points") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (pointsSource) {
      pointsSource.setData({
        type: "FeatureCollection",
        features: records
          .filter(hasCoordinates)
          .map((record) => ({
            type: "Feature" as const,
            id: record.id,
            properties: { id: record.id },
            geometry: {
              type: "Point" as const,
              coordinates: [record.coordinates.x, record.coordinates.y],
            },
          })),
      } as GeoJsonFeatureCollection);
    }

    const markersSource = map.current.getSource("route-markers") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (markersSource) {
      markersSource.setData({
        type: "FeatureCollection",
        features: buildRouteMarkers(route),
      } as GeoJsonFeatureCollection);
    }

    if (lastHoveredId.current != null) {
      map.current.setFeatureState(
        { source: "points", id: lastHoveredId.current } as FeatureIdentifier,
        { hover: false },
      );
      lastHoveredId.current = null;
    }
    setHoveredRecordId((prev) => (prev === null ? prev : null));

    if (lastFocusedId.current != null) {
      map.current.setFeatureState(
        { source: "points", id: lastFocusedId.current } as FeatureIdentifier,
        { focus: false },
      );
      lastFocusedId.current = null;
    }

    const targetFocusId = desiredFocusedIdRef.current;
    if (targetFocusId != null && coordinateLookup.has(targetFocusId)) {
      map.current.setFeatureState(
        { source: "points", id: targetFocusId } as FeatureIdentifier,
        { focus: true },
      );
      lastFocusedId.current = targetFocusId;
    }

    if (route.length) {
      fitRouteBounds(route, true);
      if (map.current?.isStyleLoaded()) {
        computeSurfaceSummary();
      } else if (map.current) {
        const handleIdle = () => {
          computeSurfaceSummary();
          map.current?.off("idle", handleIdle);
        };
        map.current.once("idle", handleIdle);
      }
    } else {
      onSurfaceSummary?.(null);
      const surfaceSource = map.current.getSource("route-surface") as
        | mapboxgl.GeoJSONSource
        | undefined;
      surfaceSource?.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [
    route,
    records,
    coordinateLookup,
    fitRouteBounds,
    computeSurfaceSummary,
    onSurfaceSummary,
  ]);

  useEffect(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    const previousFocusedId = lastFocusedId.current;
    const nextFocusedId = focusedRecordId ?? null;

    if (previousFocusedId === nextFocusedId) {
      return;
    }

    if (previousFocusedId != null) {
      map.current.setFeatureState(
        { source: "points", id: previousFocusedId } as FeatureIdentifier,
        { focus: false },
      );
    }

    if (nextFocusedId != null && coordinateLookup.has(nextFocusedId)) {
      map.current.setFeatureState(
        { source: "points", id: nextFocusedId } as FeatureIdentifier,
        { focus: true },
      );
    }

    lastFocusedId.current = nextFocusedId;
  }, [focusedRecordId, coordinateLookup]);

  const highlightedRecordId = hoveredRecordId ?? focusedRecordId ?? null;

  useEffect(() => {
    if (
      !map.current ||
      !mapReady.current ||
      !activeMarker.current ||
      !activeMarkerElement.current
    ) {
      return;
    }

    if (highlightedRecordId == null) {
      if (activeMarkerAdded.current) {
        activeMarker.current.remove();
        activeMarkerAdded.current = false;
      }
      activeMarkerElement.current.classList.add("map-active-point--hidden");
      return;
    }

    const coordinates = coordinateLookup.get(highlightedRecordId);

    if (!coordinates) {
      if (activeMarkerAdded.current) {
        activeMarker.current.remove();
        activeMarkerAdded.current = false;
      }
      activeMarkerElement.current.classList.add("map-active-point--hidden");
      return;
    }

    activeMarker.current.setLngLat([coordinates.x, coordinates.y]);

    if (!activeMarkerAdded.current) {
      activeMarker.current.addTo(map.current);
      activeMarkerAdded.current = true;
    }

    activeMarkerElement.current.classList.remove("map-active-point--hidden");
  }, [highlightedRecordId, coordinateLookup]);

  useEffect(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    if (route.length > 0) {
      return;
    }

    map.current.easeTo({
      center: [initialLng, initialLat],
      zoom: 11,
      duration: 0,
    });
  }, [initialLng, initialLat, route.length]);

  useEffect(() => {
    return () => {
      activeMarker.current?.remove();
      activeMarkerAdded.current = false;
      activeMarkerElement.current?.classList.add("map-active-point--hidden");
    };
  }, []);

  const displaySampleId = highlightedRecordId;

  return (
    <div className="relative">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-md">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          <span>Map view</span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span>Zoom {zoom.toFixed(1)}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Lon {lng.toFixed(4)} · Lat {lat.toFixed(4)}
        </div>
        <div className="text-xs font-semibold text-slate-700">
          {displaySampleId != null
            ? `Sample #${displaySampleId}`
            : "Hover route to explore"}
        </div>
      </div>
      <div
        className="w-full bg-white rounded-lg shadow-md map-container"
        ref={mapContainer}
      />
    </div>
  );
}
