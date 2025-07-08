/*
  # Add Payment Receipt Support

  1. Changes
    - Add receipt column to installments table
    - Create storage bucket for payment receipts
    - Add policies for receipt management
    - Add edit_mode column to track installment editing

  2. Security
    - Enable RLS on storage bucket
    - Add policies for authenticated users
*/

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Add receipt column to installments table
ALTER TABLE installments
ADD COLUMN IF NOT EXISTS receipt jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS edit_mode boolean DEFAULT false;

-- Create policies for payment receipts bucket
CREATE POLICY "Anyone can read payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

CREATE POLICY "Users can upload payment receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their payment receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update installment status validation
ALTER TABLE installments DROP CONSTRAINT IF EXISTS valid_installment_status;
ALTER TABLE installments
ADD CONSTRAINT valid_installment_status
CHECK (status IN ('pending', 'paid', 'partial', 'late', 'editing'));