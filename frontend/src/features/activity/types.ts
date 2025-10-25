import type { GetActivityResponse } from "@/gen/activity/v1/activity_pb";
import type { LucideIcon } from "lucide-react";

export type ActivityRecords = GetActivityResponse["records"];

export type RecordWithCoordinates = ActivityRecords[number] & {
  coordinates: NonNullable<ActivityRecords[number]["coordinates"]>;
};

export type MetricPoint = {
  recordId: number;
  distanceKm: number;
  speedKph: number;
  heartRate: number | null;
  cadence: number | null;
};

export type MapRecord = {
  id: number;
  distance: number;
  speed: number;
  heartRate?: number;
  cadence?: number;
  timeStamp?: number;
  coordinates?: {
    x: number;
    y: number;
  };
};

export type RouteInfo = {
  route: number[][];
  centerLat: number;
  centerLng: number;
};

export type StatItem = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  colSpan?: number;
  rowSpan?: number;
};

export type DetailItem = {
  label: string;
  value: string;
};
