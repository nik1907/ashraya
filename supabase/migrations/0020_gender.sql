-- Add gender column to profiles for Shri / Smt. honorific display
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IN ('male', 'female'));
