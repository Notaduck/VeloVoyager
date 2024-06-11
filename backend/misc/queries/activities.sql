-- name: GetActivity :one
SELECT 
    a.*,
    a.date_of_activity,
    TO_CHAR(elapsed_time, 'HH24:MI:SS') as elapsed_time_char,
    TO_CHAR(total_time, 'HH24:MI:SS') as total_time_char
FROM activities a
WHERE id = $1 LIMIT 1;

-- name: GetActivities :many
SELECT 
id,
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
RETURNING id; 

-- name: GetActivityStats :one
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
WHERE user_id = $1;

-- name: UpdateActivityname :one
UPDATE activities 
SET activity_name = $1
WHERE 
    id = $2 
    AND user_id = $3
RETURNING *;