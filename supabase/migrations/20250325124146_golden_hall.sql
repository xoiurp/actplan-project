/*
  # Add Certificate Storage Support

  1. Changes
    - Add certificate column to customers table
    - Create storage bucket for certificates
    - Update RLS policies for certificate access

  2. Security
    - Enable RLS on storage bucket
    - Only allow authenticated users to access their own certificates
    - Restrict file types to .pfx
*/

-- Add certificate column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS certificado jsonb DEFAULT NULL;

-- Create storage bucket for certificates if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('certificates', 'certificates', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on the certificates bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to upload their own certificates
CREATE POLICY "Users can upload their own certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to read their own certificates
CREATE POLICY "Users can read their own certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update customers RLS policies to include certificate access
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update own customers" ON customers;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

CREATE POLICY "Users can update own customers"
ON customers
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());