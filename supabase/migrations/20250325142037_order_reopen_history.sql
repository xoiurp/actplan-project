/*
  # Add Order Reopen History

  1. Changes
    - Create order_reopen_history table
    - Add reopen_status to orders table
    - Create function to handle order reopening
    - Add trigger for reopen history tracking
*/

-- Create enum for reopen status
CREATE TYPE order_reopen_status AS ENUM ('reopened', 'reclosed');

-- Create order_reopen_history table
CREATE TABLE order_reopen_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reopened_by UUID NOT NULL REFERENCES auth.users(id),
    reopened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    reopen_status order_reopen_status DEFAULT 'reopened',
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    closing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE order_reopen_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reopen history of their orders"
    ON order_reopen_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_reopen_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reopen history for their orders"
    ON order_reopen_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_reopen_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Create function to handle order reopening
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

    -- Update order status
    UPDATE orders
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_history_id;
END;
$$;

-- Create function to close reopened order
CREATE OR REPLACE FUNCTION close_reopened_order(
    p_order_id UUID,
    p_closing_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history_id UUID;
BEGIN
    -- Get the latest reopen history record
    SELECT id INTO v_history_id
    FROM order_reopen_history
    WHERE order_id = p_order_id
    AND reopen_status = 'reopened'
    ORDER BY reopened_at DESC
    LIMIT 1;

    IF v_history_id IS NULL THEN
        RAISE EXCEPTION 'No active reopen history found for this order';
    END IF;

    -- Update reopen history
    UPDATE order_reopen_history
    SET reopen_status = 'reclosed',
        closed_at = NOW(),
        closed_by = auth.uid(),
        closing_notes = p_closing_notes,
        updated_at = NOW()
    WHERE id = v_history_id;

    -- Update order status back to completed
    UPDATE orders
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_history_id;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON order_reopen_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp(); 