-- Migration: add difficulty, explanation, and order_number columns to questions table
ALTER TABLE questions ADD COLUMN difficulty difficulty_level NOT NULL DEFAULT 'medium';
ALTER TABLE questions ADD COLUMN explanation TEXT;
ALTER TABLE questions ADD COLUMN order_number INTEGER;
