package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/notaduck/backend/internal/storage"
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
	GetSingleActivityById(ctx context.Context, activityId int64) (*storage.Activity, error)
}

type ActivityServiceImp struct {
	storage *storage.Queries
}

func NewActivityService(storage *storage.Queries) *ActivityServiceImp {
	return &ActivityServiceImp{
		storage: storage,
	}
}

func (s *ActivityServiceImp) GetSingleActivityById(ctx context.Context, activityId int32, userId []byte) (*Activity, error) {

	activityEntity, err := s.storage.GetActivityAndRecords(ctx, activityId)

	if err != nil {
		slog.Error("failed to retrieve activity", "activityId", activityId, "error", err)
		return nil, err // Properly handle the error by returning it.
	}

	// check if the user owns the activity
	// if tmp2 != tmp {
	// 	slog.Error("activity does not belong to the user")
	// 	return nil, errors.New(fmt.Sprintf("activity %d does not belong to the user %s", activityEntity.ID, string(userId)))

	// }

	maxSpeed, err := activityEntity.MaxSpeed.Float64Value()
	if err != nil {
		slog.Error("failed to parse max speed", "error", err)
		return nil, err
	}

	avgSpeed, err := activityEntity.AvgSpeed.Float64Value()
	if err != nil {
		slog.Error("failed to parse avg speed", "error", err)
		return nil, err
	}

	activity := Activity{
		ID:           activityEntity.ID,
		ActivityName: activityEntity.ActivityName,
		AvgSpeed:     avgSpeed.Float64,
		MaxSpeed:     maxSpeed.Float64,
		ElapsedTime:  activityEntity.ElapsedTimeChar,
		TotalTime:    activityEntity.TotalTimeChar,
	}

	records, err := s.storage.GetRecords(ctx, pgtype.Int4{Valid: true, Int32: activity.ID})

	for _, record := range records {
		activity.Records = append(activity.Records, Record{ID: record.ID, Coordinates: Point{X: record.Position.P.X, Y: record.Position.P.Y}})
	}

	return &activity, nil
}
