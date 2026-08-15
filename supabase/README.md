# Supabase setup

This app's egress is blocked to `*.supabase.co` from the dev/build sandbox, so
the project can't be provisioned automatically here. To wire up a real backend:

1. Create a project at https://supabase.com (free tier is fine to start).
2. In the Supabase SQL Editor, run the files in `supabase/migrations/` **in
   order** (`0001` → `0004`). Paste each file's contents and run it.
3. In Project Settings → API, copy the **Project URL** and **anon public
   key** into `.env.local` (see `.env.example`):
   ```
   VITE_SUPABASE_URL="https://xxxx.supabase.co"
   VITE_SUPABASE_ANON_KEY="ey..."
   ```
4. In Authentication → Providers, email/password auth is enabled by default —
   no change needed for the signup/login flow in this app.
5. For the AI coach feature, deploy the edge function and set its secret:
   ```
   supabase functions deploy ai-coach
   supabase secrets set GEMINI_API_KEY=your-gemini-key
   ```
   (Skip this if you don't need AI coach feedback yet — the rest of the app
   works without it.)

No service-role key is used anywhere in this app. All reads/writes go
through the anon/authenticated keys plus Row Level Security; the one
public/no-login read path (`get_public_board`) is a `SECURITY DEFINER` SQL
function, not a service-role client — never put a service-role key in
`VITE_`-prefixed env vars, it would ship into the browser bundle.
