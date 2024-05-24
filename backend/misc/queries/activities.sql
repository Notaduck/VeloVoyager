-- name: GetActivity :one
SELECT 
    a.*,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
FROM activities a
WHERE id = $1 LIMIT 1;

-- name: GetActivities :many
SELECT 
activity_name,
activity_name,
total_time,
distance,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
 FROM activities
WHERE user_id = $1;

-- name: GetActivityWithRecordsView :one
SELECT *
FROM activity_with_records_view
WHERE id = $1;

-- name: CreateActivity :one
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
RETURNING id; 