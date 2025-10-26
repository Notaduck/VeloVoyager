import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureIdentifier, GeoJSONSourceSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import "./map.css";

import {
  BASE_POINT_RADIUS,
  FOCUS_POINT_RADIUS,
  HOVER_POINT_RADIUS,
  ROUTE_DIRECTION_ICON,
} from "./constants";
import {
  buildRouteMarkers,
  createPointsFeatureCollection,
  createRouteFeature,
  ensureArrowImage,
  fitRouteBounds,
  hasCoordinates,
} from "./utils";
import type { ActivityRecord, Coordinates, RouteGeometry } from "./types";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type LazyMapProps = {
  route: RouteGeometry;
  records: ActivityRecord[];
  initialLng: number;
  initialLat: number;
  focusedRecordId?: number | null;
  onRecordHover?: (recordId: number | null) => void;
};

const ROUTE_SOURCE_ID = "route";
const ROUTE_LAYER_OUTLINE_ID = "route-outline";
const ROUTE_LAYER_MAIN_ID = "route-main";
const ROUTE_LAYER_DIRECTION_ID = "route-direction";
const ROUTE_MARKERS_SOURCE_ID = "route-markers";
const ROUTE_MARKERS_LAYER_ID = "route-markers";
const POINTS_SOURCE_ID = "points";
const POINTS_LAYER_ID = "points";

const ACTIVE_MARKER_CLASS = "map-active-point";
const ACTIVE_MARKER_HIDDEN_CLASS = "map-active-point--hidden";
const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const NAV_CONTROL_POSITION: mapboxgl.ControlPosition = "top-right";

const createMarkerElement = () => {
  const element = document.createElement("div");
  element.classList.add(ACTIVE_MARKER_CLASS, ACTIVE_MARKER_HIDDEN_CLASS);
  return element;
};

const buildRouteSource = (route: RouteGeometry): GeoJSONSourceSpecification => ({
  type: "geojson",
  lineMetrics: true,
  data: createRouteFeature(route),
});

const buildPointsSource = (records: ActivityRecord[]): GeoJSONSourceSpecification => ({
  type: "geojson",
  data: createPointsFeatureCollection(records),
});

const buildMarkersSource = (route: RouteGeometry): GeoJSONSourceSpecification => ({
  type: "geojson",
  data: {
    type: "FeatureCollection",
    features: buildRouteMarkers(route),
  },
});

/**
 * Interactive map visualisation for a single activity. Displays the route and sampled points
 * while keeping hover/focus state in sync with the chart components.
 */
