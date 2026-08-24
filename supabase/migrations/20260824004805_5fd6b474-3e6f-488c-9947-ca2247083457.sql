CREATE TABLE public.store_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_debts TO authenticated;
GRANT ALL ON public.store_debts TO service_role;
ALTER TABLE public.store_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own store debts" ON public.store_debts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_store_debts_upd BEFORE UPDATE ON public.store_debts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name text NOT NULL,
  kcal integer,
  note text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_options TO authenticated;
GRANT ALL ON public.meal_options TO service_role;
ALTER TABLE public.meal_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal options" ON public.meal_options FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.meal_logs ADD COLUMN option_id uuid REFERENCES public.meal_options(id) ON DELETE SET NULL;