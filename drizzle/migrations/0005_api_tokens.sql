CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'iPhone',
  token_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api_tokens select" ON public.api_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own api_tokens update" ON public.api_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own api_tokens delete" ON public.api_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX api_tokens_user_idx ON public.api_tokens(user_id);