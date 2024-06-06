package utils

func ConvertSpeed(speedMmPerSec int32) float64 {
	// Convert millimeters per second to meters per second
	speedMPerSec := speedMmPerSec / 1000

	// Convert meters per second to kilometers per hour
	speedKmPerHour := float64(speedMPerSec) * 3.6

	return speedKmPerHour
}
