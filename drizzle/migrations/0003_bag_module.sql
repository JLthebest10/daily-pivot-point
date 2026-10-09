CREATE TABLE public.bag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  icon text,
  is_fixed boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bag_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bag_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.bag_lists(id) ON DELETE CASCADE,
  source_item_id uuid REFERENCES public.bag_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  icon text,
  checked boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bag_items, public.bag_lists, public.bag_list_items TO authenticated;
GRANT ALL ON public.bag_items, public.bag_lists, public.bag_list_items TO service_role;
ALTER TABLE public.bag_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bag_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bag_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bag_items" ON public.bag_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bag_lists" ON public.bag_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bag_list_items" ON public.bag_list_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX bag_lists_user_date ON public.bag_lists(user_id, date);
CREATE INDEX bag_list_items_list ON public.bag_list_items(list_id);
CREATE TRIGGER t_bag_items_upd BEFORE UPDATE ON public.bag_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_bag_lists_upd BEFORE UPDATE ON public.bag_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();