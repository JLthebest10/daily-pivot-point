CREATE TABLE public.calorie_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text, sex text NOT NULL DEFAULT 'M', age integer, weight_kg numeric, height_cm numeric, body_fat numeric,
  bmr numeric, bmr_manual boolean NOT NULL DEFAULT false,
  activity_level text NOT NULL DEFAULT 'sedentary',
  add_exercise boolean NOT NULL DEFAULT true,
  start_weight numeric, goal_weight numeric, start_body_fat numeric, goal_body_fat numeric,
  daily_kcal_goal numeric, desired_deficit numeric,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.calorie_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL, bmr numeric NOT NULL DEFAULT 0, tdee numeric NOT NULL DEFAULT 0,
  add_exercise boolean NOT NULL DEFAULT true, kcal_goal numeric,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE TABLE public.calorie_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE, kind text NOT NULL DEFAULT 'meal',
  category text NOT NULL DEFAULT 'Outro', name text NOT NULL DEFAULT '', description text, quantity text,
  kcal numeric NOT NULL DEFAULT 0, protein numeric, carbs numeric, fat numeric,
  time text, duration_min integer, is_free boolean NOT NULL DEFAULT false, note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, category text NOT NULL DEFAULT 'Outro', description text,
  kcal numeric NOT NULL DEFAULT 0, protein numeric, carbs numeric, fat numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE, weight_kg numeric NOT NULL, body_fat numeric, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['calorie_profiles','calorie_days','calorie_entries','saved_meals','weight_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;
CREATE INDEX ON public.calorie_entries (user_id, date);
CREATE INDEX ON public.weight_logs (user_id, date);
CREATE TRIGGER t_upd BEFORE UPDATE ON public.calorie_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_upd BEFORE UPDATE ON public.calorie_days FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_upd BEFORE UPDATE ON public.calorie_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();