CREATE TABLE public.guitar_offline_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id uuid NOT NULL REFERENCES public.guitar_songs(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_label text,
  original_url text,
  source text NOT NULL DEFAULT 'import',
  local_key text NOT NULL,
  status text NOT NULL DEFAULT 'downloading',
  error text,
  size_bytes bigint,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, song_id, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guitar_offline_videos TO authenticated;
GRANT ALL ON public.guitar_offline_videos TO service_role;
ALTER TABLE public.guitar_offline_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guitar_offline_videos" ON public.guitar_offline_videos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_guitar_offline_videos_upd BEFORE UPDATE ON public.guitar_offline_videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();