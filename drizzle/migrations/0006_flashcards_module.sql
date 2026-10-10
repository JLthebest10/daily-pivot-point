CREATE TABLE public.flashcard_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  notes text,
  priority text,
  deadline date,
  completed_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_topics TO authenticated;
GRANT ALL ON public.flashcard_topics TO service_role;
ALTER TABLE public.flashcard_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcard_topics" ON public.flashcard_topics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX flashcard_topics_user_idx ON public.flashcard_topics(user_id, created_at);
CREATE TRIGGER t_flashcard_topics_upd BEFORE UPDATE ON public.flashcard_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.flashcard_topics(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.flashcards FOR ALL TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.flashcard_topics t WHERE t.id = topic_id AND t.user_id = auth.uid()))
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.flashcard_topics t WHERE t.id = topic_id AND t.user_id = auth.uid()));
CREATE INDEX flashcards_topic_idx ON public.flashcards(user_id, topic_id);
CREATE TRIGGER t_flashcards_upd BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();