-- Supabase Storage Setup for Hush Media Uploads
-- Run this in your Supabase SQL Editor to set up the media bucket

-- ALTERNATIVE: If you prefer to use the dashboard:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create bucket named 'media'
-- 3. Toggle "Public bucket" to ON
-- 4. Then run the policies below

-- Create the media bucket if it doesn't exist (make it public for chat media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clean up ALL existing policies for the media bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to media" ON storage.objects;

-- Set up FRESH RLS policies for the media bucket (Anonymous access for public chat app)

-- 1. Allow anonymous users to upload files (since Hush uses anonymous chat)
CREATE POLICY "Allow anonymous uploads" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'media'::text);

-- 2. Allow public access to view files (for chat media)
CREATE POLICY "Allow public access to media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media');

-- 3. Allow anonymous users to delete files (for view-once cleanup)
CREATE POLICY "Allow anonymous deletes" ON storage.objects
FOR DELETE TO anon
USING (bucket_id = 'media');

-- Optional: Set up file size limits and type restrictions
-- This can also be done through the Supabase dashboard

-- ALTERNATIVE: Disable RLS entirely for the media bucket (simpler for development)
-- Uncomment the line below if you want to disable RLS completely for the media bucket
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify bucket creation and policies
SELECT id, name, public FROM storage.buckets WHERE id = 'media';

-- Verify all policies are created correctly
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Expected result should show:
-- 1. Allow anonymous uploads (INSERT, anon)
-- 2. Allow public access to media (SELECT, public)
-- 3. Allow anonymous deletes (DELETE, anon)