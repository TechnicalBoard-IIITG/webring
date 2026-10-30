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
- Repository discovery runs automatically at API startup and checks for due work every minute. Successful snapshots expire after one hour; failed refreshes back off. `npm run sync:github` in `backend/` also supports a separate scheduler. A server-only `GITHUB_TOKEN` raises GitHub's public API rate limit. The open repositories tab reloads hourly. Large directories drain through a bounded queue, so refresh completion depends on GitHub limits and job duration.
- Banner uploads accept GIF, PNG, JPEG and WebP up to 5 MB. Production requires persistent R2/S3-compatible storage; configure the placeholders in `backend/.env.banner.example`. Preserve existing banner URLs and files when moving hosts.

For production, use HTTPS and keep all credentials on the server.

## Vercel frontend and Render API

The frontend proxies `/backend/*` to `API_INTERNAL_URL`. This keeps the session cookie on the frontend domain, including Google OAuth, without changing the existing Next.js `/api/*` routes. The destination is configured at build time; rebuild Vercel after changing it.

Set these environment variables on Vercel for the production deployment:

```env
NEXT_PUBLIC_API_URL=https://iiitg-index.vercel.app/backend
API_INTERNAL_URL=https://webring-xosu.onrender.com
```

Set these on Render, retaining the existing Neon URLs, Google credentials, session secret and object storage settings:

```env
NODE_ENV=production
TRUST_PROXY=true
FRONTEND_URL=https://iiitg-index.vercel.app
ALLOWED_ORIGINS=https://iiitg-index.vercel.app
PUBLIC_API_URL=https://webring-xosu.onrender.com
GOOGLE_CALLBACK_URL=https://iiitg-index.vercel.app/backend/api/auth/google/callback
```

Register that exact `GOOGLE_CALLBACK_URL` as an authorized redirect URI on the Google OAuth web client. Deploy the proxy code, rebuild Vercel with its production environment variables, and redeploy Render after updating its settings. Do not use the direct Render callback for this deployment: OAuth must start and finish through the frontend proxy to retain its session cookie.

Check `https://iiitg-index.vercel.app/backend/api/health` for `{"status":"ok"}`, then verify Google login, profile loading, saving and logout with an institutional account. Local development can keep the localhost values in the example files. Vercel preview domains are not authorized by the production origin setting.

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

## Redis caching and read replicas

On Render, set `REDIS_URL` to a persistent Redis-compatible service (Render Key Value's internal URL in the same region, or a TLS `rediss://` URL from your provider). Keep it server-only. Set `REDIS_KEY_PREFIX` uniquely for each environment; the default is `webring:v1`. Configure Redis with a memory limit and an eviction policy such as `allkeys-lru`.

Public directory pages, filters and individual profiles are cached in Redis for 60 seconds. Concurrent identical misses share a database read within each API process. Only the public profile projection is cached: emails, account ownership, sessions and profile revisions stay out of Redis. Profile creation, edits, visibility changes, admin edits and banner changes rotate the cache generation before responding. Old entries expire naturally, and an older in-flight load cannot repopulate the active generation. Cache errors fall back to PostgreSQL; a failed invalidation can leave an existing entry visible until its 60-second TTL expires. Existing frontend aggregate directory caching can add up to 15 seconds for leaderboard consumers.

To enable read replicas, provision read-only compute endpoints for the **same Neon branch/database** in your database provider console. A new independent database or branch is not a replica. Put their pooled PostgreSQL URLs, comma-separated, in Render's `DATABASE_READ_URLS`; keep `DATABASE_URL` pointing at the primary and `DIRECT_URL` at the primary's direct migration endpoint. Start with one replica in the API's region, and size its connection budget for two connections per API process. No schema migration or data copy is needed in this application.

Cache misses distribute public member reads across replicas. Before using a replica, the API checks that its replay position has reached a current primary WAL position; lagging or unavailable replicas fall back to the primary. Authenticated reads, writes, transactions, sessions and GitHub sync jobs always use the primary. Leaving `DATABASE_READ_URLS` empty disables replica routing. Redis hits skip the database and replica checks entirely.

Redeploy Render after setting these values. Verify repeated `/api/members?limit=60&page=1` and `/api/members/<id>` requests, then edit a profile and confirm the next public response reflects the change. Test once with Redis unavailable and once with a replica unavailable: public reads should still succeed through PostgreSQL/the primary. Live Redis and replica infrastructure must be provisioned separately; adding environment variables alone does not create those services.

For hourly GitHub refreshes when the web service can sleep, configure an external hourly job (`0 * * * *`) with the backend working directory and `npm run sync:github`, using the same primary database and `GITHUB_TOKEN`. An in-process timer cannot run while Render suspends the service. Existing successful six-hour snapshots are eligible once they are an hour old; failure backoff is retained.
