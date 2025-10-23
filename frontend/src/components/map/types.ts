export interface Coordinates {
  x: number;
  y: number;
}

export interface ActivityRecord {
  id: number;
  coordinates?: Coordinates;
  distance: number;
  speed: number;
  timeStamp?: number;
  heartRate?: number;
  cadence?: number;
}

export type RouteGeometry = number[][];
