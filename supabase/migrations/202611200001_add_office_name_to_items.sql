-- Run once in the Supabase SQL Editor before using the Office field.
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS office_name text;
