package repositories

import (
	"context"
)

// ActivityRepository defines the interface for interacting with the activities storage.
type ActivityRepository interface {
	CreateActivity(ctx context.Context, params CreateActivityParams) (Activity, error)
	GetActivities(ctx context.Context) ([]Activity, error)
	GetActivity(ctx context.Context, id int32) (Activity, error)
	GetActivityAndRecords(ctx context.Context, id int32) (GetActivityAndRecordsRow, error)
}

// activityRepository implements ActivityRepository using sqlc generated methods.
type activityRepository struct {
	Queries *Queries // This field embeds the sqlc generated Queries struct
}

// NewActivityRepository returns a new instance of a postgres activity repository.
func NewActivityRepository(queries *Queries) ActivityRepository {
	return &activityRepository{
		Queries: queries,
	}
}

// CreateActivity implements the method to create a new activity.
func (ar *activityRepository) CreateActivity(ctx context.Context, params CreateActivityParams) (Activity, error) {
	return ar.Queries.CreateActivity(ctx, params)
}

// GetActivities implements the method to retrieve all activities.
func (ar *activityRepository) GetActivities(ctx context.Context) ([]Activity, error) {
	return ar.Queries.GetActivities(ctx)
}

// GetActivity implements the method to retrieve a specific activity by ID.
func (ar *activityRepository) GetActivity(ctx context.Context, id int32) (Activity, error) {
	return ar.Queries.GetActivity(ctx, id)
}

// GetActivityAndRecords implements the method to retrieve a specific activity and its formatted records by ID.
func (ar *activityRepository) GetActivityAndRecords(ctx context.Context, id int32) (GetActivityAndRecordsRow, error) {
	return ar.Queries.GetActivityAndRecords(ctx, id)
}
