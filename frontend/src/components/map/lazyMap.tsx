import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import "mapbox-gl/dist/mapbox-gl.css";
import "./map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type Props = {
  route: number[][];
  records: Record[];
  initialLng: number;
  initialLat: number;
  focusedRecordId?: number | null;
  onRecordHover?: (recordId: number | null) => void;
};

interface Record {
  id: number;
  coordinates: Coordinates;
  distance: number;
  speed: number;
  timeStamp: number;
  heartRate?: number;
}

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

export default function LazyMap({
  route,
  records,
  initialLat,
  initialLng,
  focusedRecordId,
  onRecordHover,
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

  useEffect(() => {
    void focusedRecordId;
  }, [focusedRecordId]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: zoom,
      });

      map.current.on("move", () => {
        setLng(parseFloat(map.current!.getCenter().lng.toFixed(4)));
        setLat(parseFloat(map.current!.getCenter().lat.toFixed(4)));
        setZoom(parseFloat(map.current!.getZoom().toFixed(2)));
      });

      // Add the route source
      map.current.on("load", () => {
        mapReady.current = true;
        ensureArrowImage(map.current!);
        const geojson: mapboxgl.GeoJSONSourceRaw = {
          type: "geojson",
          lineMetrics: true,
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: route,
            },
          },
        };

        map.current!.addSource("route", geojson);

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
            "line-color": "#38bdf8",
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

        map.current!.addSource("route-markers", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: buildRouteMarkers(route),
          },
        });

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

        // Add a circle layer for each record
        const points = records.map((record) => ({
          type: "Feature" as const,
          properties: {
            id: record.id,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [record.coordinates.x, record.coordinates.y],
          },
        }));

        const pointsSource: mapboxgl.GeoJSONSourceRaw = {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points,
          },
        };

        map.current!.addSource("points", pointsSource);

        map.current!.addLayer({
          id: "points",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": 5,
            "circle-color": "rgba(0, 0, 0, 0)", // Make circles transparent
          },
        });

        // Add a separate layer for the hovered point
        map.current!.addLayer({
          id: "hovered-point",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": 5,
            "circle-color": "#3887be",
            "circle-opacity": [
              "case",
              [
                "any",
                ["boolean", ["feature-state", "hover"], false],
                ["boolean", ["feature-state", "focus"], false],
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
          (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const featureId =
                (feature.id as number | undefined) ??
                (feature.properties?.id as number | undefined);
              if (featureId === undefined) {
                return;
              }

              if (
                lastHoveredId.current != null &&
                lastHoveredId.current !== featureId
              ) {
                map.current!.setFeatureState(
                  { source: "points", id: lastHoveredId.current },
                  { hover: false }
                );
              }

              setHoveredRecordId(featureId);
              onRecordHover?.(featureId);
              map.current!.setFeatureState(
                { source: "points", id: featureId },
                { hover: true }
              );
              lastHoveredId.current = featureId;
            }
          }
        );

        // Change cursor to pointer when hovering over points
        map.current!.on("mouseenter", "points", () => {
          map.current!.getCanvas().style.cursor = "pointer";
        });

        map.current!.on("mouseleave", "points", () => {
          map.current!.getCanvas().style.cursor = "";
          setHoveredRecordId(null);
          onRecordHover?.(null);
          if (lastHoveredId.current != null) {
            map.current!.setFeatureState(
              { source: "points", id: lastHoveredId.current },
              { hover: false }
            );
            lastHoveredId.current = null;
          }
        });
      });
    }
  }, [lng, lat, zoom, route, records, onRecordHover]);

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
      });
    }

    const pointsSource = map.current.getSource("points") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (pointsSource) {
      pointsSource.setData({
        type: "FeatureCollection",
        features: records.map((record) => ({
          type: "Feature" as const,
          id: record.id,
          properties: { id: record.id },
          geometry: {
            type: "Point" as const,
            coordinates: [record.coordinates.x, record.coordinates.y],
          },
        })),
      });
    }

    const markersSource = map.current.getSource("route-markers") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (markersSource) {
      markersSource.setData({
        type: "FeatureCollection",
        features: buildRouteMarkers(route),
      });
    }

    lastHoveredId.current = null;
    lastFocusedId.current = null;
  }, [route, records]);

  useEffect(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    if (lastFocusedId.current != null) {
      map.current.setFeatureState(
        { source: "points", id: lastFocusedId.current },
        { focus: false }
      );
    }

    if (focusedRecordId != null) {
      map.current.setFeatureState(
        { source: "points", id: focusedRecordId },
        { focus: true }
      );
    }

    lastFocusedId.current = focusedRecordId ?? null;
  }, [focusedRecordId]);

  useEffect(() => {
    if (!map.current || !mapReady.current) {
      return;
    }

    if (route.length === 0) {
      return;
    }

    map.current.setCenter([initialLng, initialLat]);
  }, [initialLng, initialLat, route.length]);

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10 p-2 m-2 mb-20 bg-white rounded shadow sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        {hoveredRecordId !== null && (
          <div>Hovered Record ID: {hoveredRecordId}</div>
        )}
      </div>
      <div
        className="w-full bg-white rounded-lg shadow-md map-container"
        ref={mapContainer}
      />
    </div>
  );
}
