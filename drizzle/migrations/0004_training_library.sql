CREATE TABLE public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  muscle_group text,
  equipment text,
  description text,
  default_sets integer NOT NULL DEFAULT 3,
  default_reps text NOT NULL DEFAULT '10',
  default_rest_sec integer NOT NULL DEFAULT 60,
  media_path text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_library TO authenticated;
GRANT ALL ON public.exercise_library TO service_role;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise_library" ON public.exercise_library FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_library_user_idx ON public.exercise_library(user_id, name);
CREATE TRIGGER t_exercise_library_upd BEFORE UPDATE ON public.exercise_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.exercises ADD COLUMN library_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;
ALTER TABLE public.exercises ADD COLUMN target_reps_text text;
ALTER TABLE public.exercises ADD COLUMN note text;
ALTER TABLE public.exercises ADD COLUMN archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.exercise_sets ADD COLUMN library_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;
ALTER TABLE public.exercise_sets ADD COLUMN done boolean NOT NULL DEFAULT true;

ALTER TABLE public.workout_sessions ADD COLUMN started_at timestamptz;
ALTER TABLE public.workout_sessions ADD COLUMN finished_at timestamptz;

-- Backfill: one library entry per distinct exercise name per user
INSERT INTO public.exercise_library (user_id, name, default_sets, default_reps, default_rest_sec, created_at)
SELECT DISTINCT ON (user_id, lower(trim(name))) user_id, trim(name), target_sets, target_reps::text, rest_sec, created_at
FROM public.exercises ORDER BY user_id, lower(trim(name)), created_at;

UPDATE public.exercises e SET library_id = l.id
FROM public.exercise_library l
WHERE l.user_id = e.user_id AND lower(l.name) = lower(trim(e.name)) AND e.library_id IS NULL;

UPDATE public.exercise_sets s SET library_id = e.library_id
FROM public.exercises e WHERE e.id = s.exercise_id AND s.library_id IS NULL;

UPDATE public.workout_sessions SET finished_at = created_at, started_at = created_at WHERE finished_at IS NULL;

CREATE INDEX exercise_sets_library_idx ON public.exercise_sets(user_id, library_id, created_at);