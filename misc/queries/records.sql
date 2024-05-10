-- name: CreateRecords :copyfrom
INSERT INTO records (
    time_stamp, 
    position, 
    altitude, 
    heart_rate, 
    cadence, 
    distance, 
    speed, 
    temperature, 
    gps_accuracy, 
    enhanced_altitude, 
    activity_id
) 
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: GetRecords :many
SELECT *
FROM records
WHERE activity_id = $1;