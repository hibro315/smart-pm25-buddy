-- Add additional pollutant columns to health_logs table
ALTER TABLE health_logs
ADD COLUMN IF NOT EXISTS pm10 numeric,
ADD COLUMN IF NOT EXISTS co numeric,
ADD COLUMN IF NOT EXISTS no2 numeric,
ADD COLUMN IF NOT EXISTS o3 numeric,
ADD COLUMN IF NOT EXISTS so2 numeric;