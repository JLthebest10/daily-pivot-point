CREATE TABLE public.card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  credit_limit numeric(12,2) NOT NULL DEFAULT 500,
  closing_day integer NOT NULL DEFAULT 15,
  due_day integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_settings TO authenticated;
GRANT ALL ON public.card_settings TO service_role;
ALTER TABLE public.card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own card settings" ON public.card_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_card_settings_upd BEFORE UPDATE ON public.card_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.card_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_expenses TO authenticated;
GRANT ALL ON public.card_expenses TO service_role;
ALTER TABLE public.card_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own card expenses" ON public.card_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_card_expenses_upd BEFORE UPDATE ON public.card_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_card_expenses_user_date ON public.card_expenses (user_id, date DESC);