-- Add package support to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_package boolean NOT NULL DEFAULT false;

-- Create post_items table
CREATE TABLE public.post_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  title text,
  group_name text,
  media_url text NOT NULL,
  media_type text CHECK (media_type IN ('image', 'video')),
  order_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX post_items_post_id_idx ON public.post_items(post_id);

ALTER TABLE public.post_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do everything on post_items"
  ON public.post_items FOR ALL
  USING (public.is_admin());

CREATE POLICY "Client can view own post items"
  ON public.post_items FOR SELECT
  USING (
    post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id())
  );

CREATE POLICY "Client can update post item status"
  ON public.post_items FOR UPDATE
  USING (post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id()))
  WITH CHECK (post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id()));
