/*
  # Add Sequential Order ID

  1. New Columns
    - `order_number` (bigint) - Sequential order number for display purposes
    - `order_year` (integer) - Year of the order for yearly sequence reset

  2. Changes
    - Add sequence for order numbers
    - Add trigger to automatically set order number and year
    - Update existing orders with sequential numbers

  3. Security
    - No changes to RLS policies needed as this is handled by triggers
*/

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Add new columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_number bigint,
ADD COLUMN IF NOT EXISTS order_year integer;

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS trigger AS $$
DECLARE
  _year integer;
BEGIN
  -- Get the year from data_pedido, fallback to current year
  _year := COALESCE(EXTRACT(YEAR FROM NEW.data_pedido), EXTRACT(YEAR FROM CURRENT_DATE));
  
  -- If the year changed, reset the sequence
  IF NEW.order_year IS NULL OR NEW.order_year != _year THEN
    -- Get the max order number for this year
    SELECT COALESCE(MAX(order_number), 0) INTO NEW.order_number
    FROM orders
    WHERE order_year = _year;
    
    -- Increment by 1
    NEW.order_number := NEW.order_number + 1;
  END IF;
  
  NEW.order_year := _year;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set order number
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Update existing orders with sequential numbers
DO $$
DECLARE
  _order RECORD;
  _year integer;
  _counter integer;
BEGIN
  -- Process each year separately
  FOR _year IN
    SELECT DISTINCT EXTRACT(YEAR FROM data_pedido)::integer as year
    FROM orders
    WHERE order_number IS NULL
    ORDER BY year
  LOOP
    _counter := 0;
    
    -- Update orders for this year
    FOR _order IN
      SELECT id
      FROM orders
      WHERE EXTRACT(YEAR FROM data_pedido) = _year
      AND order_number IS NULL
      ORDER BY created_at
    LOOP
      _counter := _counter + 1;
      
      UPDATE orders
      SET order_number = _counter,
          order_year = _year
      WHERE id = _order.id;
    END LOOP;
  END LOOP;
END $$;