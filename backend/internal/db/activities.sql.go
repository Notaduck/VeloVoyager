// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.25.0
// source: activities.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createActivity = `-- name: CreateActivity :one
INSERT INTO activities (
    user_id, 
    distance,
    activity_name,
    avg_speed,
    max_speed,
    elapsed_time,
    total_time,
    date_of_activity

) VALUES (
    $1, 
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
)
RETURNING id
`

type CreateActivityParams struct {
	UserID         string             `json:"userId"`
	Distance       pgtype.Numeric     `json:"distance"`
	ActivityName   string             `json:"activityName"`
	AvgSpeed       pgtype.Numeric     `json:"avgSpeed"`
	MaxSpeed       pgtype.Numeric     `json:"maxSpeed"`
	ElapsedTime    pgtype.Time        `json:"elapsedTime"`
	TotalTime      pgtype.Time        `json:"totalTime"`
	DateOfActivity pgtype.Timestamptz `json:"dateOfActivity"`
}

func (q *Queries) CreateActivity(ctx context.Context, arg CreateActivityParams) (int32, error) {
	row := q.db.QueryRow(ctx, createActivity,
		arg.UserID,
		arg.Distance,
		arg.ActivityName,
		arg.AvgSpeed,
		arg.MaxSpeed,
		arg.ElapsedTime,
		arg.TotalTime,
		arg.DateOfActivity,
	)
	var id int32
	err := row.Scan(&id)
	return id, err
}

const getActivities = `-- name: GetActivities :many
SELECT 
id,
activity_name,
activity_name,
total_time,
distance,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
 FROM activities
WHERE user_id = $1
`

type GetActivitiesRow struct {
	ID              int32          `json:"id"`
	ActivityName    string         `json:"activityName"`
	ActivityName_2  string         `json:"activityName2"`
	TotalTime       pgtype.Time    `json:"totalTime"`
	Distance        pgtype.Numeric `json:"distance"`
	ElapsedTimeChar string         `json:"elapsedTimeChar"`
	TotalTimeChar   string         `json:"totalTimeChar"`
}

func (q *Queries) GetActivities(ctx context.Context, userID string) ([]GetActivitiesRow, error) {
	rows, err := q.db.Query(ctx, getActivities, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetActivitiesRow
	for rows.Next() {
		var i GetActivitiesRow
		if err := rows.Scan(
			&i.ID,
			&i.ActivityName,
			&i.ActivityName_2,
			&i.TotalTime,
			&i.Distance,
			&i.ElapsedTimeChar,
			&i.TotalTimeChar,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getActivity = `-- name: GetActivity :one
SELECT 
    a.id, a.created_at, a.date_of_activity, a.user_id, a.centroid, a.distance, a.activity_name, a.avg_speed, a.max_speed, a.elapsed_time, a.total_time,
    a.date_of_activity,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
FROM activities a
WHERE id = $1 LIMIT 1
`

type GetActivityRow struct {
	ID               int32              `json:"id"`
	CreatedAt        pgtype.Timestamptz `json:"createdAt"`
	DateOfActivity   pgtype.Timestamptz `json:"dateOfActivity"`
	UserID           string             `json:"userId"`
	Centroid         pgtype.Point       `json:"centroid"`
	Distance         pgtype.Numeric     `json:"distance"`
	ActivityName     string             `json:"activityName"`
	AvgSpeed         pgtype.Numeric     `json:"avgSpeed"`
	MaxSpeed         pgtype.Numeric     `json:"maxSpeed"`
	ElapsedTime      pgtype.Time        `json:"elapsedTime"`
	TotalTime        pgtype.Time        `json:"totalTime"`
	DateOfActivity_2 pgtype.Timestamptz `json:"dateOfActivity2"`
	ElapsedTimeChar  string             `json:"elapsedTimeChar"`
	TotalTimeChar    string             `json:"totalTimeChar"`
}

func (q *Queries) GetActivity(ctx context.Context, id int32) (GetActivityRow, error) {
	row := q.db.QueryRow(ctx, getActivity, id)
	var i GetActivityRow
	err := row.Scan(
		&i.ID,
		&i.CreatedAt,
		&i.DateOfActivity,
		&i.UserID,
		&i.Centroid,
		&i.Distance,
		&i.ActivityName,
		&i.AvgSpeed,
		&i.MaxSpeed,
		&i.ElapsedTime,
		&i.TotalTime,
		&i.DateOfActivity_2,
		&i.ElapsedTimeChar,
		&i.TotalTimeChar,
	)
	return i, err
}

const getActivityStats = `-- name: GetActivityStats :one
SELECT 
    -- Current month total
    ROUND(SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN distance ELSE 0 END), 2) AS total_for_current_month,

    -- Last month total
    ROUND(SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN distance ELSE 0 END), 2) AS total_for_last_month,

    -- Current week total
    ROUND(SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE) THEN distance ELSE 0 END), 2) AS total_for_current_week,

    -- Last week total
    ROUND(SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN distance ELSE 0 END), 2) AS total_for_last_week,

    -- Percentage difference from last month
    ROUND(
        COALESCE(
            (SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN distance ELSE 0 END) -
            SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN distance ELSE 0 END)) / 
            NULLIF(SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN distance ELSE 0 END), 0) * 100, 
            0
        ), 2
    ) AS percentage_change_month,

    -- Percentage difference from last week
    ROUND(
        COALESCE(
            (SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE) THEN distance ELSE 0 END) -
            SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN distance ELSE 0 END)) / 
            NULLIF(SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN distance ELSE 0 END), 0) * 100, 
            0
        ), 2
    ) AS percentage_change_week
