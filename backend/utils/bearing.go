package utils

import "math"

func CalculateBearing(lat1, lon1, lat2, lon2 float64) float64 {
	// Difference in the coordinates
	dLon := lon2 - lon1

	// Calculate bearing
	x := math.Sin(dLon) * math.Cos(lat2)
	y := math.Cos(lat1)*math.Sin(lat2) - math.Sin(lat1)*math.Cos(lat2)*math.Cos(dLon)
	initialBearing := math.Atan2(x, y)

	// Normalize the bearing to 0-2*pi radians
	bearing := math.Mod(initialBearing+2*math.Pi, 2*math.Pi)

	return bearing * 180 / math.Pi
}
