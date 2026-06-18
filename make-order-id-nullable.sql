-- Make order_id nullable to allow manual inventory entries without an order
ALTER TABLE inventory ALTER COLUMN order_id DROP NOT NULL;
