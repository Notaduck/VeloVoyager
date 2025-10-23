import { useMemo } from "react";

import type { GetActivityResponse } from "@/gen/activity/v1/activity_pb";

import { MAX_METRIC_POINTS, UNKNOWN_VALUE } from "../constants";
import { createDistanceTicks, formatDistance } from "../utils";
import type {
  DetailItem,
  MapRecord,
  MetricPoint,
  RouteInfo,
} from "../types";

/**
 * Produces a user-friendly date label for the recorded activity timestamp.
 */
const formatRecordedOn = (isoString: string | undefined): string => {
  if (!isoString) {
    return UNKNOWN_VALUE;
  }

  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Down-samples raw activity records into chart-friendly metric points.
 */
const buildMetricsPoints = (activity?: GetActivityResponse): MetricPoint[] => {
  const records = activity?.records ?? [];
  if (!records.length) {
    return [];
  }

  const step = Math.max(1, Math.floor(records.length / MAX_METRIC_POINTS));
  return records
    .filter((_, index) => index % step === 0)
    .map((record) => ({
      recordId: record.id,
      distanceKm: record.distance / 100_000,
      speedKph: record.speed,
      heartRate: record.heartRate ?? null,
      cadence: record.cadence ?? null,
    }));
};

/**
 * Builds a lookup map that returns the nearest sampled metric point for any record id.
 */
const buildSampleLookup = (
  metricsPoints: MetricPoint[],
  activity?: GetActivityResponse,
) => {
  const lookup = new Map<number, MetricPoint>();
  const records = activity?.records ?? [];

  if (!metricsPoints.length) {
    return lookup;
  }

  for (const point of metricsPoints) {
    lookup.set(point.recordId, point);
  }

  for (const record of records) {
    if (lookup.has(record.id)) {
      continue;
    }

    const distanceKm = record.distance / 100_000;
    let nearest = metricsPoints[0];
    let minDiff = Math.abs(nearest.distanceKm - distanceKm);

    for (let index = 1; index < metricsPoints.length; index += 1) {
      const candidate = metricsPoints[index];
      const diff = Math.abs(candidate.distanceKm - distanceKm);
      if (diff < minDiff) {
        nearest = candidate;
        minDiff = diff;
      }
    }

    lookup.set(record.id, {
      ...nearest,
      recordId: record.id,
      distanceKm,
      speedKph: record.speed,
      heartRate: record.heartRate ?? nearest.heartRate,
      cadence: record.cadence ?? nearest.cadence ?? null,
    });
  }

  return lookup;
};

/**
 * Generates the polyline and centre point used to initialise the map viewport.
 */
const buildRouteInfo = (activity?: GetActivityResponse): RouteInfo => {
  const coordinateRecords = (activity?.records ?? []).filter(
    (record): record is NonNullable<GetActivityResponse["records"]>[number] & {
      coordinates: NonNullable<GetActivityResponse["records"][number]["coordinates"]>;
    } =>
      record.coordinates?.x !== undefined && record.coordinates?.y !== undefined,
  );

  if (!coordinateRecords.length) {
    return { route: [], centerLat: 0, centerLng: 0 };
  }

  const route = coordinateRecords.map((record) => [
    record.coordinates.x,
    record.coordinates.y,
  ]);

  const centerLat =
    coordinateRecords.reduce((acc, record) => acc + record.coordinates.y, 0) /
    coordinateRecords.length;
  const centerLng =
    coordinateRecords.reduce((acc, record) => acc + record.coordinates.x, 0) /
    coordinateRecords.length;

  return { route, centerLat, centerLng };
};

/**
 * Normalises activity records into the shape expected by the map component.
 */
const buildMapRecords = (activity?: GetActivityResponse): MapRecord[] =>
  (activity?.records ?? []).map((record) => ({
    id: record.id,
    distance: record.distance,
    speed: record.speed,
    heartRate: record.heartRate ?? undefined,
    cadence: record.cadence ?? undefined,
    timeStamp: undefined,
    coordinates: record.coordinates
      ? { x: record.coordinates.x, y: record.coordinates.y }
      : undefined,
  }));

/** Formats speed values while handling nulls gracefully. */
const formatSpeedLabel = (value: number | undefined | null) =>
  typeof value === "number" ? `${value.toFixed(1)} km/h` : UNKNOWN_VALUE;

/** Formats heart-rate values while handling nulls gracefully. */
const formatHeartRateLabel = (value: number | null | undefined) =>
  value != null ? `${Math.round(value)} bpm` : UNKNOWN_VALUE;

const formatCadenceLabel = (value: number | null | undefined) =>
  value != null ? `${Math.round(value)} rpm` : UNKNOWN_VALUE;

/**
 * Constructs the key-value summary list shown beneath the hero stats.
 */
const buildDetailItems = (
  activity: GetActivityResponse | undefined,
  activityId: number,
  recordedOnLabel: string,
  recordCountLabel: string,
  maxHeartRateLabel: string,
  maxCadenceLabel: string,
) =>
  [
    { label: "Activity ID", value: `#${activity?.id ?? activityId}` },
    { label: "Recorded on", value: recordedOnLabel },
    { label: "Samples", value: recordCountLabel },
    { label: "Max heart rate", value: maxHeartRateLabel },
    { label: "Max cadence", value: maxCadenceLabel },
  ] satisfies DetailItem[];

/**
 * Aggregates and memoises all derived values required by the activity detail page.
 */
export const useActivityDerivedData = (
  activity: GetActivityResponse | undefined,
  activityId: number,
) => {
  const metricsPoints = useMemo(() => buildMetricsPoints(activity), [activity]);
  const sampleByRecordId = useMemo(
    () => buildSampleLookup(metricsPoints, activity),
    [activity, metricsPoints],
  );
  const routeInfo = useMemo(() => buildRouteInfo(activity), [activity]);
  const mapboxRecords = useMemo(() => buildMapRecords(activity), [activity]);

  const totalDistanceKm = metricsPoints.length
    ? metricsPoints[metricsPoints.length - 1].distanceKm
    : 0;
  const distanceLabel = totalDistanceKm > 0 ? formatDistance(totalDistanceKm) : UNKNOWN_VALUE;

  const avgSpeedLabel = formatSpeedLabel(activity?.avgSpeed);
  const maxSpeedLabel = formatSpeedLabel(activity?.maxSpeed);
  const elapsedTimeLabel = activity?.elapsedTime ?? UNKNOWN_VALUE;

  const heartRecords = useMemo(
    () => (activity?.records ?? []).filter((record) => record.heartRate != null),
    [activity?.records],
  );

  const cadenceRecords = useMemo(
    () => (activity?.records ?? []).filter((record) => record.cadence != null),
    [activity?.records],
  );

  const averageHeartRateValue = heartRecords.length
    ? heartRecords.reduce((sum, record) => sum + (record.heartRate ?? 0), 0) /
      heartRecords.length
    : null;
  const averageHeartRateLabel = formatHeartRateLabel(averageHeartRateValue);

  const maxHeartRateValue = heartRecords.length
    ? Math.max(
        ...heartRecords.map(
          (record) => record.heartRate ?? Number.NEGATIVE_INFINITY,
        ),
      )
    : null;
  const maxHeartRateLabel =
    maxHeartRateValue != null ? `${maxHeartRateValue} bpm` : UNKNOWN_VALUE;

  const averageCadenceValue = cadenceRecords.length
    ? cadenceRecords.reduce((sum, record) => sum + (record.cadence ?? 0), 0) /
      cadenceRecords.length
    : null;
  const averageCadenceLabel = formatCadenceLabel(averageCadenceValue);

  const maxCadenceValue = cadenceRecords.length
    ? Math.max(
        ...cadenceRecords.map(
          (record) => record.cadence ?? Number.NEGATIVE_INFINITY,
        ),
      )
    : null;
  const maxCadenceLabel =
    maxCadenceValue != null ? `${maxCadenceValue} rpm` : UNKNOWN_VALUE;

  const recordCountLabel = (activity?.records?.length ?? 0).toLocaleString();
  const recordedOnLabel = formatRecordedOn(activity?.createdAt);

  const detailItems = useMemo(
    () =>
      buildDetailItems(
        activity,
        activityId,
        recordedOnLabel,
        recordCountLabel,
        maxHeartRateLabel,
        maxCadenceLabel,
      ),
    [
      activity,
      activityId,
      maxCadenceLabel,
      maxHeartRateLabel,
      recordCountLabel,
      recordedOnLabel,
    ],
  );

  const distanceTicks = useMemo(() => createDistanceTicks(metricsPoints), [metricsPoints]);

  return {
    metricsPoints,
    sampleByRecordId,
    routeInfo,
    mapboxRecords,
    totalDistanceKm,
    distanceLabel,
    avgSpeedLabel,
    maxSpeedLabel,
    elapsedTimeLabel,
    averageHeartRateValue,
    averageHeartRateLabel,
    maxHeartRateValue,
    maxHeartRateLabel,
    averageCadenceValue,
    averageCadenceLabel,
    maxCadenceValue,
    maxCadenceLabel,
    recordCountLabel,
    recordedOnLabel,
    detailItems,
    distanceTicks,
  };
};
