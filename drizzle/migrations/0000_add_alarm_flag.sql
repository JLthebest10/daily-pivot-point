ALTER TABLE public.events ADD COLUMN IF NOT EXISTS add_alarm boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS add_alarm boolean NOT NULL DEFAULT false;