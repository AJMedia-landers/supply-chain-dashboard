# Supply Chain Dashboard

Next.js (App Router, TypeScript, MUI) app for the supply chain dashboard.
Auth (login / signup / email-verify / password reset) is wired to the existing
campaign-creation backend.

The browser never calls the backend directly. All requests go to the same-origin
Next.js proxy at `/proxy/*` (`src/app/proxy/[...path]/route.ts`), which forwards
them server-side to `API_PROXY_TARGET`. This keeps the browser on HTTPS and
avoids mixed-content blocking when the backend is served over plain HTTP.

## Setup

```bash
npm install
```

`.env` sets the backend base URL (server-side only — not exposed to the browser):

```
API_PROXY_TARGET=http://dev.ajmedia.io:8000/api
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
