-- RLS Delete Policies for Spicebox
-- Add these policies to allow deletion operations
-- Run in Supabase SQL Editor

-- =====================================================
-- DELETE POLICIES FOR DEVICES TABLE
-- =====================================================

-- Allow anonymous users to delete devices
CREATE POLICY "anon delete devices"
  ON public.devices
  FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- DELETE POLICIES FOR READINGS TABLE
-- =====================================================

-- Allow anonymous users to delete readings
CREATE POLICY "anon delete readings"
  ON public.readings
  FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if policies were created successfully
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('devices', 'readings')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- =====================================================
-- TEST DELETE OPERATIONS (Optional)
-- =====================================================

-- Test device deletion (replace 'test-device-id' with actual deviceid)
-- DELETE FROM public.devices WHERE deviceid = 'test-device-id';

-- Test readings deletion for a device
-- DELETE FROM public.readings WHERE deviceid = 'test-device-id';

-- =====================================================
-- COMPLETE POLICY OVERVIEW
-- =====================================================

-- After running this script, your RLS policies will be:
-- DEVICES table:
--   - SELECT: anon (read devices)
--   - INSERT: anon (create devices)
--   - UPDATE: anon (update devices)
--   - DELETE: anon (delete devices) ← NEW

-- READINGS table:
--   - INSERT: anon (create readings)
--   - DELETE: anon (delete readings) ← NEW

-- STORAGE (device-images bucket):
--   - SELECT: anon (read images)
--   - INSERT: anon (upload images)
--   - UPDATE: anon (update images)
--   - DELETE: anon (delete images)