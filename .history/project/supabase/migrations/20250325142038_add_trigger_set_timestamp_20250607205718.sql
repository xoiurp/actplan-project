/*
  # Add trigger_set_timestamp function

  1. Changes
    - Create trigger_set_timestamp function for updating updated_at columns
*/

-- Create the trigger_set_timestamp function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 