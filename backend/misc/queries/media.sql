-- name: CreateMedia :copyfrom
INSERT INTO activity_media (
    location,
    activity_id,
    user_id
) 
VALUES ($1, $2, $3);