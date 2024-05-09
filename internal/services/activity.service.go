package service

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/notaduck/backend/internal/db"
	"github.com/notaduck/backend/internal/repositories"
	"github.com/notaduck/backend/utils"
	"github.com/tormoder/fit"
)

type Activity struct {
	ID           int32     `json:"id"`
	CreatedAt    time.Time `json:"createdAt"`
	Distance     float64   `json:"distance"`
	ActivityName string    `json:"activityName"`
	AvgSpeed     float64   `json:"avgSpeed"`
	MaxSpeed     float64   `json:"maxSpeed"`
	ElapsedTime  string    `json:"elapsedTime"`
	TotalTime    string    `json:"totalTime"`
	Records      []Record  `json:"records"`
}

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Record struct {
	ID          int32 `json:"id"`
	Coordinates Point `json:"coordinates"`
}

type ActivityService interface {
	GetSingleActivityById(ctx context.Context, activityId int32, userId string) (*Activity, error)
	CreateActivities(ctx context.Context, files []*multipart.FileHeader, userID string) ([]*Activity, error)
}

type activityService struct {
	activityRepo repositories.ActivityRepository
	recordRepo   repositories.RecordRepository
}

func NewActivityService(ar repositories.ActivityRepository, rr repositories.RecordRepository) ActivityService {
	return &activityService{
		activityRepo: ar,
		recordRepo:   rr,
	}
}

func (s *activityService) GetSingleActivityById(ctx context.Context, activityId int32, userId string) (*Activity, error) {
	activityEntity, err := s.activityRepo.GetActivityAndRecords(ctx, activityId)

	if err != nil {
		slog.Error("failed to retrieve activity", "activityId", activityId, "error", err)
		return nil, err
	}

	activityDetails := convertActivityEntityToDomainModel(&activityEntity)

	return activityDetails, nil
}

func (s *activityService) CreateActivities(ctx context.Context, files []*multipart.FileHeader, userId string) ([]*Activity, error) {
	var activities []*Activity

	// if len(files)

	for _, fileHeader := range files {
		activity, err := s.processFitFile(ctx, fileHeader, userId)
		if err != nil {
			return nil, err
		}
		activities = append(activities, activity)
	}
	return activities, nil
}

