-- name: GetActivity :one
SELECT * FROM activities 
WHERE id = $1 LIMIT 1;


-- name: GetActivityAndRecords :one
SELECT  *,
        TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
        TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
FROM activities 
WHERE activities.id = $1;

-- name: GetActivities :many
SELECT * FROM activities;


-- name: CreateActivity :one
INSERT INTO activities (
    user_id, 
    distance,
    activity_name,
		avg_speed,
		max_speed,
		elapsed_time,
		total_time
) VALUES (
    $1, 
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING *;