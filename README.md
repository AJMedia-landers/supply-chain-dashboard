# Supply Chain Dashboard

Next.js (App Router, TypeScript, MUI) app for the supply chain dashboard.
Auth (login / signup / email-verify / password reset) is wired to the existing
campaign-creation backend at `NEXT_PUBLIC_API_BASE_URL`.

## Setup

```bash
npm install
```

`.env` sets the backend base URL:

```
NEXT_PUBLIC_API_BASE_URL=http://dev.ajmedia.io:8000/api
```

## Develop

```bash
npm run dev
```

Runs at http://localhost:3000.

## Auth

- The JWT is stored in `localStorage` and attached as `Authorization: Bearer <token>`
  by an axios request interceptor (`src/lib/api.ts`).
- A 401 response clears the token and redirects to `/login`.
- On load, `AuthContext` bootstraps the session: it exchanges a `?token=` one-time
  login token if present, otherwise validates an existing JWT via `/auth/profile`.
- Routes under the `(app)` group are gated by a client-side `ProtectedRoute`;
  unauthenticated users are sent to `/login`.
- Signup is restricted to `@ajmedia.io` email addresses.
