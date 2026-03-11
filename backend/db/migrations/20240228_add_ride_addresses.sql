-- Add address columns to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT '';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS drop_address TEXT DEFAULT '';
