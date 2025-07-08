/*
  # Add PDF Storage Support

  1. New Storage
    - Create public bucket for order PDFs
    - Add policies for PDF access and management
    - Add PDF documents column to orders table

  2. Security
    - Enable RLS with public read access
    - Restrict write operations to authenticated users
*/

-- Create storage bucket for PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-pdfs', 'order-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Add PDF documents column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS documentos jsonb DEFAULT NULL;

-- Enable RLS on the PDFs bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to PDFs
CREATE POLICY "Anyone can read order PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-pdfs');

-- Create policy for authenticated users to upload PDFs
CREATE POLICY "Users can upload order PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'order-pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);