export default function LazyMap({
  route,
  records,
  initialLat,
  initialLng,
  focusedRecordId,
  onRecordHover,
}: LazyMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapReady = useRef(false);

  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(9);
  const [hoveredRecordId, setHoveredRecordId] = useState<number | null>(null);

  const lastFocusedId = useRef<number | null>(null);
  const lastHoveredId = useRef<number | null>(null);
  const desiredFocusedId = useRef<number | null>(focusedRecordId ?? null);

  const activeMarker = useRef<mapboxgl.Marker | null>(null);
  const activeMarkerElement = useRef<HTMLDivElement | null>(null);
  const activeMarkerAdded = useRef(false);

  desiredFocusedId.current = focusedRecordId ?? null;

  const coordinateLookup = useMemo(() => {
    const lookup = new Map<number, Coordinates>();
    for (const record of records) {
      if (hasCoordinates(record)) {
        lookup.set(record.id, record.coordinates);
      }
    }
    return lookup;
  }, [records]);

  const focusRoute = useCallback(
    (animate: boolean) => {
      if (!mapRef.current || !route.length) {
        return;
      }

      fitRouteBounds(mapRef.current, route, animate);
    },
    [route],
  );

  const resetHoverState = useCallback(() => {
    if (!mapRef.current) {
      return;
    }

    if (lastHoveredId.current != null) {
      mapRef.current.setFeatureState(
        { source: POINTS_SOURCE_ID, id: lastHoveredId.current } as FeatureIdentifier,
        { hover: false },
      );
      lastHoveredId.current = null;
    }
    setHoveredRecordId((prev) => (prev === null ? prev : null));
  }, []);

  const resetFocusState = useCallback(() => {
    if (!mapRef.current) {
      return;
    }

    if (lastFocusedId.current != null) {
      mapRef.current.setFeatureState(
        { source: POINTS_SOURCE_ID, id: lastFocusedId.current } as FeatureIdentifier,
        { focus: false },
      );
      lastFocusedId.current = null;
    }
  }, []);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) {
      return;
    }

    const initialCenter = route.length ? [route[0][0], route[0][1]] : [initialLng, initialLat];
    const initialZoom = route.length ? 11 : zoom;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      cooperativeGestures: true,
    });

    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      NAV_CONTROL_POSITION,
    );

    mapRef.current.on("move", () => {
      const mapInstance = mapRef.current;
      if (!mapInstance) {
        return;
      }
      const center = mapInstance.getCenter();
      setLng(Number(center.lng.toFixed(4)));
      setLat(Number(center.lat.toFixed(4)));
      setZoom(Number(mapInstance.getZoom().toFixed(2)));
    });

    mapRef.current.on("load", () => {
      const mapInstance = mapRef.current;
      if (!mapInstance) {
        return;
      }

      mapReady.current = true;
      ensureArrowImage(mapInstance);

      mapInstance.addSource(ROUTE_SOURCE_ID, buildRouteSource(route));

      mapInstance.addLayer({
        id: ROUTE_LAYER_OUTLINE_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
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

      mapInstance.addLayer({
        id: ROUTE_LAYER_MAIN_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
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

      mapInstance.addLayer({
        id: ROUTE_LAYER_DIRECTION_ID,
        type: "symbol",
        source: ROUTE_SOURCE_ID,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 90,
          "icon-image": ROUTE_DIRECTION_ICON,
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

      mapInstance.addSource(ROUTE_MARKERS_SOURCE_ID, buildMarkersSource(route));
      mapInstance.addLayer({
        id: ROUTE_MARKERS_LAYER_ID,
        type: "circle",
        source: ROUTE_MARKERS_SOURCE_ID,
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
        activeMarkerElement.current = createMarkerElement();
      }

      if (!activeMarker.current && activeMarkerElement.current) {
        activeMarker.current = new mapboxgl.Marker({
          element: activeMarkerElement.current,
          pitchAlignment: "map",
          rotationAlignment: "map",
          anchor: "center",
        });
      }

      mapInstance.addSource(POINTS_SOURCE_ID, buildPointsSource(records));
      mapInstance.addLayer({
        id: POINTS_LAYER_ID,
        type: "circle",
        source: POINTS_SOURCE_ID,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "focus"], false],
            FOCUS_POINT_RADIUS,
            ["boolean", ["feature-state", "hover"], false],
            HOVER_POINT_RADIUS,
            BASE_POINT_RADIUS,
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

      mapInstance.on("mousemove", POINTS_LAYER_ID, (event: mapboxgl.MapMouseEvent) => {
        if (!event.features?.length) {
          return;
        }
        const feature = event.features[0];
        const featureId =
          (feature.id as number | undefined) ??
          (feature.properties?.id as number | undefined);
        if (featureId === undefined || featureId === lastHoveredId.current) {
          return;
        }

        if (lastHoveredId.current != null && lastHoveredId.current !== featureId) {
          mapInstance.setFeatureState(
            { source: POINTS_SOURCE_ID, id: lastHoveredId.current } as FeatureIdentifier,
            { hover: false },
          );
        }

        mapInstance.setFeatureState(
          { source: POINTS_SOURCE_ID, id: featureId } as FeatureIdentifier,
          { hover: true },
        );
        lastHoveredId.current = featureId;
        setHoveredRecordId((prev) => (prev === featureId ? prev : featureId));
        onRecordHover?.(featureId);
      });

      mapInstance.on("mouseenter", POINTS_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = "pointer";
      });

      mapInstance.on("mouseleave", POINTS_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = "";
        const previousHoverId = lastHoveredId.current;
        if (previousHoverId != null) {
          mapInstance.setFeatureState(
            { source: POINTS_SOURCE_ID, id: previousHoverId } as FeatureIdentifier,
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
        focusRoute(false);
      }
    });
  }, [focusRoute, initialLat, initialLng, onRecordHover, records, route, zoom]);

  useEffect(() => {
    if (!mapRef.current || !mapReady.current) {
      return;
    }

    const mapInstance = mapRef.current;

    const routeSource = mapInstance.getSource(ROUTE_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    routeSource?.setData(createRouteFeature(route));

    const pointsSource = mapInstance.getSource(POINTS_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    pointsSource?.setData(createPointsFeatureCollection(records));

    const markersSource = mapInstance.getSource(ROUTE_MARKERS_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    markersSource?.setData({
      type: "FeatureCollection",
      features: buildRouteMarkers(route),
    });

    resetHoverState();
    resetFocusState();

    const targetFocusId = desiredFocusedId.current;
    if (targetFocusId != null && coordinateLookup.has(targetFocusId)) {
      mapInstance.setFeatureState(
        { source: POINTS_SOURCE_ID, id: targetFocusId } as FeatureIdentifier,
        { focus: true },
      );
      lastFocusedId.current = targetFocusId;
    }

    if (route.length) {
      focusRoute(true);
    }
  }, [
    coordinateLookup,
    focusRoute,
    records,
    resetFocusState,
    resetHoverState,
    route,
  ]);

  useEffect(() => {
    if (!mapRef.current || !mapReady.current) {
      return;
    }

    const previousFocusedId = lastFocusedId.current;
    const nextFocusedId = focusedRecordId ?? null;

    if (previousFocusedId === nextFocusedId) {
      return;
    }

    if (previousFocusedId != null) {
      mapRef.current.setFeatureState(
        { source: POINTS_SOURCE_ID, id: previousFocusedId } as FeatureIdentifier,
        { focus: false },
      );
    }

    if (nextFocusedId != null && coordinateLookup.has(nextFocusedId)) {
      mapRef.current.setFeatureState(
        { source: POINTS_SOURCE_ID, id: nextFocusedId } as FeatureIdentifier,
        { focus: true },
      );
    }

    lastFocusedId.current = nextFocusedId;
  }, [coordinateLookup, focusedRecordId]);

  const highlightedRecordId = hoveredRecordId ?? focusedRecordId ?? null;

  useEffect(() => {
    if (
      !mapRef.current ||
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
      activeMarkerElement.current.classList.add(ACTIVE_MARKER_HIDDEN_CLASS);
      return;
    }

    const coordinates = coordinateLookup.get(highlightedRecordId);
    if (!coordinates) {
      if (activeMarkerAdded.current) {
        activeMarker.current.remove();
        activeMarkerAdded.current = false;
      }
      activeMarkerElement.current.classList.add(ACTIVE_MARKER_HIDDEN_CLASS);
      return;
    }

    activeMarker.current.setLngLat([coordinates.x, coordinates.y]);

    if (!activeMarkerAdded.current) {
      activeMarker.current.addTo(mapRef.current);
      activeMarkerAdded.current = true;
    }

    activeMarkerElement.current.classList.remove(ACTIVE_MARKER_HIDDEN_CLASS);
  }, [coordinateLookup, highlightedRecordId]);

  useEffect(() => {
    if (!mapRef.current || !mapReady.current) {
      return;
    }

    if (route.length > 0) {
      return;
    }

    mapRef.current.easeTo({
      center: [initialLng, initialLat],
      zoom: 11,
      duration: 0,
    });
  }, [initialLat, initialLng, route.length]);

  useEffect(() => {
    return () => {
      activeMarker.current?.remove();
      activeMarkerAdded.current = false;
      activeMarkerElement.current?.classList.add(ACTIVE_MARKER_HIDDEN_CLASS);
    };
  }, []);

  const displaySampleId = highlightedRecordId;

  return (
    <div className="relative">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-md">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          <span>Map view</span>
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <span>Zoom {zoom.toFixed(1)}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Lon {lng.toFixed(4)} &middot; Lat {lat.toFixed(4)}
        </div>
        <div className="text-xs font-semibold text-slate-700">
          {displaySampleId != null ? `Sample #${displaySampleId}` : "Hover route to explore"}
        </div>
      </div>
      <div className="map-container w-full rounded-lg bg-white shadow-md" ref={mapContainer} />
    </div>
  );
}
