-- ============================================================
-- Migration 00003: phone push subscriptions + low-stock trigger
-- Before running: deploy the edge function (see supabase/PUSH_SETUP.md)
-- and replace <PROJECT_REF> and <WEBHOOK_SECRET> below.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_subscriptions') THEN
    CREATE POLICY "own_subscriptions" ON push_subscriptions
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Calls the edge function (via pg_net) when an ingredient reaches/falls below its alert level.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_low_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  PERFORM net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/low-stock-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '<WEBHOOK_SECRET>'),
    body    := jsonb_build_object('type', 'UPDATE', 'record', to_jsonb(NEW), 'old_record', to_jsonb(OLD)),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block a stock update because a notification failed
END $fn$;

DROP TRIGGER IF EXISTS low_stock_push ON inventory_items;
CREATE TRIGGER low_stock_push
  AFTER UPDATE OF current_stock, min_stock ON inventory_items
  FOR EACH ROW
  WHEN (NEW.current_stock <= NEW.min_stock)
  EXECUTE FUNCTION notify_low_stock();
