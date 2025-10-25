CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_of_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    centroid Point NOT NULL DEFAULT '(0,0)',
    distance NUMERIC NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    avg_speed NUMERIC NOT NULL,
    max_speed NUMERIC NOT NULL,
    ride_type TEXT NOT NULL DEFAULT 'road',
    elapsed_time INTERVAL NOT NULL,
    total_time INTERVAL NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_id_user_id" ON "activities" ("id", "user_id");
