package repositories

import (
	"context"
)

type ActivityRepository interface {
	CreateActivity(ctx context.Context, params CreateActivityParams) (Activity, error)
	GetActivities(ctx context.Context) ([]Activity, error)
	GetActivity(ctx context.Context, id int32) (GetActivityRow, error)
	GetActivityAndRecords(ctx context.Context, id int32) (ActivityWithRecordsView, error)
}

type activityRepository struct {
	Queries *Queries
}

func NewActivityRepository(queries *Queries) ActivityRepository {
	return &activityRepository{
		Queries: queries,
	}
}

func (ar *activityRepository) CreateActivity(ctx context.Context, params CreateActivityParams) (Activity, error) {
	return ar.Queries.CreateActivity(ctx, params)
}

func (ar *activityRepository) GetActivities(ctx context.Context) ([]Activity, error) {
	return ar.Queries.GetActivities(ctx)
}

func (ar *activityRepository) GetActivity(ctx context.Context, id int32) (GetActivityRow, error) {
	return ar.Queries.GetActivity(ctx, id)
}

func (ar *activityRepository) GetActivityAndRecords(ctx context.Context, id int32) (ActivityWithRecordsView, error) {
	return ar.Queries.activity_with_records_view(ctx, id)
}
