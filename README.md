# 2FA Authenticator

A small MERN-style authentication project with password login, HTTP-only JWT cookies, refresh-token rotation, and authenticator-app based two-factor authentication.

## Features

- User signup with username, email, and password
- Password login with access and refresh tokens in HTTP-only cookies
- Refresh token hashes stored in MongoDB
- Protected profile page
- TOTP setup with QR code and manual key
- One-time recovery codes for 2FA login
- 2FA disable and reconfiguration flow
- Server-side 2FA login challenge before full session cookies are issued
- 2FA enabled timestamp on the profile page
- Basic rate limiting for auth and 2FA-sensitive routes
- Origin checks for cookie-authenticated API writes
- Responsive 2FA modal for smaller screens

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT, bcrypt, HTTP-only cookies
- 2FA: OTPAuth, QRCode
- Frontend: React, Vite, React Router

## Project Structure

```text
backend/
  server.js              Express API, Mongo models, auth and 2FA routes
  .env.example           Backend environment template

frontend/
  src/
    App.jsx              Routes and session bootstrap
    pages/               Login, signup, profile and 2FA UI
    lib/                 API base URL and authenticated fetch helper
  .env.example           Frontend environment template
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB connection string

## Quick Start

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Environment Variables

Backend, in `backend/.env`:

```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/2fa_auth
CLIENT_ORIGIN=http://localhost:5173

JWT_SECRET=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

TWO_FA_CHALLENGE_EXPIRES=5m
TWO_FA_ENCRYPTION_KEY=replace_with_a_long_random_2fa_encryption_key

COOKIE_SECURE=false
```

Frontend, in `frontend/.env`:

```bash
VITE_API_BASE=http://localhost:4000

# Optional local development autofill values.
# VITE_DEV_USERNAME=
# VITE_DEV_PASSWORD=
```

Use strong unique values for `JWT_SECRET` and `TWO_FA_ENCRYPTION_KEY`. Changing `TWO_FA_ENCRYPTION_KEY` after users enable 2FA will make the stored 2FA secrets unreadable.

`CLIENT_ORIGIN` is used by CORS and by the origin check for unsafe API requests. For multiple frontend origins, separate them with commas.

## API Endpoints

```text
GET  /health

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me

GET  /api/2fa/status
POST /api/2fa/setup
POST /api/2fa/verify-setup
POST /api/2fa/disable
POST /api/2fa/cancel-setup
POST /api/2fa/verify-login
```

Protected routes use the `access_token` cookie. The frontend `authFetch` helper retries once through `/api/auth/refresh` when an access token expires.

## Auth And 2FA Flow

1. Register creates the user, hashes the password, and issues access and refresh cookies.
2. Login checks username and password.
3. If 2FA is not enabled, login issues access and refresh cookies immediately.
4. If 2FA is enabled, login sets only a short-lived `two_factor_challenge` cookie and returns `requiresTwoFactor: true`.
5. `/api/2fa/verify-login` validates either the authenticator code or an unused recovery code.
6. After successful 2FA verification, the backend issues the full access and refresh cookies and clears the challenge cookie.
7. Recovery codes are hashed in MongoDB and can be used only once.

## Security Controls

- Login, signup, refresh, 2FA setup, and 2FA verification routes have in-memory rate limits.
- Cookie-authenticated unsafe API requests must come from `CLIENT_ORIGIN` through the `Origin` or `Referer` header.
- Security headers disable MIME sniffing, framing, referrer leakage, and unused browser permissions.
- TOTP verification accepts only the current 30-second code window.
- Recovery codes are generated once, hashed before storage, and marked used after successful login.

The rate limiter is in-memory, so it resets when the server restarts.

## Verification

Commands used to check the current project:

```bash
cd backend
node --check server.js
npm audit --omit=dev

cd ../frontend
npm run build
npm audit --omit=dev
```

Current result: backend syntax check passed, frontend production build passed, and both npm audits reported 0 vulnerabilities.

## Production Notes

- Use HTTPS and set `COOKIE_SECURE=true` in production.
- Keep `JWT_SECRET` and `TWO_FA_ENCRYPTION_KEY` out of source control.
- Use a managed MongoDB instance or a properly backed-up database.
- Review CORS and cookie same-site settings before deploying frontend and backend on different domains.
