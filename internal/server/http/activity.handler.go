package http

import (
	"fmt"
	"log"
	"log/slog"
	"math"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/notaduck/backend/internal/storage"
	"github.com/tormoder/fit"
)

func (s *APIServer) handleGetActivity(w http.ResponseWriter, r *http.Request) error {

	q := r.URL.Query()

	activityID, err := strconv.ParseInt(q.Get("id"), 10, 32)

	if err != nil {

		slog.Error("Error converting activity ID:", err)
		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "id must be a number"})

	}

	user := RetrieveUserFromContext(r.Context())

	activity, err := s.activityService.GetSingleActivityById(r.Context(), int32(activityID), []byte(user.ID))

	if err != nil {
		slog.Error("failed to fina an activity", "no activity found for", err.Error())

		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "no activity was found."})
		// return WriteJSON(w, http.StatusBadRequest, err.Error())

	}

	return WriteJSON(w, http.StatusOK, activity)

}

func (s *APIServer) handlePostActivity(w http.ResponseWriter, r *http.Request) error {

	err := r.ParseMultipartForm(10 << 20) // 10 MB limit for uploaded files

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, "Please select one or more .fit files to upload and try again! 📁🚀")
	}

	files := r.MultipartForm.File["files"]

	for _, fileHeader := range files {
		// Open the file

		file, err := fileHeader.Open()

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, "Unable to open the file")

		}

		defer file.Close()

		// Check if the file has a .fit extension
		if filepath.Ext(fileHeader.Filename) != ".fit" {
			return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "Invalid file type. Only .fit files are allowed."})
		}

		if err != nil {
			log.Fatal(err)
		}

		fit, err := fit.Decode(file)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}

		activity, err := fit.Activity()
		if err != nil {
			// handle error
		}

		var distance float64
		var totalElevationChange uint32 // Use a larger integer type to safely accumulate changes
		var previousElevation uint16
		var previousElevationSet bool // To check if previousElevation has been set
		var numberOfSpeed float64
		var sumOfSpeed float64
		var maxSpeed uint16
		// var startTime time.Time = activity.Records[0].Timestamp
		// var endTime time.Time = activity.Records[len(activity.Records-1)].Timestamp
		var records []storage.CreateRecordsParams

		for index, record := range activity.Records {
			if !(record.PositionLat.Invalid() && record.PositionLong.Invalid()) {

				newRecord := storage.CreateRecordsParams{
					TimeStamp:        pgtype.Timestamptz{Time: record.Timestamp, Valid: true},
					Position:         pgtype.Point{P: pgtype.Vec2{X: float64(record.PositionLong.Degrees()), Y: float64(record.PositionLat.Degrees())}, Valid: true},
					Altitude:         pgtype.Int4{Int32: int32(record.Altitude), Valid: true},
					HeartRate:        pgtype.Int2{Int16: int16(record.HeartRate), Valid: true},
					Cadence:          pgtype.Int2{Int16: int16(record.Cadence), Valid: true},
					Distance:         pgtype.Int4{Int32: int32(record.Distance), Valid: true},
					Speed:            pgtype.Int4{Int32: int32(record.Speed), Valid: true},
					Temperature:      pgtype.Int2{Int16: int16(record.Temperature), Valid: true},
					GpsAccuracy:      pgtype.Int2{Int16: int16(record.GpsAccuracy), Valid: true},
					EnhancedAltitude: pgtype.Int4{Int32: int32(record.EnhancedAltitude), Valid: true},
					ActivityID:       pgtype.Int4{Int32: int32(0)},
				}
				records = append(records, newRecord)

				if index != 0 {

					speed := record.Speed
					numberOfSpeed = numberOfSpeed + 1
					sumOfSpeed = sumOfSpeed + float64(speed)

					if maxSpeed < speed {
						maxSpeed = speed
						fmt.Printf("%d\n", maxSpeed)
					}

					lat2 := record.PositionLat.Degrees()
					long2 := record.PositionLong.Degrees()
					lat1 := activity.Records[index-1].PositionLat.Degrees()
					long1 := activity.Records[index-1].PositionLong.Degrees()

					if !math.IsNaN(lat1) && !math.IsNaN(long1) && !math.IsNaN(lat2) && !math.IsNaN(long2) {
						distance += haversine(lat1, long1, lat2, long2)
					}

					// Calculate the elevation change
					if previousElevationSet {
						currentElevation := uint32(record.Altitude)
						previousElevationUint32 := uint32(previousElevation)
						if currentElevation > previousElevationUint32 {
							elevationChange := currentElevation - previousElevationUint32
							totalElevationChange += elevationChange
						}
					}

					previousElevation = record.Altitude
					previousElevationSet = true
				} else if !previousElevationSet { // Set the initial previousElevation value
					previousElevation = record.Altitude
					previousElevationSet = true
				}
			}
		}

		avgSpeedMs := sumOfSpeed / numberOfSpeed
		avgSpeedKmH := avgSpeedMs * 3.60 / 1000.00
		maxSpeedKmH := float64(maxSpeed) * 3.60 / 1000.00

		var myUUID pgtype.UUID
		uuidString := "04961e85-8280-4fb3-80d4-a5072bcec9b1" // Your UUID here

		err = myUUID.Scan(uuidString)

		if err != nil {
			slog.Error(err.Error())
		}

		var numericDistance pgtype.Numeric
		err = numericDistance.Scan(fmt.Sprintf("%f", distance))

		if err != nil {
			slog.Error("Failed to set numeric value: %v", err)
		}

		totalRideTime := pgtype.Time{
			Microseconds: int64(activity.Sessions[0].TotalElapsedTime * uint32(time.Microsecond)),
			Valid:        true,
		}

		elapsedTime := pgtype.Time{
			Microseconds: int64(activity.Sessions[0].TotalTimerTime * uint32(time.Microsecond)),
			Valid:        true,
		}

		var avgSpeedKmHNumeric pgtype.Numeric

		err = avgSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", avgSpeedKmH))

		if err != nil {
			slog.Error("Failed to parse avgSpeed: %v", err)
			WriteJSON(w, http.StatusBadRequest, err.Error())

		}

		var maxSpeedKmHNumeric pgtype.Numeric

		err = maxSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", maxSpeedKmH))

		if err != nil {
			slog.Error("Failed to parse maxSpeed: %v", err)
			WriteJSON(w, http.StatusBadRequest, err.Error())

		}

		activityResult, err := s.storage.CreateActivity(r.Context(), storage.CreateActivityParams{
			Distance:     numericDistance,
			UserID:       myUUID,
			TotalTime:    totalRideTime,
			ElapsedTime:  elapsedTime,
			AvgSpeed:     avgSpeedKmHNumeric,
			MaxSpeed:     maxSpeedKmHNumeric,
			ActivityName: getActivityName(activity.Activity.LocalTimestamp),
		})

		if err != nil {
			slog.Error(err.Error())
			WriteJSON(w, http.StatusBadRequest, err)
		}

		for i := range records {
			records[i].ActivityID.Int32 = int32(activityResult.ID)
			records[i].ActivityID.Valid = true
		}

		recordsResult, err := s.storage.CreateRecords(r.Context(), records)
		_ = recordsResult

		if err != nil {
			slog.Error(err.Error())
			WriteJSON(w, http.StatusBadRequest, err)
		}

		return WriteJSON(w, http.StatusOK, activityResult)

	}

	if err != nil {
		panic(err)
	}

	_ = files

	return WriteJSON(w, http.StatusOK, files)

}

