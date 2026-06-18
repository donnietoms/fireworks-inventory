-- Add cases column to inventory table
-- This represents the number of cases/units ordered from the invoice

ALTER TABLE inventory 
ADD COLUMN cases INTEGER;

-- Set default value for existing rows (calculate from quantity and packing)
-- For now, set to 0 for existing rows since we can't reliably calculate backwards
UPDATE inventory SET cases = 0 WHERE cases IS NULL;
