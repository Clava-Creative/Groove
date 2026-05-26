-- ─── Add source column to insights (staff vs client-originated) ───────────────
-- 'staff' = operator/admin creates insight FOR the client (current flow)
-- 'client' = client sends an idea/suggestion TO the operator

ALTER TABLE public.insights
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff'
  CHECK (source IN ('staff', 'client'));

-- Allow clients to insert their own idea-type insights
-- Enforces: they can only insert for themselves, and source must be 'client'
CREATE POLICY "Client can insert own ideas"
  ON public.insights FOR INSERT
  WITH CHECK (
    client_id = public.my_client_id()
    AND source = 'client'
  );