func (s *activityService) processFitFile(ctx context.Context, fileHeader *multipart.FileHeader, userId string) (*Activity, error) {
	if filepath.Ext(fileHeader.Filename) != ".fit" {
		return nil, fmt.Errorf("invalid file type: only .fit files are allowed")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	fit, err := fit.Decode(file)
	if err != nil {
		return nil, err
	}

	activity, err := fit.Activity()
	if err != nil {
		return nil, err
	}

	return s.createActivityRecord(ctx, activity, userId)
}

func (s *activityService) createActivityRecord(ctx context.Context, activity *fit.ActivityFile, userId string) (*Activity, error) {

	records, stats, err := s.processRecords(activity.Records)

	if err != nil {
		return nil, err
	}

	totalRideTime := pgtype.Time{
		Microseconds: int64(activity.Sessions[0].TotalElapsedTime * uint32(time.Microsecond)),
		Valid:        true,
	}

	elapsedTime := pgtype.Time{
		Microseconds: int64(activity.Sessions[0].TotalTimerTime * uint32(time.Microsecond)),
		Valid:        true,
	}

	activityId, err := s.activityRepo.CreateActivity(ctx, db.CreateActivityParams{
		Distance:     stats.Distance,
		UserID:       userId,
		TotalTime:    totalRideTime,
		ElapsedTime:  elapsedTime,
		AvgSpeed:     stats.AvgSpeed,
		MaxSpeed:     stats.MaxSpeed,
		ActivityName: getActivityName(activity.Activity.LocalTimestamp),
	})
	if err != nil {
		return nil, err
	}

	for i := range records {
		records[i].ActivityID = pgtype.Int4{Int32: int32(activityId), Valid: true}
	}

	if _, err := s.recordRepo.CreateRecords(ctx, records); err != nil {
		return nil, err
	}

	activityEntity, err := s.activityRepo.GetActivityAndRecords(ctx, activityId)

	if err != nil {
		return nil, err
	}

	return convertActivityEntityToDomainModel(&activityEntity), nil
}

func (s *activityService) processRecords(records []*fit.RecordMsg) ([]db.CreateRecordsParams, *ActivityStats, error) {

	var distance float64
	var totalElevationChange uint32
	var previousElevation uint16
	var previousElevationSet bool
	var numberOfSpeed float64
	var sumOfSpeed float64
	var maxSpeed uint16
	var recordEntities []db.CreateRecordsParams
	var stats ActivityStats

	for index, record := range records {
		if !(record.PositionLat.Invalid() && record.PositionLong.Invalid()) {

			newRecord := db.CreateRecordsParams{
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
			recordEntities = append(recordEntities, newRecord)

			if index != 0 {

				speed := record.Speed
				numberOfSpeed = numberOfSpeed + 1
				sumOfSpeed = sumOfSpeed + float64(speed)

				if maxSpeed < speed {
					maxSpeed = speed
				}

				lat2 := record.PositionLat.Degrees()
				long2 := record.PositionLong.Degrees()
				lat1 := records[index-1].PositionLat.Degrees()
				long1 := records[index-1].PositionLong.Degrees()

				if !math.IsNaN(lat1) && !math.IsNaN(long1) && !math.IsNaN(lat2) && !math.IsNaN(long2) {
					distance += utils.Haversine(lat1, long1, lat2, long2)
				}

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
			} else if !previousElevationSet {
				previousElevation = record.Altitude
				previousElevationSet = true
			}
		}
	}

	avgSpeedMs := sumOfSpeed / numberOfSpeed
	avgSpeedKmH := avgSpeedMs * 3.60 / 1000.00
	maxSpeedKmH := float64(maxSpeed) * 3.60 / 1000.00

	var numericDistance pgtype.Numeric
	err := numericDistance.Scan(fmt.Sprintf("%f", distance))

	if err != nil {
		slog.Error("Failed to set numeric value: %v", err)
	}

	var avgSpeedKmHNumeric pgtype.Numeric

	err = avgSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", avgSpeedKmH))

	if err != nil {
		return nil, nil, err

	}

	var maxSpeedKmHNumeric pgtype.Numeric

	err = maxSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", maxSpeedKmH))

	if err != nil {
		return nil, nil, err

	}

	stats.AvgSpeed = avgSpeedKmHNumeric
	stats.MaxSpeed = maxSpeedKmHNumeric
	stats.Distance = numericDistance

	return recordEntities, &stats, nil
}

func convertActivityEntityToDomainModel(activityEntity *db.ActivityWithRecordsView) *Activity {

	activity := &Activity{
		ID:           activityEntity.ID,
		CreatedAt:    activityEntity.CreatedAt.Time,
		Distance:     convertNumericToFloat64(activityEntity.Distance),
		ActivityName: activityEntity.ActivityName,
		AvgSpeed:     convertNumericToFloat64(activityEntity.AvgSpeed),
		MaxSpeed:     convertNumericToFloat64(activityEntity.MaxSpeed),
		ElapsedTime:  activityEntity.ElapsedTimeChar,
		TotalTime:    activityEntity.TotalTimeChar,
		Records:      convertRecords(activityEntity.Records),
	}
	return activity
}

func convertRecords(recordEntities []db.Record) []Record {
	records := make([]Record, len(recordEntities))
	for i, record := range recordEntities {
		records[i] = Record{
			ID: record.ID,
			Coordinates: Point{
				X: record.Position.P.X, //
				Y: record.Position.P.Y,
			},
		}
	}
	return records
}

func convertNumericToFloat64(n pgtype.Numeric) float64 {
	val, err := n.Float64Value()

	if err != nil {
		// handle error or log
		return 0.0
	}
	return val.Float64
}

type ActivityStats struct {
	Distance    pgtype.Numeric
	TotalTime   pgtype.Time
	ElapsedTime pgtype.Time
	AvgSpeed    pgtype.Numeric
	MaxSpeed    pgtype.Numeric
}

// func (s *activityService) CreateActivities(ctx context.Context, files []*multipart.FileHeader, userId string) ([]*Activity, error) {

// 	var activities []*Activity

// 	for _, fileHeader := range files {
// 		// Open the file

// 		file, err := fileHeader.Open()

// 		if err != nil {
// 			return nil, err

// 		}

// 		defer file.Close()

// 		if filepath.Ext(fileHeader.Filename) != ".fit" {
// 			return nil, fmt.Errorf("invalid file type. only .fit files are allowed")
// 		}

// 		fit, err := fit.Decode(file)

// 		if err != nil {
// 			return nil, err
// 		}

// 		activity, err := fit.Activity()
// 		if err != nil {
// 			return nil, err
// 		}

// 		var distance float64
// 		var totalElevationChange uint32
// 		var previousElevation uint16
// 		var previousElevationSet bool
// 		var numberOfSpeed float64
// 		var sumOfSpeed float64
// 		var maxSpeed uint16
// 		var records []repositories.CreateRecordsParams

// 		for index, record := range activity.Records {
// 			if !(record.PositionLat.Invalid() && record.PositionLong.Invalid()) {

// 				newRecord := repositories.CreateRecordsParams{
// 					TimeStamp:        pgtype.Timestamptz{Time: record.Timestamp, Valid: true},
// 					Position:         pgtype.Point{P: pgtype.Vec2{X: float64(record.PositionLong.Degrees()), Y: float64(record.PositionLat.Degrees())}, Valid: true},
// 					Altitude:         pgtype.Int4{Int32: int32(record.Altitude), Valid: true},
// 					HeartRate:        pgtype.Int2{Int16: int16(record.HeartRate), Valid: true},
// 					Cadence:          pgtype.Int2{Int16: int16(record.Cadence), Valid: true},
// 					Distance:         pgtype.Int4{Int32: int32(record.Distance), Valid: true},
// 					Speed:            pgtype.Int4{Int32: int32(record.Speed), Valid: true},
// 					Temperature:      pgtype.Int2{Int16: int16(record.Temperature), Valid: true},
// 					GpsAccuracy:      pgtype.Int2{Int16: int16(record.GpsAccuracy), Valid: true},
// 					EnhancedAltitude: pgtype.Int4{Int32: int32(record.EnhancedAltitude), Valid: true},
// 					ActivityID:       pgtype.Int4{Int32: int32(0)},
// 				}
// 				records = append(records, newRecord)

// 				if index != 0 {

// 					speed := record.Speed
// 					numberOfSpeed = numberOfSpeed + 1
// 					sumOfSpeed = sumOfSpeed + float64(speed)

// 					if maxSpeed < speed {
// 						maxSpeed = speed
// 					}

// 					lat2 := record.PositionLat.Degrees()
// 					long2 := record.PositionLong.Degrees()
// 					lat1 := activity.Records[index-1].PositionLat.Degrees()
// 					long1 := activity.Records[index-1].PositionLong.Degrees()

// 					if !math.IsNaN(lat1) && !math.IsNaN(long1) && !math.IsNaN(lat2) && !math.IsNaN(long2) {
// 						distance += haversine(lat1, long1, lat2, long2)
// 					}

// 					if previousElevationSet {
// 						currentElevation := uint32(record.Altitude)
// 						previousElevationUint32 := uint32(previousElevation)
// 						if currentElevation > previousElevationUint32 {
// 							elevationChange := currentElevation - previousElevationUint32
// 							totalElevationChange += elevationChange
// 						}
// 					}

// 					previousElevation = record.Altitude
// 					previousElevationSet = true
// 				} else if !previousElevationSet {
// 					previousElevation = record.Altitude
// 					previousElevationSet = true
// 				}
// 			}
// 		}

// 		avgSpeedMs := sumOfSpeed / numberOfSpeed
// 		avgSpeedKmH := avgSpeedMs * 3.60 / 1000.00
// 		maxSpeedKmH := float64(maxSpeed) * 3.60 / 1000.00

// 		if err != nil {
// 			slog.Error(err.Error())
// 		}

// 		var numericDistance pgtype.Numeric
// 		err = numericDistance.Scan(fmt.Sprintf("%f", distance))

// 		if err != nil {
// 			slog.Error("Failed to set numeric value: %v", err)
// 		}

// 		totalRideTime := pgtype.Time{
// 			Microseconds: int64(activity.Sessions[0].TotalElapsedTime * uint32(time.Microsecond)),
// 			Valid:        true,
// 		}

// 		elapsedTime := pgtype.Time{
// 			Microseconds: int64(activity.Sessions[0].TotalTimerTime * uint32(time.Microsecond)),
// 			Valid:        true,
// 		}

// 		var avgSpeedKmHNumeric pgtype.Numeric

// 		err = avgSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", avgSpeedKmH))

// 		if err != nil {
// 			return nil, err

// 		}

// 		var maxSpeedKmHNumeric pgtype.Numeric

// 		err = maxSpeedKmHNumeric.Scan(fmt.Sprintf("%.2f", maxSpeedKmH))

// 		if err != nil {
// 			return nil, err

// 		}

// 		activityEntity, err := s.activityRepo.CreateActivity(ctx, repositories.CreateActivityParams{
// 			Distance:     numericDistance,
// 			UserID:       userId,
// 			TotalTime:    totalRideTime,
// 			ElapsedTime:  elapsedTime,
// 			AvgSpeed:     avgSpeedKmHNumeric,
// 			MaxSpeed:     maxSpeedKmHNumeric,
// 			ActivityName: getActivityName(activity.Activity.LocalTimestamp),
// 		})

// 		for i, _ := range records {
// 			records[i].ActivityID = pgtype.Int4{Int32: activityEntity.ID, Valid: true}
// 		}

// 		r, err := s.recordRepo.CreateRecords(ctx, records)

// 		if err != nil {
// 			return nil, err
// 		}

// 		_ = r

// 		a, err := s.activityRepo.GetActivityAndRecords(ctx, activityEntity.ID)

// 		distanceResult, err := pgtype.Numeric.Float64Value(a.Distance)

// 		if err != nil {
// 			return nil, err
// 		}

// 		avgSpeedResult, err := pgtype.Numeric.Float64Value(a.AvgSpeed)

// 		if err != nil {
// 			return nil, err
// 		}

// 		maxSpeedResult, err := pgtype.Numeric.Float64Value(a.MaxSpeed)

// 		if err != nil {
// 			return nil, err
// 		}
// 		var recordsToReturn []Record

// 		for _, record := range a.Records {
// 			recordsToReturn = append(recordsToReturn, Record{
// 				ID: record.ID,
// 				Coordinates: Point{
// 					X: record.Position.P.X,
// 					Y: record.Position.P.Y,
// 				},
// 			})
// 		}

// 		activityResult := Activity{
// 			ID:           a.ID,
// 			CreatedAt:    a.CreatedAt.Time,
// 			Distance:     distanceResult.Float64,
// 			ActivityName: a.ActivityName,
// 			AvgSpeed:     avgSpeedResult.Float64,
// 			MaxSpeed:     maxSpeedResult.Float64,
// 			ElapsedTime:  formatTimeToHHMM(time.Duration(a.ElapsedTime.Microseconds)),
// 			TotalTime:    formatTimeToHHMM(time.Duration(a.TotalTime.Microseconds)),
// 			Records:      recordsToReturn,
// 		}

// 		activities = append(activities, &activityResult)

// 	}

// 	return activities, nil
// }

func formatTimeToHHMM(d time.Duration) string {
	// Get total hours and remaining minutes
	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60

	// Format to HH:MM
	return fmt.Sprintf("%02d:%02d", hours, minutes)
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
