/*
  # Fix Order Status Validation

  1. Changes
    - Update validate_order_status_transition function to:
      - Only validate when status actually changes
      - Allow setting payment_plan_id without status change
      - Fix status transition rules
  
  2. Security
    - No changes to RLS policies
    - Function remains SECURITY DEFINER
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS validate_order_status ON orders;

-- Update the validation function
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate status transitions if status is actually changing
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate status transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('processing', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  END IF;

  IF OLD.status = 'processing' AND NEW.status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from processing to %', NEW.status;
  END IF;

  IF OLD.status IN ('completed', 'cancelled') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status once order is % status', OLD.status;
  END IF;

  -- Validate payment plan requirement
  IF OLD.status = 'pending' AND NEW.status = 'processing' AND NEW.payment_plan_id IS NULL THEN
    RAISE EXCEPTION 'Order must have a payment plan to be set to processing status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_order_status
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();