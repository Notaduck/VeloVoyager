DROP VIEW IF EXISTS activity_with_records_view;

CREATE VIEW activity_with_records_view AS 
SELECT 
    a.id,
    a.created_at,
    a.user_id,
    a.distance,
    a.activity_name,
    a.avg_speed,
    a.max_speed,
    a.elapsed_time::interval AS elapsed_time,
    a.total_time::interval AS total_time,
    TO_CHAR(a.elapsed_time::time, 'HH24:MI:SS') AS elapsed_time_char,
    TO_CHAR(a.total_time::time, 'HH24:MI:SS') AS total_time_char,
    JSON_AGG(r.* ORDER BY r.time_stamp) AS records
FROM activities a
JOIN records r ON r.activity_id = a.id
GROUP BY 
    a.id, 
    a.created_at,
    a.user_id,
    a.distance,
    a.activity_name,
    a.avg_speed,
    a.max_speed,
    a.elapsed_time,
    a.total_time;