func getActivityName(t time.Time) string {
	activityNames := []string{
		"Midnight Pedal Mystery - For the night owls turning the pedals under the stars.",
		"The 1 AM Luna-See Ride - When the moon is your only street light.",
		"2 AM Gear Ghosts - For those who cycle with the spirits of the night.",
		"3 AM Crankset Crickets - Pedaling quietly alongside the sound of crickets.",
		"4 AM Wheel Whispers - When the world is silent, but your bike whispers through the streets.",
		"5 AM Dawn Drafters - Catching the first light with the front wheel.",
		"6 AM Sunrise Sprints - Racing the sun to the horizon.",
		"7 AM Breakfast Breakaway - Fast enough to earn your morning pancakes.",
		"8 AM Commuter Cup - Dodging traffic and racing pedestrians.",
		"9 AM Java Jolt Journey - Fueled by the first coffee of the day.",
		"10 AM Tailwind Tours - When the breeze decides to push you along.",
		"11 AM Brunch Bunch Buzz - Social spin before a mid-morning feast.",
		"Noon Nomad Navigate - Exploring unknown paths when the sun is high.",
		"1 PM Siesta Sprint - Dodging the urge to nap under a shady tree.",
		"2 PM Sweat & Swear Hour - For the heat that tests your will.",
		"3 PM Thirst-Quencher Quest - On a mission to find the coldest drink in town.",
		"4 PM Shadow Chasers - Racing your own shadow as the sun starts to dip.",
		"5 PM Rush Hour Rendezvous - Weaving through traffic with skill and a bit of luck.",
		"6 PM Sunset Serenade - A leisurely ride under the colors of the evening sky.",
		"7 PM Neon Night Riders - When your bike lights are the main show.",
		"8 PM Dine & Dash - Cycling from one food stop to another.",
		"9 PM Starlight Sprint - Racing under the canopy of the night sky.",
		"10 PM Moonlit Mountain Climbers - Taking on the hills with only the moon for guidance.",
		"11 PM Pajama Pedalers - For those too excited to sleep, opting for a ride in their PJs.",
	}

	hour := t.Hour()
	if hour < 0 || hour >= len(activityNames) {
		return "Invalid hour"
	}
	return activityNames[hour]
}

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	// Convert degrees to radians
	lat1 = degToRad(lat1)
	lon1 = degToRad(lon1)
	lat2 = degToRad(lat2)
	lon2 = degToRad(lon2)

	// Haversine formula
	dlat := lat2 - lat1
	dlon := lon2 - lon1
	a := math.Pow(math.Sin(dlat/2), 2) + math.Cos(lat1)*math.Cos(lat2)*math.Pow(math.Sin(dlon/2), 2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	r := 6371.0 // Earth's radius in km
	return r * c
}

func degToRad(deg float64) float64 {
	return deg * (math.Pi / 180)
}
