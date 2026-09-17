# Wordgames API

Fastify + PostgreSQL authentication service for the Expo app.

## Local development

```bash
cp .env.example .env
docker compose up -d postgres
npm run migrate
npm run dev
```

The API listens on `http://localhost:4000`.

Set `TRUST_PROXY=true` only when the API is behind a trusted reverse proxy
that overwrites forwarding headers.

`ADMIN_API_KEY` is optional for local development, but required to use the
admin routes. Set it to a random value of at least 32 characters. The server
does not expose admin routes successfully when this key is missing.

- Open [http://localhost:4000](http://localhost:4000) for the browser status page.
- Open [http://localhost:4000/health](http://localhost:4000/health) for the machine-readable health check.

## Daily clue administration

Set a long random `ADMIN_API_KEY` in `server/.env`. Keep this key in a secrets
manager in production and never ship it in the mobile app. The admin API is
available at `/v1/admin/daily-clues`.

List the catalog:

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
	http://localhost:4000/v1/admin/daily-clues
```

Add a clue for a future date:

```bash
curl -X POST -H "X-Admin-Key: $ADMIN_API_KEY" \
	-H "Content-Type: application/json" \
	-d '{"clueDate":"2026-10-17","clue":"A place where ...","answer":"EXAMPLE"}' \
	http://localhost:4000/v1/admin/daily-clues
```

Update or remove a clue with `PUT` or `DELETE`:

```bash
curl -X PUT -H "X-Admin-Key: $ADMIN_API_KEY" \
	-H "Content-Type: application/json" \
	-d '{"clue":"A revised clue ...","answer":"EXAMPLE"}' \
	http://localhost:4000/v1/admin/daily-clues/2026-10-17

curl -X DELETE -H "X-Admin-Key: $ADMIN_API_KEY" \
	http://localhost:4000/v1/admin/daily-clues/2026-10-17
```

The seeded catalog contains a month of sample clues. Add future content before
each release day so the player endpoint always has a puzzle available.

The player endpoint uses PostgreSQL `CURRENT_DATE`. Keep the database timezone
and your publishing schedule aligned so the daily puzzle changes at the
intended midnight.

## Auth design

- Passwords are hashed with Argon2id and never stored or logged in plaintext.
- Access tokens are signed JWTs with a short lifetime (`15m` by default).
- Refresh tokens are random, single-use values. Only their SHA-256 hashes are stored in PostgreSQL.
- Refresh requests rotate the token and revoke the previous token.
- Auth endpoints have a stricter rate limit than general API traffic.
- Helmet, CORS, request validation, body limits, and generic error responses are enabled.
- `/health` checks PostgreSQL connectivity and returns `503` when the database is unavailable.

## Validation

```bash
npm run build
```

For production, provide a managed PostgreSQL URL, a generated `JWT_SECRET` of at least 32 characters, a restricted `CORS_ORIGIN`, HTTPS termination, and a proper secrets manager. Run `npm run server:build` and start the generated `dist/server.js` process.
