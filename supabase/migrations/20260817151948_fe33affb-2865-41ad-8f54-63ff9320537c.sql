ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS focus TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS weekdays INT[] NOT NULL DEFAULT ARRAY[]::INT[];
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS duration_min INT;