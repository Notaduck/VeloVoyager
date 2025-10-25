package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"math"
	"mime/multipart"
	"path/filepath"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"
	"github.com/tormoder/fit"

	"github.com/notaduck/backend/internal/db"
	"github.com/notaduck/backend/internal/repositories"
	"github.com/notaduck/backend/utils"
)

type Activity struct {
	ID              int32         `json:"id"`
	CreatedAt       time.Time     `json:"createdAt"`
	Distance        float64       `json:"distance"`
	ActivityName    string        `json:"activityName"`
	AvgSpeed        float64       `json:"avgSpeed"`
	MaxSpeed        float64       `json:"maxSpeed"`
	RideType        string        `json:"rideType"`
	AvgHeartRate    *float64      `json:"avgHeartRate,omitempty"`
	MaxHeartRate    *float64      `json:"maxHeartRate,omitempty"`
	AvgCadence      *float64      `json:"avgCadence,omitempty"`
	MaxCadence      *float64      `json:"maxCadence,omitempty"`
	ElapsedTime     string        `json:"elapsedTime"`
	TotalTime       string        `json:"totalTime"`
	ElapsedDuration time.Duration `json:"-"`
	TotalDuration   time.Duration `json:"-"`
	Records         []Record      `json:"records"`
}

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Record struct {
	ID          int32     `json:"id"`
	Coordinates Point     `json:"coordinates"`
	Speed       float64   `json:"speed"`
	TimeStamp   time.Time `json:"timeStamp"`
	Distance    int32     `json:"distance"`
	HeartRate   int16     `json:"heartRate"`
	Cadence     int16     `json:"cadence"`
}

type ActivityFilePayload struct {
	Filename     string
	ContentType  string
	Data         []byte
	LastModified time.Time
}

type ActivitySummary struct {
	ID              int32         `json:"id"`
	ActivityName    string        `json:"activityName"`
	Distance        float64       `json:"distance"`
	ElapsedTime     string        `json:"elapsedTime"`
	TotalTime       string        `json:"totalTime"`
	ElapsedDuration time.Duration `json:"-"`
	TotalDuration   time.Duration `json:"-"`
}

