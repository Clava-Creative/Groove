-- ─── Allow operators to delete their own agency's clients ─────────────────────
-- Migration 003 granted operators SELECT, INSERT, UPDATE on clients.
-- Operators now need DELETE too so they can remove clients from their agency.

CREATE POLICY "Operator can delete own agency clients"
  ON public.clients FOR DELETE
  USING (
    public.is_staff() AND agency_id = public.my_agency_id()
  );
