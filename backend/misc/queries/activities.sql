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
<<<<<<< HEAD
RETURNING id; 

-- name: GetActivityStats :one
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
WHERE user_id = $1;
=======
RETURNING id; 
>>>>>>> 18a65a7d86d3d862ead054a45196507020f46084
