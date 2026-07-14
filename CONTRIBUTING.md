# Contributing

Thanks for helping improve Mafia Night Game.

1. Open an issue before starting a substantial behavior or data-model change.
2. Fork the repository and create a focused branch.
3. Run `npm ci`, `npm run typecheck`, and `npm run build`.
4. Open a pull request describing the behavior change, security impact, and validation performed.

Never commit real environment files, credentials, production database exports, room data, player data, or personal information. New API routes must authenticate the requesting player or cron invocation and return only the data that caller is allowed to see.
