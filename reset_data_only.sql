-- Quick Data Reset Script for Spicebox
-- This script deletes all data but keeps table structure
-- Safe to run multiple times

-- Delete all readings first (due to foreign key constraint)
DELETE FROM public.readings;

-- Delete all devices
DELETE FROM public.devices;

-- Verification: Check counts
SELECT
  (SELECT COUNT(*) FROM public.devices) as devices_count,
  (SELECT COUNT(*) FROM public.readings) as readings_count;

-- Expected output: devices_count = 0, readings_count = 0