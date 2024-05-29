ALTER TABLE activities DROP COLUMN IF EXISTS activity_name;

ALTER TABLE activities DROP COLUMN IF EXISTS avg_speed;
ALTER TABLE activities DROP COLUMN IF EXISTS max_speed;

ALTER TABLE activities DROP COLUMN IF EXISTS elapsed_time;
ALTER TABLE activities DROP COLUMN IF EXISTS total_time;

ALTER TABLE activities DROP COLUMN IF EXISTS distance;
