CREATE TABLE IF NOT EXISTS storage (
    id bigint PRIMARY KEY,
    short_code text,
    original text
);

CREATE INDEX IF NOT EXISTS idx_short_code ON storage (short_code);

CREATE TABLE IF NOT EXISTS counter_table (
    counter_name text PRIMARY KEY,
    counter_value counter
);

UPDATE counter_table SET counter_value = counter_value + 0 WHERE counter_name = 'id_sequence'; 