type ActivityService interface {
	UpdateActivity(ctx context.Context, activityData db.UpdateActivityParams) (*Activity, error)
	GetSingleActivityById(ctx context.Context, activityId int32, userId string) (*Activity, error)
	GetActivities(ctx context.Context, userId string) ([]ActivitySummary, error)
	CreateActivities(ctx context.Context, files []*multipart.FileHeader, userID string) ([]*Activity, error)
	CreateActivitiesFromBytes(ctx context.Context, files []ActivityFilePayload, userID string) ([]*Activity, error)
	GetActivityStats(ctx context.Context, userID string) (*db.GetActivityStatsRow, error)
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

func (s *activityService) GetActivities(ctx context.Context, userId string) ([]ActivitySummary, error) {

	activities, err := s.activityRepo.GetActivities(ctx, userId)

	if err != nil {
		slog.Error("failed to retrieve activities", "error", err)
		return nil, err
	}

	return convertActivitySummaries(activities), nil
}

func (s *activityService) UpdateActivity(ctx context.Context, activityData db.UpdateActivityParams) (*Activity, error) {
	name := ""
	if activityData.ActivityName.Valid {
		name = activityData.ActivityName.String
	}
	rideType := ""
	if activityData.RideType.Valid {
		rideType = activityData.RideType.String
	}

	slog.Info("updating activity",
		slog.Int("id", int(activityData.ID)),
		slog.String("userID", activityData.UserID),
		slog.String("activityName", name),
		slog.String("rideType", rideType),
	)

	activity, err := s.activityRepo.UpdateActivity(ctx, activityData)
	if err != nil {
		return nil, err
	}

	activityDetails := convertActivityEntityToDomainModel(&activity)

	return activityDetails, nil
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

	errorCh := make(chan error, len(files))
	activityCh := make(chan *Activity, len(files))
	var wg sync.WaitGroup

	for _, fileHeader := range files {
		wg.Add(1)
		go func(fh *multipart.FileHeader) {
			defer wg.Done()

			activity, err := s.processFitFile(ctx, fh, userId)
			if err != nil {
				errorCh <- err
				return
			}
			activityCh <- activity

		}(fileHeader)
	}

	wg.Wait()
	close(activityCh)
	close(errorCh)

	for activity := range activityCh {
		activities = append(activities, activity)
	}

	if len(errorCh) > 0 {
		return nil, <-errorCh
	}

	return activities, nil
}

func (s *activityService) CreateActivitiesFromBytes(ctx context.Context, files []ActivityFilePayload, userId string) ([]*Activity, error) {
	activities := make([]*Activity, 0, len(files))

	for _, file := range files {
		if len(file.Data) == 0 {
			return nil, fmt.Errorf("file %q has no data", file.Filename)
		}

		reader := bytes.NewReader(file.Data)
		activity, err := s.processFitData(ctx, reader, file.Filename, userId)
		if err != nil {
			return nil, err
		}

		activities = append(activities, activity)
	}

	return activities, nil
}

func (s *activityService) processFitFile(ctx context.Context, fileHeader *multipart.FileHeader, userId string) (*Activity, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return s.processFitData(ctx, file, fileHeader.Filename, userId)
}

func (s *activityService) processFitData(ctx context.Context, reader io.Reader, filename string, userId string) (*Activity, error) {
	if filepath.Ext(filename) != ".fit" {
		return nil, fmt.Errorf("invalid file type: only .fit files are allowed")
	}

	fit, err := fit.Decode(reader)
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

	totalRideDuration := time.Duration(activity.Sessions[0].TotalElapsedTime) * time.Microsecond
	elapsedDuration := time.Duration(activity.Sessions[0].TotalTimerTime) * time.Microsecond

	dateOfActivity := pgtype.Timestamptz{
		Time:  activity.Activity.LocalTimestamp,
		Valid: true,
	}

	activityId, err := s.activityRepo.CreateActivity(ctx, db.CreateActivityParams{
		Distance:       stats.Distance,
		UserID:         userId,
		TotalTime:      totalRideDuration,
		ElapsedTime:    elapsedDuration,
		AvgSpeed:       stats.AvgSpeed,
		MaxSpeed:       stats.MaxSpeed,
		RideType:       "road",
		ActivityName:   getActivityName(activity.Activity.LocalTimestamp),
		DateOfActivity: dateOfActivity,
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

	stats.AvgSpeed = decimal.NewFromFloat(avgSpeedKmH)
	stats.MaxSpeed = decimal.NewFromFloat(maxSpeedKmH)
	stats.Distance = decimal.NewFromFloat(distance)

	return recordEntities, &stats, nil
}

func (s *activityService) GetActivityStats(ctx context.Context, userId string) (*db.GetActivityStatsRow, error) {
	stats, err := s.activityRepo.GetActivityStats(ctx, userId)

	if err != nil {
		slog.Error("failed to get stats", slog.String("err", err.Error()))
		return nil, err
	}

	return &stats, nil

}

func convertActivityEntityToDomainModel(activityEntity *db.ActivityWithRecordsView) *Activity {
	avgHeartRate, maxHeartRate, avgCadence, maxCadence := calculateAggregateMetrics(activityEntity.Records)

	activity := &Activity{
		ID:              activityEntity.ID,
		CreatedAt:       activityEntity.CreatedAt.Time,
		Distance:        activityEntity.Distance.InexactFloat64(),
		ActivityName:    activityEntity.ActivityName,
		AvgSpeed:        activityEntity.AvgSpeed.InexactFloat64(),
		MaxSpeed:        activityEntity.MaxSpeed.InexactFloat64(),
		RideType:        activityEntity.RideType,
		ElapsedTime:     activityEntity.ElapsedTimeChar,
		TotalTime:       activityEntity.TotalTimeChar,
		AvgHeartRate:    avgHeartRate,
		MaxHeartRate:    maxHeartRate,
		AvgCadence:      avgCadence,
		MaxCadence:      maxCadence,
		ElapsedDuration: activityEntity.ElapsedTime,
		TotalDuration:   activityEntity.TotalTime,
		Records:         convertRecords(activityEntity.Records),
	}
	return activity
}

func calculateAggregateMetrics(records []db.Record) (avgHeartRate, maxHeartRate, avgCadence, maxCadence *float64) {
	var (
		heartRateSum  float64
		heartRateMax  float64
		heartRateCnt  int
		heartRateSeen bool

		cadenceSum  float64
		cadenceMax  float64
		cadenceCnt  int
		cadenceSeen bool
	)

	for _, record := range records {
		if record.HeartRate.Valid {
			val := float64(record.HeartRate.Int16)
			heartRateSum += val
			heartRateCnt++
			if !heartRateSeen || val > heartRateMax {
				heartRateMax = val
				heartRateSeen = true
			}
		}

		if record.Cadence.Valid {
			val := float64(record.Cadence.Int16)
			cadenceSum += val
			cadenceCnt++
			if !cadenceSeen || val > cadenceMax {
				cadenceMax = val
				cadenceSeen = true
			}
		}
	}

	if heartRateCnt > 0 {
		avg := heartRateSum / float64(heartRateCnt)
		avgHeartRate = &avg
	}
	if heartRateSeen {
		max := heartRateMax
		maxHeartRate = &max
	}
	if cadenceCnt > 0 {
		avg := cadenceSum / float64(cadenceCnt)
		avgCadence = &avg
	}
	if cadenceSeen {
		max := cadenceMax
		maxCadence = &max
	}

	return
}

func convertActivitySummaries(activityEntities []db.GetActivitiesRow) []ActivitySummary {
	summaries := make([]ActivitySummary, len(activityEntities))
	for i, activity := range activityEntities {
		summaries[i] = ActivitySummary{
			ID:              activity.ID,
			ActivityName:    activity.ActivityName,
			Distance:        activity.Distance.InexactFloat64(),
			ElapsedTime:     activity.ElapsedTimeChar,
			TotalTime:       activity.TotalTimeChar,
			ElapsedDuration: activity.ElapsedTime,
			TotalDuration:   activity.TotalTime,
		}
	}
	return summaries
}

func convertRecords(recordEntities []db.Record) []Record {
	records := make([]Record, len(recordEntities))
	for i, record := range recordEntities {
		var heartRate int16
		if record.HeartRate.Valid {
			heartRate = record.HeartRate.Int16
		} else {
			heartRate = 0 // or handle NULL case appropriately
		}

		var cadence int16
		if record.Cadence.Valid {
			cadence = record.Cadence.Int16
		} else {
			cadence = 0 // or handle NULL case appropriately
		}

		records[i] = Record{
			ID:        record.ID,
			Speed:     utils.ConvertSpeed(record.Speed.Int32),
			TimeStamp: record.TimeStamp.Time,
			HeartRate: heartRate,
			Distance:  record.Distance.Int32,
			Cadence:   cadence,
			Coordinates: Point{
				X: record.Position.P.X,
				Y: record.Position.P.Y,
			},
		}
	}
	return records
}

func convertNumericToFloat64(n pgtype.Numeric) float64 {
	val, err := n.Float64Value()

	if err != nil {
		return 0.0
	}
	return val.Float64
}

type ActivityStats struct {
	Distance    decimal.Decimal
	TotalTime   pgtype.Time
	ElapsedTime pgtype.Time
	AvgSpeed    decimal.Decimal
	MaxSpeed    decimal.Decimal
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
