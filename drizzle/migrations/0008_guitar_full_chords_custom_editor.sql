ALTER TABLE public.guitar_songs ADD COLUMN chord_mode text NOT NULL DEFAULT 'full';
ALTER TABLE public.guitar_songs ADD COLUMN chords jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.guitar_songs SET chord_mode = 'parts' WHERE jsonb_array_length(sections) > 0;

ALTER TABLE public.guitar_custom_chords ADD COLUMN category text;
ALTER TABLE public.guitar_custom_chords ADD COLUMN note text;
ALTER TABLE public.guitar_custom_chords ADD COLUMN strings jsonb;
ALTER TABLE public.guitar_custom_chords ADD COLUMN positions jsonb;
ALTER TABLE public.guitar_custom_chords ADD COLUMN base_fret integer;
ALTER TABLE public.guitar_custom_chords ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER t_guitar_custom_chords_upd BEFORE UPDATE ON public.guitar_custom_chords FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();