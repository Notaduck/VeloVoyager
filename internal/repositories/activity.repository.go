package repositories

import (
	"context"

	"github.com/notaduck/backend/internal/db"
)

type ActivityRepository interface {
	CreateActivity(ctx context.Context, params db.CreateActivityParams) (int32, error)
	GetActivities(ctx context.Context) ([]db.Activity, error)
	GetActivity(ctx context.Context, id int32) (db.GetActivityRow, error)
	GetActivityAndRecords(ctx context.Context, id int32) (db.ActivityWithRecordsView, error)
}

type activityRepository struct {
	Queries *db.Queries
}

func NewActivityRepository(queries *db.Queries) ActivityRepository {
	return &activityRepository{
		Queries: queries,
	}
}

func (ar *activityRepository) CreateActivity(ctx context.Context, params db.CreateActivityParams) (int32, error) {
	return ar.Queries.CreateActivity(ctx, params)
}

func (ar *activityRepository) GetActivities(ctx context.Context) ([]db.Activity, error) {
	return ar.Queries.GetActivities(ctx)
}

func (ar *activityRepository) GetActivity(ctx context.Context, id int32) (db.GetActivityRow, error) {
	return ar.Queries.GetActivity(ctx, id)
}

func (ar *activityRepository) GetActivityAndRecords(ctx context.Context, id int32) (db.ActivityWithRecordsView, error) {
	return ar.Queries.GetActivityWithRecordsView(ctx, id)
}
