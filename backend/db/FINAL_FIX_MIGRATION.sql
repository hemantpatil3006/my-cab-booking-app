-- =========================================================
-- FINAL CONSOLIDATED SCHEMA UPDATE
-- Run this in your Supabase SQL Editor to fix the 500 error
-- and enable all application features.
-- =========================================================

-- 1. Add credits to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits NUMERIC(10, 2) DEFAULT 0;

-- 2. Add address and fare columns to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT '';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS drop_address TEXT DEFAULT '';
-- Ensure fare is numeric if not already properly set
-- ALTER TABLE rides ALTER COLUMN fare TYPE NUMERIC(10, 2); 

-- 3. Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
  rider_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_ratings_ride_id ON ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);

-- 5. Ensure existing rides have a default fare if null (optional but good for history)
UPDATE rides SET fare = 0 WHERE fare IS NULL;

-- 6. Add unique constraint to drivers user_id
ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
