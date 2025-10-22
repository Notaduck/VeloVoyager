/** Padding applied when fitting the map viewport to a route. */
export const ROUTE_FIT_PADDING = {
  top: 80,
  bottom: 80,
  left: 80,
  right: 80,
} as const;

/** Max zoom level when fitting the map to a new route. */
export const DEFAULT_ROUTE_MAX_ZOOM = 15;

/** Sprite name for the direction icon rendered along the route. */
export const ROUTE_DIRECTION_ICON = "route-arrow";

/** Circle radius (in px) for hover state over individual route points. */
export const HOVER_POINT_RADIUS = 7;
/** Circle radius (in px) for focus/selected state over individual route points. */
export const FOCUS_POINT_RADIUS = 9;
/** Default circle radius (in px) when no interaction is active. */
export const BASE_POINT_RADIUS = 5;
