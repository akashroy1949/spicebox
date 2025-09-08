-- Check All RLS Policies for Spicebox
-- Run this to verify your current policy setup

-- =====================================================
-- CURRENT RLS POLICIES OVERVIEW
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('devices', 'readings')
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- EXPECTED POLICIES AFTER SETUP
-- =====================================================

-- DEVICES table should have:
-- 1. "anon select devices" - SELECT - anon - true
-- 2. "anon upsert devices" - INSERT - anon - true
-- 3. "anon update devices" - UPDATE - anon - true
-- 4. "anon delete devices" - DELETE - anon - true

-- READINGS table should have:
-- 1. "anon insert readings" - INSERT - anon - true
-- 2. "anon delete readings" - DELETE - anon - true

-- =====================================================
-- STORAGE POLICIES CHECK
-- =====================================================

-- Check storage policies for device-images bucket
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND qual LIKE '%device-images%'
ORDER BY policyname;

-- =====================================================
-- RLS STATUS CHECK
-- =====================================================

-- Check if RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('devices', 'readings')
ORDER BY tablename;