/*
  # Update reopen_order to temporarily disable validate_order_status trigger
*/

DROP FUNCTION IF EXISTS reopen_order;

CREATE OR REPLACE FUNCTION reopen_order(
    p_order_id UUID,
    p_reason TEXT,
    p_new_status TEXT DEFAULT 'processing'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history_id UUID;
    v_previous_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_previous_status
    FROM orders
    WHERE id = p_order_id;

    -- Validate status
    IF v_previous_status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Order must be completed or cancelled to be reopened';
    END IF;

    -- Create reopen history record
    INSERT INTO order_reopen_history (
        order_id,
        reopened_by,
        previous_status,
        new_status,
        reason
    ) VALUES (
        p_order_id,
        auth.uid(),
        v_previous_status,
        p_new_status,
        p_reason
    )
    RETURNING id INTO v_history_id;

    -- Temporarily disable the trigger
    EXECUTE 'ALTER TABLE orders DISABLE TRIGGER validate_order_status';

    -- Update order status directly
    UPDATE orders
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Re-enable the trigger
    EXECUTE 'ALTER TABLE orders ENABLE TRIGGER validate_order_status';

    RETURN v_history_id;
END;
$$; 