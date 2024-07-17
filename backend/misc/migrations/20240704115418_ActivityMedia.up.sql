CREATE TABLE activity_media (
    id SERIAL PRIMARY KEY,
    activity_id INT,
    location VARCHAR(256),
    CONSTRAINT fk_activity
      FOREIGN KEY (activity_id) 
        REFERENCES activity(activity_id)
);
