import type { MetricPoint } from "./types";

/**
 * Formats a distance (km) while adapting decimal precision to the largest chart tick.
 */
export const formatDistance = (distance: number, maxTick?: number) => {
  const decimals = maxTick !== undefined && maxTick >= 100 ? 0 : 1;
  return `${distance.toFixed(decimals)} km`;
};

/**
 * Generates even tick marks for the X axis based on the supplied metric points.
 */
export const createDistanceTicks = (points: MetricPoint[]): number[] => {
  if (!points.length) {
    return [];
  }

  const maxDistance = Math.max(...points.map((point) => point.distanceKm));
  const step = maxDistance < 100 ? 5 : 10;
  const topTick =
    maxDistance < 100
      ? Math.ceil(maxDistance / step) * step
      : Math.max(step, Math.floor(maxDistance / step) * step);

  const ticks: number[] = [];
  for (let value = 0; value <= topTick + 1e-6; value += step) {
    ticks.push(Number(value.toFixed(2)));
  }

  if (!ticks.length) {
    ticks.push(0);
  }

  return ticks;
};
