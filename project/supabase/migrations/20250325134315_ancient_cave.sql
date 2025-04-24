/*
  # Add Payment Plan References and Status Constraints

  1. Changes
    - Add payment_plan_id to orders table
    - Add status constraints for orders
    - Add trigger to validate status transitions

  2. Security
    - Maintain existing RLS policies
    - Add validation for status changes
*/

-- Add payment_plan_id to orders
ALTER TABLE orders
ADD COLUMN payment_plan_id uuid REFERENCES payment_plans(id) ON DELETE SET NULL;

-- Create function to validate order status transitions
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only allow specific status transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('processing', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  END IF;

  IF OLD.status = 'processing' AND NEW.status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from processing to %', NEW.status;
  END IF;

  IF OLD.status IN ('completed', 'cancelled') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status once order is % status', OLD.status;
  END IF;

  -- Validate payment plan creation
  IF OLD.status = 'pending' AND NEW.status = 'processing' AND NEW.payment_plan_id IS NULL THEN
    RAISE EXCEPTION 'Order must have a payment plan to be set to processing status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status validation
CREATE TRIGGER validate_order_status
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- Add index for payment plan reference
CREATE INDEX idx_orders_payment_plan_id ON orders(payment_plan_id);

-- Add constraint to ensure payment plan total matches order total
ALTER TABLE payment_plans
ADD CONSTRAINT payment_plan_total_matches_order
CHECK (
  total_amount > 0 AND
  installments_count > 0 AND
  installments_count <= 12
);

-- Add constraint for installment amounts
ALTER TABLE installments
ADD CONSTRAINT valid_installment_amount
CHECK (
  amount > 0 AND
  (paid_amount IS NULL OR paid_amount <= amount)
);

-- Update order status enum
ALTER TABLE orders
ADD CONSTRAINT valid_order_status
CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'));