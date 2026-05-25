-- ─── Agencies table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agencies (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  logo_url   text,
  email      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do everything on agencies"
  ON public.agencies FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator can view own agency"
  ON public.agencies FOR SELECT
  USING (id = public.my_agency_id());

-- ─── Add agency_id to existing tables ────────────────────────────────────────
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.users   ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
-- agency_id NULL on users = Clava admin (no restriction)
-- agency_id NULL on clients = Clava's own clients (only admins can see)

-- ─── Add operator role ────────────────────────────────────────────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'operator', 'client'));

-- ─── Helper functions ─────────────────────────────────────────────────────────

-- Returns the agency_id of the current operator (null for admin)
CREATE OR REPLACE FUNCTION public.my_agency_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT agency_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Returns true if current user is admin OR operator (i.e., can access /admin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT role IN ('admin', 'operator') FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ─── Update RLS on clients ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on clients" ON public.clients;
DROP POLICY IF EXISTS "Client can view own client" ON public.clients;

CREATE POLICY "Admin full access on clients"
  ON public.clients FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency clients"
  ON public.clients FOR SELECT
  USING (
    public.is_staff() AND agency_id = public.my_agency_id()
  );

CREATE POLICY "Operator can insert clients for own agency"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.is_staff() AND agency_id = public.my_agency_id()
  );

CREATE POLICY "Operator can update own agency clients"
  ON public.clients FOR UPDATE
  USING (public.is_staff() AND agency_id = public.my_agency_id())
  WITH CHECK (public.is_staff() AND agency_id = public.my_agency_id());

CREATE POLICY "Client can view own record"
  ON public.clients FOR SELECT
  USING (id = public.my_client_id());

-- ─── Update RLS on posts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on posts" ON public.posts;
DROP POLICY IF EXISTS "Client can view own posts" ON public.posts;
DROP POLICY IF EXISTS "Client can update post status" ON public.posts;

CREATE POLICY "Admin full access on posts"
  ON public.posts FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency posts"
  ON public.posts FOR SELECT
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can insert posts for own agency"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can update posts for own agency"
  ON public.posts FOR UPDATE
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Client can view own posts"
  ON public.posts FOR SELECT
  USING (client_id = public.my_client_id());

CREATE POLICY "Client can update post status"
  ON public.posts FOR UPDATE
  USING (client_id = public.my_client_id())
  WITH CHECK (client_id = public.my_client_id());

-- ─── Update RLS on campaigns ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Client can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Client can update campaign status" ON public.campaigns;

CREATE POLICY "Admin full access on campaigns"
  ON public.campaigns FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency campaigns"
  ON public.campaigns FOR SELECT
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can insert campaigns for own agency"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can update campaigns for own agency"
  ON public.campaigns FOR UPDATE
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Client can view own campaigns"
  ON public.campaigns FOR SELECT
  USING (client_id = public.my_client_id());

CREATE POLICY "Client can update campaign status"
  ON public.campaigns FOR UPDATE
  USING (client_id = public.my_client_id())
  WITH CHECK (client_id = public.my_client_id());

-- ─── Update RLS on insights ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on insights" ON public.insights;
DROP POLICY IF EXISTS "Client can view own insights" ON public.insights;
DROP POLICY IF EXISTS "Client can update insight status" ON public.insights;

CREATE POLICY "Admin full access on insights"
  ON public.insights FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency insights"
  ON public.insights FOR SELECT
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can insert insights for own agency"
  ON public.insights FOR INSERT
  WITH CHECK (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can update insights for own agency"
  ON public.insights FOR UPDATE
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Client can view own insights"
  ON public.insights FOR SELECT
  USING (client_id = public.my_client_id());

CREATE POLICY "Client can update insight status"
  ON public.insights FOR UPDATE
  USING (client_id = public.my_client_id())
  WITH CHECK (client_id = public.my_client_id());

-- ─── Update RLS on results ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on results" ON public.results;
DROP POLICY IF EXISTS "Client can view own results" ON public.results;

CREATE POLICY "Admin full access on results"
  ON public.results FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency results"
  ON public.results FOR SELECT
  USING (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Operator can insert results for own agency"
  ON public.results FOR INSERT
  WITH CHECK (
    public.is_staff() AND client_id IN (
      SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
    )
  );

CREATE POLICY "Client can view own results"
  ON public.results FOR SELECT
  USING (client_id = public.my_client_id());

-- ─── Update RLS on post_items ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can do everything on post_items" ON public.post_items;
DROP POLICY IF EXISTS "Client can view own post items" ON public.post_items;
DROP POLICY IF EXISTS "Client can update post item status" ON public.post_items;

CREATE POLICY "Admin full access on post_items"
  ON public.post_items FOR ALL
  USING (public.is_admin());

CREATE POLICY "Operator sees own agency post items"
  ON public.post_items FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.posts WHERE client_id IN (
        SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
      )
    )
  );

CREATE POLICY "Operator can insert post items for own agency"
  ON public.post_items FOR INSERT
  WITH CHECK (
    post_id IN (
      SELECT id FROM public.posts WHERE client_id IN (
        SELECT id FROM public.clients WHERE agency_id = public.my_agency_id()
      )
    )
  );

CREATE POLICY "Client can view own post items"
  ON public.post_items FOR SELECT
  USING (
    post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id())
  );

CREATE POLICY "Client can update post item status"
  ON public.post_items FOR UPDATE
  USING (post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id()))
  WITH CHECK (post_id IN (SELECT id FROM public.posts WHERE client_id = public.my_client_id()));

-- ─── Notifications: operators can also insert ────────────────────────────────
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_staff());
