# Phone low-stock alerts — one-time setup

1. Install the CLI and link: `supabase login && supabase link --project-ref <PROJECT_REF>`
2. Secrets (VAPID keys + webhook secret are already generated in `supabase/functions-env.local`, which is git-ignored):
   `supabase secrets set --env-file supabase/functions-env.local`
3. Deploy: `supabase functions deploy low-stock-push --no-verify-jwt`
4. In `migrations/00003_push_notifications.sql` replace `<PROJECT_REF>` and `<WEBHOOK_SECRET>`
   (the WEBHOOK_SECRET value is in `functions-env.local`), then run it in the SQL editor.
5. Hosting (Vercel): add env var `VITE_VAPID_PUBLIC_KEY` (same as in `.env`) and redeploy.
6. On each phone: open the site, **Add to Home Screen** (required on iPhone), open the app,
   tap the bell → **Turn on phone alerts**.
