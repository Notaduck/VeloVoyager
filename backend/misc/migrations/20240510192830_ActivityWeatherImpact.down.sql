ALTER TABLE activities 
DROP COLUMN IF EXISTS weather_impact;

ALTER TABLE activities 
DROP COLUMN IF EXISTS headwind;

ALTER TABLE activities 
DROP COLUMN IF EXISTS longest_headwind;

ALTER TABLE activities 
DROP COLUMN IF EXISTS air_speed;

ALTER TABLE activities 
DROP COLUMN IF EXISTS temp;


ALTER TABLE records 
DROP COLUMN IF EXISTS bearing;
