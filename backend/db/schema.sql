-- =============================================
-- Cab Booking App - Full Database Schema
-- Run this in your Supabase project's SQL Editor
-- =============================================

-- ─── USERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   TEXT UNIQUE NOT NULL,
  email      TEXT NOT NULL,
  name       TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'rider' CHECK (role IN ('rider', 'driver')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ─── DRIVERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type     TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'auto', 'sedan', 'suv')),
  license_number   TEXT NOT NULL UNIQUE,
  availability     BOOLEAN NOT NULL DEFAULT false,
  current_lat      DOUBLE PRECISION,
  current_lng      DOUBLE PRECISION,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id      ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_availability ON drivers(availability);

-- ─── RIDES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  pickup_lat  DOUBLE PRECISION NOT NULL,
  pickup_lng  DOUBLE PRECISION NOT NULL,
  drop_lat    DOUBLE PRECISION NOT NULL,
  drop_lng    DOUBLE PRECISION NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled')),
  fare        NUMERIC(10, 2),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rides_rider_id  ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status    ON rides(status);

-- ─── PAYMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id    UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  amount     NUMERIC(10, 2) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);

-- ─── Ensure phone column exists on users (safe to re-run) ───────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
