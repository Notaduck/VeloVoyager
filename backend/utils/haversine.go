package utils

import "math"

func Haversine(lat1, lon1, lat2, lon2 float64) float64 {
	// Convert degrees to radians
	lat1 = DegToRad(lat1)
	lon1 = DegToRad(lon1)
	lat2 = DegToRad(lat2)
	lon2 = DegToRad(lon2)

	// Haversine formula
	dlat := lat2 - lat1
	dlon := lon2 - lon1
	a := math.Pow(math.Sin(dlat/2), 2) + math.Cos(lat1)*math.Cos(lat2)*math.Pow(math.Sin(dlon/2), 2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	r := 6371.0 // Earth's radius in km
	return r * c
}
