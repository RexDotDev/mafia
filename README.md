<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://example.invalid

## Supabase Setup (Required)

1. Create a Supabase project.
2. Run the SQL from `supabase/schema.sql` in the SQL editor.
3. Copy these keys:
   - Project URL
   - `anon` public key
   - `service_role` key (server-only)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the env vars in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY` (optional)
3. Run the app (frontend only):
   `npm run dev`

> Note: For local API routes, use `vercel dev` so the `api/*` functions run locally.

## Deploy to Vercel

1. Import the repo into Vercel.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Add the same environment variables from `.env.local` in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
