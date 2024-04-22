CREATE TABLE records (
    id              SERIAL PRIMARY KEY,
    time_stamp TIMESTAMP WITH TIME ZONE ,
    position POINT,
    altitude INTEGER,
    heart_rate SMALLINT,
    cadence SMALLINT,
    distance INTEGER,
    speed INTEGER,
    -- power INTEGER,
    -- time_from_course BIGINT,
    temperature SMALLINT,
    gps_accuracy SMALLINT,
    -- vertical_speed SMALLINT,
    -- calories INTEGER,
    -- vertical_oscillation INTEGER,
    -- stance_time_percent INTEGER,
    -- stance_time INTEGER,
    -- activity_type SMALLINT,
    -- left_torque_effectiveness SMALLINT,
    -- right_torque_effectiveness SMALLINT,
    -- left_pedal_smoothness SMALLINT,
    -- right_pedal_smoothness SMALLINT,
    -- combined_pedal_smoothness SMALLINT,
    -- time128 SMALLINT,
    -- stroke_type SMALLINT,
    -- zone SMALLINT,
    -- ball_speed INTEGER,
    -- cadence256 INTEGER,
    -- fractional_cadence SMALLINT,
    -- total_hemoglobin_conc INTEGER,
    -- total_hemoglobin_conc_min INTEGER,
    -- total_hemoglobin_conc_max INTEGER,
    -- saturated_hemoglobin_percent INTEGER,
    -- saturated_hemoglobin_percent_min INTEGER,
    -- saturated_hemoglobin_percent_max INTEGER,
    -- device_index SMALLINT,
    -- enhanced_speed INTEGER,
    enhanced_altitude INTEGER,
    activity_id INTEGER REFERENCES activities (id)
);