FROM activities
WHERE user_id = $1
`

type GetActivityStatsRow struct {
	TotalForCurrentMonth  pgtype.Numeric `json:"totalForCurrentMonth"`
	TotalForLastMonth     pgtype.Numeric `json:"totalForLastMonth"`
	TotalForCurrentWeek   pgtype.Numeric `json:"totalForCurrentWeek"`
	TotalForLastWeek      pgtype.Numeric `json:"totalForLastWeek"`
	PercentageChangeMonth pgtype.Numeric `json:"percentageChangeMonth"`
	PercentageChangeWeek  pgtype.Numeric `json:"percentageChangeWeek"`
}

func (q *Queries) GetActivityStats(ctx context.Context, userID string) (GetActivityStatsRow, error) {
	row := q.db.QueryRow(ctx, getActivityStats, userID)
	var i GetActivityStatsRow
	err := row.Scan(
		&i.TotalForCurrentMonth,
		&i.TotalForLastMonth,
		&i.TotalForCurrentWeek,
		&i.TotalForLastWeek,
		&i.PercentageChangeMonth,
		&i.PercentageChangeWeek,
	)
	return i, err
}

const getActivityWithRecordsView = `-- name: GetActivityWithRecordsView :one
SELECT id, created_at, user_id, distance, activity_name, avg_speed, max_speed, elapsed_time, total_time, elapsed_time_char, total_time_char, records
FROM activity_with_records_view
WHERE id = $1
`

func (q *Queries) GetActivityWithRecordsView(ctx context.Context, id int32) (ActivityWithRecordsView, error) {
	row := q.db.QueryRow(ctx, getActivityWithRecordsView, id)
	var i ActivityWithRecordsView
	err := row.Scan(
		&i.ID,
		&i.CreatedAt,
		&i.UserID,
		&i.Distance,
		&i.ActivityName,
		&i.AvgSpeed,
		&i.MaxSpeed,
		&i.ElapsedTime,
		&i.TotalTime,
		&i.ElapsedTimeChar,
		&i.TotalTimeChar,
		&i.Records,
	)
	return i, err
}

const updateActivity = `-- name: UpdateActivity :one
WITH updated_activity AS (
    UPDATE activities 
    SET activity_name = $1
    WHERE 
        activities.id = $2 
        AND activities.user_id = $3
    RETURNING activities.id
)
SELECT id, created_at, user_id, distance, activity_name, avg_speed, max_speed, elapsed_time, total_time, elapsed_time_char, total_time_char, records
FROM activity_with_records_view awrv
WHERE awrv.id = (SELECT updated_activity.id FROM updated_activity)
`

type UpdateActivityParams struct {
	ActivityName string `json:"activityName"`
	ID           int32  `json:"id"`
	UserID       string `json:"userId"`
}

func (q *Queries) UpdateActivity(ctx context.Context, arg UpdateActivityParams) (ActivityWithRecordsView, error) {
	row := q.db.QueryRow(ctx, updateActivity, arg.ActivityName, arg.ID, arg.UserID)
	var i ActivityWithRecordsView
	err := row.Scan(
		&i.ID,
		&i.CreatedAt,
		&i.UserID,
		&i.Distance,
		&i.ActivityName,
		&i.AvgSpeed,
		&i.MaxSpeed,
		&i.ElapsedTime,
		&i.TotalTime,
		&i.ElapsedTimeChar,
		&i.TotalTimeChar,
		&i.Records,
	)
	return i, err
}

const updateActivityname = `-- name: UpdateActivityname :one
UPDATE activities 
SET activity_name = $1
WHERE 
    id = $2 
    AND user_id = $3
RETURNING id, created_at, date_of_activity, user_id, centroid, distance, activity_name, avg_speed, max_speed, elapsed_time, total_time
`

type UpdateActivitynameParams struct {
	ActivityName string `json:"activityName"`
	ID           int32  `json:"id"`
	UserID       string `json:"userId"`
}

func (q *Queries) UpdateActivityname(ctx context.Context, arg UpdateActivitynameParams) (Activity, error) {
	row := q.db.QueryRow(ctx, updateActivityname, arg.ActivityName, arg.ID, arg.UserID)
	var i Activity
	err := row.Scan(
		&i.ID,
		&i.CreatedAt,
		&i.DateOfActivity,
		&i.UserID,
		&i.Centroid,
		&i.Distance,
		&i.ActivityName,
		&i.AvgSpeed,
		&i.MaxSpeed,
		&i.ElapsedTime,
		&i.TotalTime,
	)
	return i, err
}
