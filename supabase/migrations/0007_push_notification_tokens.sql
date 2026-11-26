-- Migration: 0007_push_notification_tokens.sql
-- Description: Store native FCM / APNs device push tokens for Firebase Cloud Messaging notifications.

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  provider text NOT NULL DEFAULT 'fcm' CHECK (provider IN ('fcm', 'apns', 'expo')),
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_push_tokens_own" ON public.user_push_tokens;
CREATE POLICY "user_push_tokens_own" ON public.user_push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_push_tokens_staff_read" ON public.user_push_tokens;
CREATE POLICY "user_push_tokens_staff_read" ON public.user_push_tokens
  FOR SELECT TO authenticated
  USING (public.is_staff());
