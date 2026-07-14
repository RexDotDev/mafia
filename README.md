# Mafia Night Game

A browser-based implementation of the Mafia party game with rooms, role assignment, night actions, voting, narrator controls, and optional in-game chat.

## Security model

- Browser clients never receive the Supabase service-role key.
- Supabase tables have row-level security enabled and no direct browser read policy.
- The serverless state endpoint returns a player-specific projection: a player sees their own role, Mafia teammates can see one another, and the narrator can see the full game state.
- The cleanup cron endpoint requires Vercel's `CRON_SECRET` bearer token.
- No AI provider or client-side API key is required.

The browser stores a random client identifier in local storage. Treat room codes as invitations and do not reuse them for sensitive authentication.

## Local setup

Requirements: Node.js 22.12+, npm, a Supabase project, and the Vercel CLI.

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env.local` and add your own values.
3. Install and run the application:

```bash
npm ci
npx vercel dev
```

`vercel dev` is required because the application uses the serverless routes in `api/`.

## Environment variables

- `SUPABASE_URL` — server-side Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-only service-role key
- `CRON_SECRET` — random value of at least 16 characters used by Vercel Cron

Never prefix a server secret with `VITE_`; Vite-prefixed variables are exposed to browser bundles.

## Quality checks

```bash
npm run typecheck
npm run build
```

## Deployment

Import the repository into Vercel, add the three server-side variables above, and deploy. If any credential was previously exposed, rotate it at the provider before deploying again.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
