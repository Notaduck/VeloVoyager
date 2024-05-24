CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users NOT NULL  
);  

CREATE INDEX IF NOT EXISTS "idx_id_user_id" ON "activities" ("id","user_id");