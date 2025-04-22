/*
  # Fix Certificate Storage Access

  1. Changes
    - Make certificates bucket public
    - Update storage policies for better access control
    - Fix URL handling for certificates

  2. Security
    - Maintain RLS for write operations
    - Allow public read access to certificates
*/

-- Update certificates bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'certificates';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own certificates" ON storage.objects;

-- Create new policy for public read access to certificates
CREATE POLICY "Anyone can read certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

-- Update upload policy to be more specific
DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
CREATE POLICY "Users can upload their own certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (storage.foldername(name))[2] IS NOT NULL
);

-- Update delete policy to be more specific
DROP POLICY IF EXISTS "Users can delete their own certificates" ON storage.objects;
CREATE POLICY "Users can delete their own certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);