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
    weather_impact,
    headwind,
    longest_headwind,
    air_speed,
    temp

) VALUES (
    $1, 
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12
)
RETURNING id
`

type CreateActivityParams struct {
	UserID          string
	Distance        pgtype.Numeric
	ActivityName    string
	AvgSpeed        pgtype.Numeric
	MaxSpeed        pgtype.Numeric
	ElapsedTime     pgtype.Time
	TotalTime       pgtype.Time
	WeatherImpact   pgtype.Numeric
	Headwind        int32
	LongestHeadwind pgtype.Time
	AirSpeed        pgtype.Numeric
	Temp            pgtype.Numeric
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
		arg.WeatherImpact,
		arg.Headwind,
		arg.LongestHeadwind,
		arg.AirSpeed,
		arg.Temp,
	)
	var id int32
	err := row.Scan(&id)
	return id, err
}

const getActivities = `-- name: GetActivities :many
SELECT 
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
	ActivityName    string
	ActivityName_2  string
	TotalTime       pgtype.Time
	Distance        pgtype.Numeric
	ElapsedTimeChar string
	TotalTimeChar   string
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
    a.id, a.created_at, a.user_id, a.distance, a.activity_name, a.avg_speed, a.max_speed, a.elapsed_time, a.total_time, a.weather_impact, a.headwind, a.longest_headwind, a.air_speed, a.temp,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
FROM activities a
WHERE id = $1 LIMIT 1
`

type GetActivityRow struct {
	ID              int32
	CreatedAt       pgtype.Timestamptz
	UserID          string
	Distance        pgtype.Numeric
	ActivityName    string
	AvgSpeed        pgtype.Numeric
	MaxSpeed        pgtype.Numeric
	ElapsedTime     pgtype.Time
	TotalTime       pgtype.Time
	WeatherImpact   pgtype.Numeric
	Headwind        int32
	LongestHeadwind pgtype.Time
	AirSpeed        pgtype.Numeric
	Temp            pgtype.Numeric
	ElapsedTimeChar string
	TotalTimeChar   string
}

func (q *Queries) GetActivity(ctx context.Context, id int32) (GetActivityRow, error) {
	row := q.db.QueryRow(ctx, getActivity, id)
	var i GetActivityRow
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
		&i.WeatherImpact,
		&i.Headwind,
		&i.LongestHeadwind,
		&i.AirSpeed,
		&i.Temp,
		&i.ElapsedTimeChar,
		&i.TotalTimeChar,
	)
	return i, err
}

const getActivityStats = `-- name: GetActivityStats :one
SELECT 
    -- Current month total
    SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN value ELSE 0 END) AS total_for_current_month,

    -- Last month total
    SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN value ELSE 0 END) AS total_for_last_month,

    -- Current week total
    SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE) THEN value ELSE 0 END) AS total_for_current_week,

    -- Last week total
    SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN value ELSE 0 END) AS total_for_last_week,

    -- Percentage difference from last month
    COALESCE((SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN value ELSE 0 END) -
    SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN value ELSE 0 END)) / 
    NULLIF(SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 MONTH', 'YYYY-MM') THEN value ELSE 0 END), 0) * 100, 0) AS percentage_change_month,

    -- Percentage difference from last week
    COALESCE((SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE) THEN value ELSE 0 END) -
    SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN value ELSE 0 END)) / 
    NULLIF(SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 WEEK') THEN value ELSE 0 END), 0) * 100, 0) AS percentage_change_week
FROM activities
WHERE user_id = $1
`

type GetActivityStatsRow struct {
	TotalForCurrentMonth  int64
	TotalForLastMonth     int64
	TotalForCurrentWeek   int64
	TotalForLastWeek      int64
	PercentageChangeMonth interface{}
	PercentageChangeWeek  interface{}
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
