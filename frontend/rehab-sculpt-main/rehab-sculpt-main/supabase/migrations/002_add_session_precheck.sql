-- Run this in Supabase SQL Editor to add missing columns to existing sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pain_level_before int;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS soreness_areas text[];
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sharp_pain text;
