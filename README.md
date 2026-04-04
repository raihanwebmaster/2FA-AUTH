# 2FA AUTHENTICATOR

A clean MERN starter with signup/login and a JWT access + refresh token flow.

**Features**
- Signup with username, email, password
- Login with username + password
- Access token (short-lived) + refresh token (long-lived)
- Tokens stored in HTTP-only cookies
- Protected profile page

**Tech Stack**
- Node.js, Express
- MongoDB + Mongoose
- React (Vite)

**Project Structure**
- `backend/` API server
- `frontend/` React UI

**Quick Start**
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
npm run dev
```

**Environment Variables (backend/.env)**
```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/2fa_auth
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=change_this_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
```

**API Endpoints**
```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

**Auth Flow (short)**
- Login/Register returns user data and sets cookies.
- `access_token` is used for `/api/auth/me`.
- If access token expires, frontend calls `/api/auth/refresh` to rotate tokens.

**Notes**
- Refresh token is stored as a hash in MongoDB.
- For production, set cookie `secure=true` and use HTTPS.
