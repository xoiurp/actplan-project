/*
  # Fix foreign key for reopened_by and closed_by in order_reopen_history
*/

-- Remove old constraints if they exist
ALTER TABLE order_reopen_history DROP CONSTRAINT IF EXISTS order_reopen_history_reopened_by_fkey;
ALTER TABLE order_reopen_history DROP CONSTRAINT IF EXISTS order_reopen_history_closed_by_fkey;

-- Add correct foreign key constraints
ALTER TABLE order_reopen_history
  ADD CONSTRAINT order_reopen_history_reopened_by_fkey
  FOREIGN KEY (reopened_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE order_reopen_history
  ADD CONSTRAINT order_reopen_history_closed_by_fkey
  FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL; 