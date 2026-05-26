-- ─── Fix 1: Storage — allow operator (staff) to upload and delete media ───────
-- The original policy only allowed admin. Operators need to upload for their clients.

DROP POLICY IF EXISTS "Admin can upload media" ON storage.objects;
CREATE POLICY "Staff can upload media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'groove-media'
    AND public.is_staff()
  );

DROP POLICY IF EXISTS "Admin can delete media" ON storage.objects;
CREATE POLICY "Staff can delete media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'groove-media'
    AND public.is_staff()
  );

-- ─── Fix 2: Notifications — allow clients to insert (when they approve/reject) ─
-- The previous policy only allowed staff (admin + operator).
-- Clients need to notify operators/admins when they review content.

DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
