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

## Recommended Improvements

- Add rate limiting for login, refresh, TOTP verification, and recovery-code verification.
- Add CSRF protection for cookie-authenticated POST routes.
- Add automated backend tests for register, login, refresh, 2FA setup, 2FA login, and recovery-code reuse.
- Add frontend tests for the login challenge, expired-session retry, and 2FA profile actions.
- Make modal styling more responsive for small mobile screens.
- Split `backend/server.js` into models, middleware, controllers, and route modules if the API grows further.

## Production Notes

- Use HTTPS and set `COOKIE_SECURE=true` in production.
- Keep `JWT_SECRET` and `TWO_FA_ENCRYPTION_KEY` out of source control.
- Use a managed MongoDB instance or a properly backed-up database.
- Review CORS and cookie same-site settings before deploying frontend and backend on different domains.
