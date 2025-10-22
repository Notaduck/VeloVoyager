import type {
  Feature as GeoJsonFeature,
  FeatureCollection as GeoJsonFeatureCollection,
  LineString as GeoJsonLineString,
  Point as GeoJsonPoint,
} from "geojson";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import type { LngLatBounds } from "mapbox-gl";

import {
  DEFAULT_ROUTE_MAX_ZOOM,
  ROUTE_DIRECTION_ICON,
  ROUTE_FIT_PADDING,
} from "./constants";
import type { ActivityRecord, Coordinates, RouteGeometry } from "./types";

/**
 * Type guard ensuring an activity record includes coordinates.
 */
export const hasCoordinates = (
  record: ActivityRecord,
): record is ActivityRecord & { coordinates: Coordinates } =>
  record.coordinates?.x !== undefined && record.coordinates?.y !== undefined;

/**
 * Generates and caches the chevron sprite used to draw directional arrows along the route.
 */
export const ensureArrowImage = (mapInstance: mapboxgl.Map) => {
  if (mapInstance.hasImage(ROUTE_DIRECTION_ICON)) {
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
  mapInstance.addImage(ROUTE_DIRECTION_ICON, imageData, { pixelRatio: 2 });
};

export const buildRouteMarkers = (route: RouteGeometry) => {
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

export const createRouteFeature = (route: RouteGeometry): GeoJsonFeature<GeoJsonLineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: route,
  },
});

export const createPointsFeatureCollection = (
  records: ActivityRecord[],
): GeoJsonFeatureCollection<GeoJsonPoint> => ({
  type: "FeatureCollection",
  features: records
    .filter(hasCoordinates)
    .map((record) => ({
      type: "Feature" as const,
      id: record.id,
      properties: { id: record.id },
      geometry: {
        type: "Point" as const,
        coordinates: [record.coordinates!.x, record.coordinates!.y],
      },
    })),
});

export const createRouteBounds = (route: RouteGeometry): LngLatBounds | null => {
  if (!route.length) {
    return null;
  }

  if (route.length === 1) {
    const [lng, lat] = route[0];
    return new mapboxgl.LngLatBounds([lng, lat], [lng, lat]);
  }

  const first = route[0] as [number, number];
  return route.reduce(
    (acc, coords) => acc.extend([coords[0], coords[1]] as [number, number]),
    new mapboxgl.LngLatBounds(first, first),
  );
};

export const fitRouteBounds = (
  mapInstance: mapboxgl.Map,
  route: RouteGeometry,
  animate = false,
) => {
  const bounds = createRouteBounds(route);
  if (!bounds) {
    return;
  }

  if (route.length === 1) {
    const [lng, lat] = route[0];
    mapInstance.setCenter([lng, lat]);
    return;
  }

  mapInstance.fitBounds(bounds, {
    padding: ROUTE_FIT_PADDING,
    duration: animate ? 650 : 0,
    maxZoom: DEFAULT_ROUTE_MAX_ZOOM,
  });
};
