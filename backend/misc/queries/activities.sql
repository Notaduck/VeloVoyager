-- name: GetActivity :one
SELECT 
    a.id,
    a.created_at,
    a.date_of_activity,
    a.user_id,
    a.centroid,
    a.distance,
    a.activity_name,
    a.avg_speed,
    a.max_speed,
    a.elapsed_time::interval AS elapsed_time,
    a.total_time::interval AS total_time,
    TO_CHAR(a.elapsed_time::time, 'HH24:MI:SS') AS elapsed_time_char,
    TO_CHAR(a.total_time::time, 'HH24:MI:SS') AS total_time_char
FROM activities a
WHERE a.id = $1
LIMIT 1;

-- name: GetActivities :many
SELECT 
    id,
    activity_name,
    distance,
    elapsed_time::interval AS elapsed_time,
    total_time::interval AS total_time,
    TO_CHAR(elapsed_time::time, 'HH24:MI:SS') AS elapsed_time_char,
    TO_CHAR(total_time::time, 'HH24:MI:SS') AS total_time_char
FROM activities
WHERE user_id = $1
ORDER BY date_of_activity DESC;

-- name: GetActivityWithRecordsView :one
SELECT 
    id,
    created_at,
    user_id,
    distance,
    activity_name,
    avg_speed,
    max_speed,
    elapsed_time,
    total_time,
    elapsed_time_char,
    total_time_char,
    records
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
RETURNING 
    id,
    created_at,
    date_of_activity,
    user_id,
    centroid,
    distance,
    activity_name,
    avg_speed,
    max_speed,
    elapsed_time::interval AS elapsed_time,
    total_time::interval AS total_time;

-- name: UpdateActivity :one
WITH updated_activity AS (
    UPDATE activities 
    SET activity_name = $1
    WHERE 
        activities.id = $2 
        AND activities.user_id = $3
    RETURNING activities.id
)
SELECT *
FROM activity_with_records_view awrv
WHERE awrv.id = (SELECT updated_activity.id FROM updated_activity);
