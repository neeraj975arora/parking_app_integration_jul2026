-- Migration: Add user_vehicles table and enhance parking_sessions table
-- Date: 2025-01-28
-- Description: Support for vehicle management and enhanced session tracking

-- Create user_vehicles table
CREATE TABLE user_vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL,
    vehicle_name VARCHAR(100),
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    vehicle_type VARCHAR(20) DEFAULT 'car',
    color VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uix_user_registration UNIQUE(user_id, registration_number)
);

-- Create indexes for user_vehicles table
CREATE INDEX idx_user_vehicles_user_id ON user_vehicles(user_id);
CREATE INDEX idx_user_vehicles_active ON user_vehicles(user_id, is_active);
CREATE INDEX idx_user_vehicles_registration ON user_vehicles(registration_number);

-- Add new columns to parking_sessions table
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES user_vehicles(vehicle_id);
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255);
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active';

-- Create indexes for enhanced parking_sessions table
CREATE INDEX IF NOT EXISTS idx_parking_session_user_vehicle ON parking_sessions(user_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parking_session_status ON parking_sessions(user_id, session_status);
CREATE INDEX IF NOT EXISTS idx_parking_session_payment_status ON parking_sessions(payment_status);

-- Update existing parking_sessions to have default session_status
UPDATE parking_sessions SET session_status = 'completed' WHERE end_time IS NOT NULL AND session_status IS NULL;
UPDATE parking_sessions SET session_status = 'active' WHERE end_time IS NULL AND session_status IS NULL;

-- Add trigger to update updated_at timestamp for user_vehicles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_vehicles_updated_at 
    BEFORE UPDATE ON user_vehicles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_vehicles IS 'Stores user vehicle information for parking session management';
COMMENT ON COLUMN user_vehicles.vehicle_id IS 'Primary key for vehicle identification';
COMMENT ON COLUMN user_vehicles.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_vehicles.registration_number IS 'Vehicle registration/license plate number';
COMMENT ON COLUMN user_vehicles.vehicle_name IS 'User-friendly name for the vehicle';
COMMENT ON COLUMN user_vehicles.is_active IS 'Soft delete flag for vehicle records';

COMMENT ON COLUMN parking_sessions.vehicle_id IS 'Foreign key to user_vehicles table';
COMMENT ON COLUMN parking_sessions.payment_status IS 'Status of payment: pending, completed, failed';
COMMENT ON COLUMN parking_sessions.session_status IS 'Status of parking session: active, completed, cancelled';
COMMENT ON COLUMN parking_sessions.total_amount IS 'Final calculated parking fee';
COMMENT ON COLUMN parking_sessions.receipt_url IS 'URL to payment receipt or invoice';