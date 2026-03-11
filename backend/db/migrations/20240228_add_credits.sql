-- Add credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0.00;
