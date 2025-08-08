/*
  # Remove User Restrictions - Allow All Authenticated Users to View All Data

  1. Security Changes
    - Drop existing RLS policies that restrict data by user_id
    - Create new policies that allow all authenticated users to access all data
    - Keep RLS enabled for basic authentication protection

  2. Tables Affected
    - customers: Remove user_id restrictions
    - orders: Remove user_id restrictions  
    - order_items: Remove user_id restrictions
    - payment_plans: Remove user_id restrictions
    - installments: Remove user_id restrictions
    - order_reopen_history: Remove user_id restrictions

  3. Storage Policies
    - Update storage policies to allow all authenticated users
*/

-- Drop existing restrictive policies for customers
DROP POLICY IF EXISTS "Users can read own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;

-- Create new permissive policies for customers
CREATE POLICY "All authenticated users can read customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update customers" ON customers
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete customers" ON customers
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing restrictive policies for orders
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete own orders" ON orders;

-- Create new permissive policies for orders
CREATE POLICY "All authenticated users can read orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update orders" ON orders
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete orders" ON orders
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing restrictive policies for order_items
DROP POLICY IF EXISTS "Users can read order items through orders" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items through orders" ON order_items;
DROP POLICY IF EXISTS "Users can update order items through orders" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items through orders" ON order_items;

-- Create new permissive policies for order_items
CREATE POLICY "All authenticated users can read order items" ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert order items" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update order items" ON order_items
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete order items" ON order_items
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing restrictive policies for payment_plans (if they exist)
DROP POLICY IF EXISTS "Users can read own payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Users can insert own payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Users can update own payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Users can delete own payment plans" ON payment_plans;

-- Create new permissive policies for payment_plans
CREATE POLICY "All authenticated users can read payment plans" ON payment_plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert payment plans" ON payment_plans
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update payment plans" ON payment_plans
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete payment plans" ON payment_plans
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing restrictive policies for installments (if they exist)
DROP POLICY IF EXISTS "Users can read installments through payment plans" ON installments;
DROP POLICY IF EXISTS "Users can insert installments through payment plans" ON installments;
DROP POLICY IF EXISTS "Users can update installments through payment plans" ON installments;
DROP POLICY IF EXISTS "Users can delete installments through payment plans" ON installments;

-- Create new permissive policies for installments
CREATE POLICY "All authenticated users can read installments" ON installments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert installments" ON installments
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update installments" ON installments
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete installments" ON installments
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing restrictive policies for order_reopen_history (if they exist)
DROP POLICY IF EXISTS "Users can read order reopen history through orders" ON order_reopen_history;
DROP POLICY IF EXISTS "Users can insert order reopen history through orders" ON order_reopen_history;

-- Create new permissive policies for order_reopen_history
CREATE POLICY "All authenticated users can read order reopen history" ON order_reopen_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert order reopen history" ON order_reopen_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update storage policies for certificates bucket
DROP POLICY IF EXISTS "Users can upload own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own certificates" ON storage.objects;

-- Create permissive storage policies for certificates
CREATE POLICY "All authenticated users can upload certificates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "All authenticated users can view certificates" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certificates');

CREATE POLICY "All authenticated users can update certificates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates');

CREATE POLICY "All authenticated users can delete certificates" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates');

-- Update storage policies for order-pdfs bucket
DROP POLICY IF EXISTS "Users can upload order PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view order PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update order PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete order PDFs" ON storage.objects;

-- Create permissive storage policies for order-pdfs
CREATE POLICY "All authenticated users can upload order PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-pdfs');

CREATE POLICY "All authenticated users can view order PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'order-pdfs');

CREATE POLICY "All authenticated users can update order PDFs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'order-pdfs');

CREATE POLICY "All authenticated users can delete order PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'order-pdfs');

-- Update storage policies for payment-receipts bucket
DROP POLICY IF EXISTS "Users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete payment receipts" ON storage.objects;

-- Create permissive storage policies for payment-receipts
CREATE POLICY "All authenticated users can upload payment receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "All authenticated users can view payment receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "All authenticated users can update payment receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "All authenticated users can delete payment receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts');