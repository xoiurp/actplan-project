-- Migration: Add denominacao field to order_items table
-- Description: Adds denominacao (description) field to store tax type descriptions, especially important for DARF items

-- Add denominacao column to order_items table
ALTER TABLE order_items 
ADD COLUMN denominacao text;

-- Add comment for documentation
COMMENT ON COLUMN order_items.denominacao IS 'Tax type description/denomination, especially important for DARF items to show full tax names like "IRPJ PESSOA JURIDICA"'; 