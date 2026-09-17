# wordly

A small Expo + TypeScript word-games app with a production-oriented auth API and a daily clue game.

## Run

```bash
npm install
npm start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with Expo Go.

## Backend

Start PostgreSQL and the API from the project root:

```bash
cp server/.env.example server/.env
docker compose up -d postgres
npm run server:migrate
npm run server:dev
```

Set `EXPO_PUBLIC_API_URL` to the API's reachable address when running the mobile app. For a physical device, use your computer's LAN IP instead of `localhost`.

Examples:

```bash
# iOS simulator or Expo web on the same computer
EXPO_PUBLIC_API_URL=http://127.0.0.1:4000 npm start

# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 npm start

# Physical phone on the same Wi-Fi network
EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:4000 npm start
```

## Included

- Sign-in and account creation UI with email and password validation
- Server-issued refresh token persisted with `expo-secure-store`
- Argon2id password hashing and PostgreSQL-backed accounts
- Rotating refresh tokens and short-lived access JWTs
- No raw password is stored locally or on the server
- Home lobby with streak stats and game cards
- Playable Daily Clue puzzle with answer feedback

Daily Clue content and completion state are served by the authenticated API.
Add a row to `server/migrations/002_daily_clues.sql` (or a later migration) for
each production puzzle date before releasing that day.

The API implementation and deployment notes are in [server/README.md](server/README.md). Use a managed PostgreSQL instance, HTTPS, restricted CORS, and a secrets manager before deploying publicly.
