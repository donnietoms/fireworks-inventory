-- Remove the CHECK constraint that prevents quantity <= 0
-- This allows tracking of negative inventory (oversold situations) and zero quantities

ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_quantity_check;

-- Optionally, add a new constraint that just ensures quantity is a valid number
-- (No constraint needed - PostgreSQL already enforces INTEGER type)
