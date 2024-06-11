import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import "mapbox-gl/dist/mapbox-gl.css";
import "./map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type Props = {
  route: number[][];
  records: Record[];
  initialLng: number;
  initialLat: number;
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

export default function Map({ route, records, initialLat, initialLng }: Props) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(9);
  const [hoveredRecordId, setHoveredRecordId] = useState<number | null>(null);

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
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });

      // Add the route source
      map.current.on("load", () => {
        const geojson = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route,
          },
        };

        map.current.addSource("route", {
          type: "geojson",
          data: geojson,
        });

        // Add the route layer
        map.current.addLayer({
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
        const points = records.map((record) => ({
          type: "Feature",
          properties: {
            id: record.id,
          },
          geometry: {
            type: "Point",
            coordinates: [record.coordinates.x, record.coordinates.y],
          },
        }));

        map.current.addSource("points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points,
          },
        });

        map.current.addLayer({
          id: "points",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": 5,
            "circle-color": "rgba(0, 0, 0, 0)", // Make circles transparent
          },
        });

        // Add a separate layer for the hovered point
        map.current.addLayer({
          id: "hovered-point",
          type: "circle",
          source: "points",
          paint: {
            "circle-radius": 5,
            "circle-color": "#3887be",
            "circle-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1,
              0,
            ],
          },
        });

        // Handle hover events
        map.current.on("mousemove", "points", (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            setHoveredRecordId(feature.properties.id);
            map.current.setFeatureState(
              { source: "points", id: feature.id },
              { hover: true }
            );
          }
        });

        // Change cursor to pointer when hovering over points
        map.current.on("mouseenter", "points", () => {
          map.current.getCanvas().style.cursor = "pointer";
        });

        map.current.on("mouseleave", "points", () => {
          map.current.getCanvas().style.cursor = "";
          setHoveredRecordId(null);
          map.current.removeFeatureState({ source: "points" });
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
