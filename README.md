# ShopTalk — MERN E-Commerce + Real-time Chat

A full-stack marketplace (Express 5 + MongoDB + Vite/React 19) with an integrated
**real-time buyer↔store chat** (Socket.io), Razorpay payments (INR), an admin
analytics dashboard, content moderation, a seller role, and refresh-token auth.

## Features

- **Real-time chat** — JWT-authed Socket.io, presence, typing, read receipts, live order cards (single-vendor buyer↔store).
- **E-commerce** — products (search/filter/categories), Redux cart, Razorpay checkout (₹), order history.
- **Seller role** — sellers CRUD their own products via a seller dashboard.
- **Admin** — analytics (Recharts: revenue, top products, trend, conversion) + moderation (ban users, flag/remove products).
- **Auth** — short-lived access JWT + httpOnly refresh-token rotation with axios auto-retry.
- **Security** — helmet, CORS whitelist, express-validator, rate limiting, Razorpay webhook.
- **Tests** — Jest + Supertest + mongodb-memory-server.

## Local development

```bash
# Backend (from /backend) — env at backend/env/.env (see env/.env.example)
npm install
npm start          # nodemon index.js  → http://localhost:3000
npm run seed       # populate demo products
npm test           # Jest + Supertest

# Frontend (from /frontend)
npm install
npm run dev        # Vite → http://localhost:5173 (proxies /api + /socket.io)
npm run build
```

Backend needs MongoDB, Redis (optional — app runs without cache), Cloudinary,
and Razorpay credentials in `backend/env/.env`.

## Deployment

> ⚠️ The backend uses WebSockets (Socket.io), so it must run on a **persistent
> host (Render/Railway)** — **not** Vercel serverless. Deploy the frontend
> (static) on Vercel and the backend on Render.

### 1. Backend → Render (via blueprint)

The repo includes [`render.yaml`](render.yaml).

1. **render.com → New → Blueprint**, connect this repo. Render reads `render.yaml`
   (Node web service, root `backend`, `node index.js`, health check `/api/health`).
2. In the service's **Environment** tab, add the secrets (the `sync:false` keys):
   `MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET`, `REDIS_URL`, `PAYMENT_API_KEY`,
   `PAYMENT_API_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLIENT_URL` (your frontend
   origin, comma-separated). `ACCESS_EXPIRES_IN`/`REFRESH_EXPIRES_IN`/`NODE_ENV`
   are preset in the blueprint.
3. **Create** → note the URL, e.g. `https://shoptalk-backend.onrender.com`.
4. MongoDB Atlas: allow Render's IPs (or `0.0.0.0/0` for a demo) in Network Access.

### 2. Frontend → Vercel

1. Import the repo on Vercel; set **Root Directory** to `frontend` (build `npm run
   build`, output `dist`).
2. Add env var **`VITE_API_URL`** = `https://shoptalk-backend.onrender.com/api`
   (both REST and the socket read this; see `frontend/.env.example`).
3. Deploy → note the URL, e.g. `https://shoptalk.vercel.app`.

### 3. Wire them together

- Set the backend's **`CLIENT_URL`** to the Vercel URL (CORS + Socket.io origin +
  cross-origin cookies). Redeploy the backend if you change it.
- Razorpay Dashboard → **Webhooks** → add
  `https://shoptalk-backend.onrender.com/api/orders/v1/webhook`, set the signing
  secret, and put the same value in `RAZORPAY_WEBHOOK_SECRET`.
- Create one **admin** account (the "store" for chat) by registering a user and
  flipping its `role` to `admin` in MongoDB (public signup only allows
  `user`/`seller`).

Render's free tier sleeps after ~15 min idle (first request wakes it in ~30s).

## Project layout & conventions

See [`CLAUDE.md`](CLAUDE.md) for the full architecture, conventions, and
per-feature breakdown, and [`FEATURE_PLAN.md`](FEATURE_PLAN.md) for roadmap status.
