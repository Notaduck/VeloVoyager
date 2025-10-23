import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import type { FeatureIdentifier, GeoJSONSourceSpecification } from "mapbox-gl";
import type {
  Feature as GeoJsonFeature,
  FeatureCollection as GeoJsonFeatureCollection,
  LineString as GeoJsonLineString,
} from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import "./map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type Props = {
  route: number[][];
  records: MapRecord[];
  initialLng: number;
  initialLat: number;
};

interface MapRecord {
  id: number;
  coordinates?: Coordinates;
  distance: number;
  speed: number;
  timeStamp?: number;
  heartRate?: number;
  cadence?: number;
}

const hasCoordinates = (
  record: MapRecord,
): record is MapRecord & { coordinates: Coordinates } =>
  record.coordinates?.x !== undefined && record.coordinates?.y !== undefined;

export interface Coordinates {
  x: number;
  y: number;
}

export default function Map({ route, records, initialLat, initialLng }: Props) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(9);
  const [hoveredRecordId, setHoveredRecordId] = useState<number | null>(null);
  const lastHoveredId = useRef<number | null>(null);

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
        const geojson: GeoJSONSourceSpecification = {
          type: "geojson",
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

        // Add the route layer
        map.current!.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#5E239D",
            "line-width": 2,
          },
        });

        // Add a circle layer for each record
        const points = records
          .filter(hasCoordinates)
          .map((record) => ({
            type: "Feature" as const,
            properties: {
              id: record.id,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [record.coordinates.x, record.coordinates.y],
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
              8,
              ["boolean", ["feature-state", "hover"], false],
              6,
              0,
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
              1.5,
              ["boolean", ["feature-state", "hover"], false],
              1.5,
              0,
            ],
            "circle-stroke-color": [
              "case",
              ["boolean", ["feature-state", "focus"], false],
              "#0f172a",
              ["boolean", ["feature-state", "hover"], false],
              "#ffffff",
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

              if (
                lastHoveredId.current != null &&
                lastHoveredId.current !== featureId
              ) {
                map.current!.setFeatureState(
                  { source: "points", id: lastHoveredId.current } as FeatureIdentifier,
                  { hover: false },
                );
              }

              setHoveredRecordId(featureId);
              map.current!.setFeatureState(
                { source: "points", id: featureId } as FeatureIdentifier,
                { hover: true },
              );
              lastHoveredId.current = featureId;
            }
          },
        );

        // Change cursor to pointer when hovering over points
        map.current!.on("mouseenter", "points", () => {
          map.current!.getCanvas().style.cursor = "pointer";
        });

        map.current!.on("mouseleave", "points", () => {
          map.current!.getCanvas().style.cursor = "";
          setHoveredRecordId(null);
          if (lastHoveredId.current != null) {
            map.current!.setFeatureState(
              { source: "points", id: lastHoveredId.current } as FeatureIdentifier,
              { hover: false },
            );
            lastHoveredId.current = null;
          }
        });
      });
    }
  }, [lng, lat, zoom, route, records]);

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
