# ALIWORLD

## local setup

1. clone the repo
2. `npm install`
3. `npm run dev`

Supabase config ships in the committed `.env` (public anon key only).
Real secrets, if ever needed, go in `.env.local` (gitignored) — never in `.env`.

## coming soon (play.dannyali.com)

1. Run `db/004_email_signups.sql` in Supabase SQL Editor.
2. Set `VITE_COMING_SOON=true` in **Cloudflare Pages production env** for `play.dannyali.com`.
3. Leave the flag **unset** on the `.pages.dev` preview URL so Danny + Ronnie can test the real game.
4. Update `BLNT_TRACK_URL` in `src/config/comingSoon.ts` with the public stream link.
5. At launch: remove the flag (or set `false`) to serve the game on the custom domain.

Local preview with coming-soon:

```bash
VITE_COMING_SOON=true npm run dev
```

## analytics (mothership dashboard)

Player events land in `aw_events`. RLS blocks cross-user reads, so the dashboard uses a **Supabase Edge Function** with the service role (server-side only) and returns **aggregates only**.

### One-time Supabase setup

1. Run SQL in order:
   - `db/003_analytics_summary_rpc.sql` (required)
   - `db/analytics_dashboard.sql` / `db/002_analytics_views.sql` (optional ad-hoc queries)
2. Deploy edge function:
   ```bash
   supabase functions deploy analytics-summary
   ```
3. Set edge function secrets (Dashboard → Edge Functions → analytics-summary):
   - `ANALYTICS_ADMIN_SECRET` — shared with the admin UI
   - `SUPABASE_SERVICE_ROLE_KEY` — if not auto-provided

### Local admin page (`/admin` build)

Separate Vite app — **not** included in `npm run build` for the player site.

```bash
# .env.local
VITE_ANALYTICS_ADMIN_SECRET=your-shared-secret

npm run admin:dev    # http://localhost:5174
npm run admin:build  # → dist-admin/
```

The admin page calls `analytics-summary` with the anon key + `x-analytics-admin-secret` header. **No service role in the browser bundle.**
