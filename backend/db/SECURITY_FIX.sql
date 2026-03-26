-- =========================================================
-- SUPABASE SECURITY HARDENING: ROW LEVEL SECURITY (RLS)
-- =========================================================
-- Run this in your Supabase SQL Editor to address security 
-- alerts and protect your data.
-- =========================================================

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 2. Add policies to define access control
-- Since your backend uses the service_role key, it will bypass 
-- these rules. These policies block direct public access while 
-- leaving room for future Supabase-integrated features.

-- USERS Table
DROP POLICY IF EXISTS "Deny public access to users" ON users;
CREATE POLICY "Deny public access to users" 
ON users FOR ALL 
TO anon, authenticated
USING (false);

-- DRIVERS Table
DROP POLICY IF EXISTS "Deny public access to drivers" ON drivers;
CREATE POLICY "Deny public access to drivers" 
ON drivers FOR ALL 
TO anon, authenticated
USING (false);

-- RIDES Table
DROP POLICY IF EXISTS "Deny public access to rides" ON rides;
CREATE POLICY "Deny public access to rides" 
ON rides FOR ALL 
TO anon, authenticated
USING (false);

-- PAYMENTS Table
DROP POLICY IF EXISTS "Deny public access to payments" ON payments;
CREATE POLICY "Deny public access to payments" 
ON payments FOR ALL 
TO anon, authenticated
USING (false);

-- RATINGS Table
DROP POLICY IF EXISTS "Deny public access to ratings" ON ratings;
CREATE POLICY "Deny public access to ratings" 
ON ratings FOR ALL 
TO anon, authenticated
USING (false);

-- =========================================================
-- Note: Authentication is currently managed through your
-- backend Express server using Clerk triggers and manual sync.
-- If you transition to Supabase Auth, these policies should
-- be updated to use concepts like auth.uid().
-- =========================================================
