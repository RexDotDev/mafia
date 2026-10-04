# mafia
Real-time browser Mafia party game: players join a 6-digit room on their own devices, get secret roles, and play night/voting rounds run by a narrator (a player picked at random). English UI, MIT, repo `RexDotDev/mafia`.

## Stack
React 19 + TypeScript 5.8 + Vite 6, Tailwind 3 via PostCSS, Font Awesome from CDN. Backend: Vercel serverless functions in `api/` + Supabase Postgres (`@supabase/supabase-js`, server side only). Vitest 3. npm, Node >= 22.12.

## Commands
- `npm ci`, then `npx vercel dev` for frontend + `/api` (README: required, needs `.env.local`)
- `npm run dev` Vite on :3000, frontend only (`/api/*` is not served); `npm run build`, `npm run preview`
- `npm run typecheck` (`tsc --noEmit`), `npm test` (`vitest run`), `npm run test:watch`. No lint script.
- CI runs ci, typecheck, test, build on PRs and `main` (`.github/workflows/ci.yml`).

## Structure (flat, no `src/`)
- `App.tsx` (~1300 lines) root: all state, 2 s polling, API calls, session restore, screen switching
- `components/` presentational screens and cards + `Modals/` (GameResult, MafiaChat, VoteSummary): props in, callbacks out
- `types.ts` shared by client and `api/` (Role enum, RoundState, ...); `constants.tsx` role icons/text; `utils/gameUtils.ts` custom-role helpers; `hooks/useTheme.ts`
- `services/roomApi.ts` typed `fetch` wrapper per endpoint
- `api/rooms/{state,join,leave,start,confirm,settings,reset,cleanup}.ts` + `api/rooms/round/{start,action,vote,resolve}.ts` = 12 functions
- `server/` server-only helpers (not functions): `supabase.ts` service-role client, `roomUtils.ts` (`sanitizeSettings`, `normalizeRoomCode`, `MAX_PLAYERS_PER_ROOM` = 20), `roundState.ts`
- `supabase/schema.sql` (only schema file), `tests/gameRules.test.ts` (only test file), tokens in `index.css`

## Architecture
- The browser never talks to Supabase: RLS is on and anon/authenticated grants are revoked. Every read and write goes through `api/` with the service-role key. No Realtime.
- Sync is polling: `App.tsx` POSTs `/api/rooms/state` every 2 s. That endpoint also bumps `players.last_seen` and returns a per-caller projection: own role only (Mafia also see teammates, narrator sees all), own actions/votes only, events and `lastResult` narrator-only, graveyard chat for eliminated players + narrator, Mafia chat for living Mafia at night + narrator.
- Auth is `roomCode` + `clientId` (random UUID in localStorage) matched to `players.client_id`; no sessions or JWT. Host-only: `start`, `settings`, `reset` (`is_host`). Narrator-only: `round/start`, `round/resolve` (`is_narrator`). `cleanup` needs `Authorization: Bearer $CRON_SECRET`. New routes must authenticate the caller and return only what it may see.
- `rooms.status`: `waiting` (first `join` with `settings` creates the room) -> `started` (roles dealt) -> `finished` = every role confirmed, NOT game over; `round/*` require it.
- Round state is `rooms.settings.roundState` (jsonb): phase `idle -> night -> voting -> idle`. `round/action` takes night actions, graveyard chat (`message`) and Mafia chat (`chatScope: 'mafia'`). `round/resolve` applies the night (Silencer, Doctor, Detective, Mafia kill) and opens voting or ends the game; the last `round/vote` resolves the vote. Winner is `roundState.gameResult`. `casualMode` (role-only) makes `round/*` return 409.

## Conventions
- English only: UI, API errors, and event messages stored in `roundState`. Old Serbian role names are mapped by `normalizeRoleName` (`types.ts`); pass every DB `role` through it. `Role.LADY` is the string `'Silencer'`; custom roles are free text with no night action.
- Handlers: `export default async function handler(req: any, res: any)`, POST only (`cleanup` also GET), local `toJson`, JSON `{ data }` or `{ error }`, codes via `normalizeRoomCode`.
- Imports in `api/` and `server/` need the `.js` suffix (ESM), including `../../types.js`; client code has none.
- Components stay presentational; state and API calls live in `App.tsx`. Style with Tailwind plus CSS variables from `index.css` (`data-theme` light/dark); new source dirs must be added to `content` in `tailwind.config.js`.
- localStorage keys: `mafia_client_id`, `mafia_session_v2` (auto-rejoin), `mafia_theme_v1` (also read by the inline script in `index.html`).
- Changes land via PRs (template: typecheck, build, security impact). Never commit env files, room or player data.

## Deploy
Vercel; `vercel.json` has no build settings. It defines cron `0 3 * * *` -> `/api/rooms/cleanup` (deletes players unseen for 20 min, then empty rooms) and security headers with a strict CSP (`connect-src 'self'`; styles and fonts only from cdnjs, Google Fonts), so any new external host needs a CSP edit. The schema is applied by hand: run `supabase/schema.sql` in the Supabase SQL editor (idempotent, no migrations).

## Gotchas
- Env var names: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (>= 16 chars, Vercel Cron sends it as Bearer); `.env.local` is gitignored, template is `.env.example`. Never use a `VITE_` prefix for secrets. Do not print env values.
- 12 handler files; commit `109e2b7` folded endpoints to fit the Vercel Hobby function limit. Check the limit before adding a 13th; helpers go in `server/`, not `api/`.
- `normalizeRoundState` is duplicated (`server/roundState.ts`, `App.tsx`) and so is `evaluateWinner` (`round/resolve.ts`, `round/vote.ts`): edit both copies. `tests/gameRules.test.ts` re-implements those rules rather than importing them, so it does not cover `api/`.
- Round writes read-modify-write the whole `settings` jsonb with no locking; simultaneous actions, votes or chat messages can overwrite each other.
- `sanitizeSettings` forces `doctor` and `detective` on and clamps `mafiaCount` 1-10 and custom roles (max 10, name <= 24 chars). `start` needs >= 2 players and picks the narrator among all players, host included.
- Join/create rate limiting is not in this repo (README says hosting layer); room cap is 20 players.
