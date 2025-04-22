/*
  # Financial Structure Setup

  1. New Tables
    - `payment_plans`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `total_amount` (numeric)
      - `installments_count` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `installments`
      - `id` (uuid, primary key)
      - `payment_plan_id` (uuid, foreign key)
      - `installment_number` (integer)
      - `amount` (numeric)
      - `due_date` (date)
      - `status` (text)
      - `paid_amount` (numeric)
      - `paid_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for service role
*/

-- Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  installments_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create installments table
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_plan_id uuid REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_amount numeric DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies for payment_plans
CREATE POLICY "Users can read own payment plans"
  ON payment_plans
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create payment plans for own orders"
  ON payment_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_plans.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own payment plans"
  ON payment_plans
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payment plans"
  ON payment_plans
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all payment plans"
  ON payment_plans
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for installments
CREATE POLICY "Users can read installments through payment plans"
  ON installments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_plans
      WHERE payment_plans.id = installments.payment_plan_id
      AND payment_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create installments through payment plans"
  ON installments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payment_plans
      WHERE payment_plans.id = installments.payment_plan_id
      AND payment_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update installments through payment plans"
  ON installments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_plans
      WHERE payment_plans.id = installments.payment_plan_id
      AND payment_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete installments through payment plans"
  ON installments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_plans
      WHERE payment_plans.id = installments.payment_plan_id
      AND payment_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all installments"
  ON installments
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_payment_plans_order_id ON payment_plans(order_id);
CREATE INDEX idx_payment_plans_user_id ON payment_plans(user_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);
CREATE INDEX idx_installments_payment_plan_id ON installments(payment_plan_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);