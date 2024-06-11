package repositories

import (
	"context"

	"github.com/notaduck/backend/internal/db"
)

type ActivityRepository interface {
	CreateActivity(ctx context.Context, params db.CreateActivityParams) (int32, error)
	UpdateActivity(ctx context.Context, params db.UpdateActivitynameParams) (db.Activity, error)
	GetActivities(ctx context.Context, userId string) ([]db.GetActivitiesRow, error)
	GetActivity(ctx context.Context, id int32) (db.GetActivityRow, error)
	GetActivityAndRecords(ctx context.Context, id int32) (db.ActivityWithRecordsView, error)
	GetActivityStats(ctx context.Context, userId string) (db.GetActivityStatsRow, error)
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

func (ar *activityRepository) GetActivities(ctx context.Context, userId string) ([]db.GetActivitiesRow, error) {
	return ar.Queries.GetActivities(ctx, userId)
}

func (ar *activityRepository) GetActivity(ctx context.Context, id int32) (db.GetActivityRow, error) {
	return ar.Queries.GetActivity(ctx, id)
}

func (ar *activityRepository) GetActivityAndRecords(ctx context.Context, id int32) (db.ActivityWithRecordsView, error) {
	return ar.Queries.GetActivityWithRecordsView(ctx, id)
}

func (ar *activityRepository) GetActivityStats(ctx context.Context, userId string) (db.GetActivityStatsRow, error) {
	return ar.Queries.GetActivityStats(ctx, userId)
}

func (ar *activityRepository) UpdateActivity(ctx context.Context, params db.UpdateActivitynameParams) (db.Activity, error) {
	return ar.Queries.UpdateActivityname(ctx, params)
}
