CREATE TABLE public.guitar_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  artist text,
  song_key text,
  difficulty text,
  notes text,
  video_url text,
  lyrics text,
  favorite boolean NOT NULL DEFAULT false,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guitar_songs TO authenticated;
GRANT ALL ON public.guitar_songs TO service_role;
ALTER TABLE public.guitar_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guitar_songs" ON public.guitar_songs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX guitar_songs_user_idx ON public.guitar_songs(user_id);
CREATE TRIGGER t_guitar_songs_upd BEFORE UPDATE ON public.guitar_songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guitar_custom_chords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  frets text NOT NULL,
  fingers text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guitar_custom_chords TO authenticated;
GRANT ALL ON public.guitar_custom_chords TO service_role;
ALTER TABLE public.guitar_custom_chords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guitar_custom_chords" ON public.guitar_custom_chords FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);