-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create schema for AURORA
CREATE SCHEMA IF NOT EXISTS aurora;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA aurora TO aurora;
GRANT ALL PRIVILEGES ON DATABASE aurora_dev TO aurora;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB extension enabled successfully';
END $$;
