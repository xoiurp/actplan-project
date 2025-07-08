/*
  # Add Payment Plan Status Trigger

  1. Changes
    - Add trigger to automatically update payment plan status when all installments are paid
    - Add function to calculate and update payment plan status
    - Add validation for payment plan status transitions

  2. Security
    - Function runs with security definer to bypass RLS
    - Limited to specific operations needed
*/

-- Create function to update payment plan status
CREATE OR REPLACE FUNCTION update_payment_plan_status()
RETURNS trigger AS $$
DECLARE
  _total_installments integer;
  _paid_installments integer;
  _plan_status text;
BEGIN
  -- Get total number of installments for this plan
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid')
  INTO _total_installments, _paid_installments
  FROM installments
  WHERE payment_plan_id = NEW.payment_plan_id;

  -- Determine new status
  IF _paid_installments = _total_installments THEN
    _plan_status := 'completed';
  ELSIF _paid_installments > 0 THEN
    _plan_status := 'active';
  ELSE
    _plan_status := 'pending';
  END IF;

  -- Update payment plan status if it has changed
  UPDATE payment_plans
  SET status = _plan_status,
      updated_at = now()
  WHERE id = NEW.payment_plan_id
  AND status != _plan_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update payment plan status
CREATE TRIGGER update_payment_plan_status
  AFTER INSERT OR UPDATE OF status
  ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_plan_status();

-- Add constraint for valid payment plan status values
ALTER TABLE payment_plans
ADD CONSTRAINT valid_payment_plan_status
CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

-- Add constraint for valid installment status values
ALTER TABLE installments
ADD CONSTRAINT valid_installment_status
CHECK (status IN ('pending', 'paid', 'partial', 'late'));

-- Update existing payment plans status based on their installments
DO $$
DECLARE
  _plan RECORD;
  _total_installments integer;
  _paid_installments integer;
  _plan_status text;
BEGIN
  FOR _plan IN SELECT id FROM payment_plans
  LOOP
    -- Get counts for this plan
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid')
    INTO _total_installments, _paid_installments
    FROM installments
    WHERE payment_plan_id = _plan.id;

    -- Determine status
    IF _paid_installments = _total_installments THEN
      _plan_status := 'completed';
    ELSIF _paid_installments > 0 THEN
      _plan_status := 'active';
    ELSE
      _plan_status := 'pending';
    END IF;

    -- Update plan status
    UPDATE payment_plans
    SET status = _plan_status,
        updated_at = now()
    WHERE id = _plan.id
    AND status != _plan_status;
  END LOOP;
END $$;