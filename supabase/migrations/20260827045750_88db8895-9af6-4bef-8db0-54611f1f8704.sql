ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS interval_days integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS anchor_date date;