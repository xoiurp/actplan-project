/*
  # Fix Orders RLS Policies

  1. Changes
    - Drop and recreate orders RLS policies with proper checks
    - Add policy for inserting orders with customer validation
    - Add policy for service role to manage all orders

  2. Security
    - Enable RLS on orders table
    - Add policies for authenticated users
    - Add policy for service role
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own orders" ON orders;
  DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
  DROP POLICY IF EXISTS "Users can update own orders" ON orders;
  DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
  DROP POLICY IF EXISTS "Service role can manage all orders" ON orders;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create new policies
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all orders"
  ON orders
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON orders TO service_role;