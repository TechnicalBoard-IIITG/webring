# IIITG Index

A minimal directory of student portfolios and GitHub profiles from IIIT Guwahati.

### Website

[IIITG Index](https://iiitg-index.vercel.app)

## Development

Requires Node.js 20.9+ and PostgreSQL. The Next.js frontend and Express API live in the same repository.

```sh
npm ci
npm --prefix backend ci
```

Copy `.env.local.example` to `.env.local` and `backend/.env.example` to `backend/.env`, then fill in your local configuration. Use Neon's pooled `DATABASE_URL` for requests and its direct `DIRECT_URL` for migrations. Configure Google OAuth with `http://localhost:4000/api/auth/google/callback` as the development callback.

Prepare the API database:

```sh
cd backend
npm run db:generate
npm run db:deploy
```

Run the frontend and API in separate terminals:

```sh
# Repository root: http://localhost:3000
npm run dev
```

```sh
# backend/: http://localhost:4000/api/health
npm run dev
```

On Windows with restricted PowerShell scripts, use `npm.cmd` in place of `npm`.

## Profiles and data

The directory, LinkedIn section, repositories and leaderboards are public. Students sign in with a verified `@iiitg.ac.in` Google account to edit their profile. A unique legacy email match links an existing profile to its owner.

PostgreSQL is the source of truth. Keep `data/members.json` as the legacy archive; do not reimport it into a populated database. Before deploying migrations, take a backup and retain a Neon recovery point. Migrations are additive; do not reset the database.

```sh
# Run in backend/
npm run db:backup
npm run db:verify -- ../.local-backups/<backup-directory>/database.json
```

Backups, environment files, uploads and dependency/build directories stay out of Git. Database snapshots contain private data and should be stored securely. Back up banner files separately.

## External data and banners

- GitHub and LeetCode leaderboards use the last seven UTC days; Codeforces uses current ratings. Missing provider data is shown as unavailable. The frontend and API need outbound HTTPS access.
- The repository view selects up to two popular repositories per member pushed in the last 30 days, excluding profile README repositories and, by default, forks.
- GitHub languages use a cached sample of up to ten original, active public repositories under 100 MB. Percentages describe code-byte shares; the sidebar excludes HTML and CSS. Generated or vendored code may be included by GitHub's language API.
- Repository discovery runs automatically at API startup and checks again every 15 minutes. Successful snapshots expire after six hours; failed refreshes back off. `npm run sync:github` in `backend/` also supports a separate scheduler. A server-only `GITHUB_TOKEN` raises GitHub's public API rate limit.
- Banner uploads accept GIF, PNG, JPEG and WebP up to 5 MB. Production requires persistent R2/S3-compatible storage; configure the placeholders in `backend/.env.banner.example`. Preserve existing banner URLs and files when moving hosts.

For production, use HTTPS, configure allowed origins and the Google callback, and host the frontend/API under compatible sites for session cookies. Keep all credentials on the server.

## Checks

```sh
# Repository root
npm run typecheck
npm run lint
npm run build

# backend/
npm run typecheck
npm run build
npm test
npm run test:smoke
```

The smoke check requires the API and its database to be running.
