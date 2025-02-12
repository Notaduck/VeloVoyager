// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.25.0
// source: copyfrom.go

package db

import (
	"context"
)

// iteratorForCreateRecords implements pgx.CopyFromSource.
type iteratorForCreateRecords struct {
	rows                 []CreateRecordsParams
	skippedFirstNextCall bool
}

func (r *iteratorForCreateRecords) Next() bool {
	if len(r.rows) == 0 {
		return false
	}
	if !r.skippedFirstNextCall {
		r.skippedFirstNextCall = true
		return true
	}
	r.rows = r.rows[1:]
	return len(r.rows) > 0
}

func (r iteratorForCreateRecords) Values() ([]interface{}, error) {
	return []interface{}{
		r.rows[0].TimeStamp,
		r.rows[0].Position,
		r.rows[0].Altitude,
		r.rows[0].HeartRate,
		r.rows[0].Cadence,
		r.rows[0].Distance,
		r.rows[0].Speed,
		r.rows[0].Temperature,
		r.rows[0].GpsAccuracy,
		r.rows[0].EnhancedAltitude,
		r.rows[0].ActivityID,
		r.rows[0].Bearing,
	}, nil
}

func (r iteratorForCreateRecords) Err() error {
	return nil
}

func (q *Queries) CreateRecords(ctx context.Context, arg []CreateRecordsParams) (int64, error) {
	return q.db.CopyFrom(ctx, []string{"records"}, []string{"time_stamp", "position", "altitude", "heart_rate", "cadence", "distance", "speed", "temperature", "gps_accuracy", "enhanced_altitude", "activity_id", "bearing"}, &iteratorForCreateRecords{rows: arg})
}
