CREATE TABLE public.future_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  saved numeric NOT NULL DEFAULT 0,
  target_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.future_expenses TO authenticated;
GRANT ALL ON public.future_expenses TO service_role;

ALTER TABLE public.future_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own future expenses"
ON public.future_expenses FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX future_expenses_user_date_idx ON public.future_expenses (user_id, target_date);

CREATE TRIGGER future_expenses_set_updated_at
BEFORE UPDATE ON public.future_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();