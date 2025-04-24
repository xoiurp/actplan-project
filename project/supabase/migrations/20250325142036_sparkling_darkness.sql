/*
  # Fix Order Status Validation

  1. Changes
    - Make payment plan requirement optional when transitioning to processing status
    - Update validation function to be more flexible
    - Add better error messages

  2. Security
    - Maintain existing RLS policies
    - Keep validation checks for other status transitions
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_order_status
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();