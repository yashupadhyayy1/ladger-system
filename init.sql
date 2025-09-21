-- PostgreSQL initialization script for Docker
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the database user if it doesn't exist
-- (The POSTGRES_USER from docker-compose.yml will be created automatically)

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;

-- Set default timezone to UTC
SET timezone = 'UTC';

-- Log the initialization
\echo 'PostgreSQL database initialized for Double-Entry Ledger system'

