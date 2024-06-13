// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.26.0
// source: records.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

type CreateRecordsParams struct {
	TimeStamp        pgtype.Timestamptz `json:"timeStamp"`
	Position         pgtype.Point       `json:"position"`
	Altitude         pgtype.Int4        `json:"altitude"`
	HeartRate        pgtype.Int2        `json:"heartRate"`
	Cadence          pgtype.Int2        `json:"cadence"`
	Distance         pgtype.Int4        `json:"distance"`
	Speed            pgtype.Int4        `json:"speed"`
	Temperature      pgtype.Int2        `json:"temperature"`
	GpsAccuracy      pgtype.Int2        `json:"gpsAccuracy"`
	EnhancedAltitude pgtype.Int4        `json:"enhancedAltitude"`
	ActivityID       pgtype.Int4        `json:"activityId"`
}

const getRecords = `-- name: GetRecords :many
SELECT id, time_stamp, position, altitude, heart_rate, cadence, distance, speed, temperature, gps_accuracy, enhanced_altitude, activity_id
FROM records
WHERE activity_id = $1
`

func (q *Queries) GetRecords(ctx context.Context, activityID pgtype.Int4) ([]Record, error) {
	rows, err := q.db.Query(ctx, getRecords, activityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Record
	for rows.Next() {
		var i Record
		if err := rows.Scan(
			&i.ID,
			&i.TimeStamp,
			&i.Position,
			&i.Altitude,
			&i.HeartRate,
			&i.Cadence,
			&i.Distance,
			&i.Speed,
			&i.Temperature,
			&i.GpsAccuracy,
			&i.EnhancedAltitude,
			&i.ActivityID,
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
