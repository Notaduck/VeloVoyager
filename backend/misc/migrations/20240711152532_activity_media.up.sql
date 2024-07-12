
CREATE TABLE activity_media (
    id SERIAL,
    location VARCHAR(255),
    user_id UUID REFERENCES auth.users NOT NULL,
    PRIMARY KEY(id),
    activity_id INTEGER REFERENCES activities (id) ON DELETE CASCADE
)