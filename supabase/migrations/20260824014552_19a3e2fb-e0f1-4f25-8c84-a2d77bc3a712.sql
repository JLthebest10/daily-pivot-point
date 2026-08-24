CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pluggy',
  item_id text NOT NULL,
  institution_name text NOT NULL DEFAULT 'Banco',
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank connections" ON public.bank_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_bank_connections_upd BEFORE UPDATE ON public.bank_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  name text NOT NULL DEFAULT 'Conta',
  type text NOT NULL DEFAULT 'BANK',
  number text,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank accounts" ON public.bank_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_bank_accounts_upd BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transactions
  ADD COLUMN external_id text,
  ADD COLUMN source text NOT NULL DEFAULT 'manual',
  ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN category_locked boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX transactions_user_external_id_key ON public.transactions (user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX transactions_user_date_idx ON public.transactions (user_id, date DESC);