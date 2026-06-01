# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

A MERN e-commerce marketplace (roadmap codename: **ShopTalk**). Monorepo with an Express/MongoDB backend and a Vite + React 19 frontend. The end goal (per `shoptalk_build_roadmap.html`) is an e-commerce platform with an integrated **real-time chat system** between buyers and sellers — the chat layer is the headline differentiating feature and is **not yet built**.

## Repository Layout

```
/backend          Express 5 + Mongoose API (ESM, "type":"module")
  index.js        Entry: loads env, connects Mongo + Redis, creates http server + Socket.io
  src/app.js      Express app: mounts /api routers, error middleware, serves frontend dist
  src/socket/     socket.manager.js (JWT-auth handshake, rooms, presence, getIO()), order.events.js (emitOrderPaid/emitOrderStatusChanged)
  config/         db, redis, cloudinary, multer, nodemailer, rateLimit
  controllers/    auth/, product/, user/ (one file per action), order.controller.js, conversation.controller.js, analytics.controller.js
  middleware/     verifyToken, isAdmin, error
  models/         user, product, order, conversation, message
  routes/         auth, product, order, users, conversation, analytics  (versioned: /api/<x>/v1/...)
  services/       payment.service.js (Razorpay)
  utils/          asyncHandler, ApiError, cloudinary, email, productSeeder, jwt.utils (verifyAccessToken)
/frontend         Vite + React 19 + Tailwind v4
  src/
    pages/        Home, Login, Signup, Profile, Cart, Checkout, Orders, Categories
    admin/        AdminLayout + pages (Dashboard, AdminUsers, AdminProducts, AdminOrders)
    components/   Navbar, FilterSidebar, ProtectedRoute
    context/      AuthContext, SearchContext, SocketContext  (auth lives in Context, NOT Redux)
    store/        Redux Toolkit — cart only (cartSlice) + redux-persist
    hooks/        useAuth, useSearch, useSocket, useStartChat
    pages/        ...Chat.jsx (chat list + window, real-time)
    utils/        api.js (axios instance, attaches Bearer token from localStorage)
```

## Run / Build

```bash
# backend (from /backend) — env file is at backend/env/.env
npm start          # nodemon index.js
npm run seed       # node utils/productSeeder.js — populate demo products

# frontend (from /frontend)
npm run dev        # vite dev server (proxies /api to backend)
npm run build      # vite build -> dist (backend serves this in prod)
npm run lint       # eslint
```

There is **no test suite** yet (`backend` test script is a placeholder).

## Conventions (match these)

- **ESM everywhere** in backend (`import`/`export`, `.js` extensions required in import paths).
- **Controllers** are wrapped in `asyncHandler` and throw `ApiError(status, message)` for failures; the central `error.middle.js` formats the response.
- **API responses** use the shape `{ success, message?, data | user, ... }`.
- **Routes are versioned**: `/api/auth/v1`, `/api/users/v1`, `/api/orders/v1`, `/api/products/v1`.
- **Auth**: JWT signed with `JWT_SECRET`, returned both in an httpOnly `token` cookie *and* in the JSON body. Frontend stores it in `localStorage` and sends it as a `Bearer` header via the axios interceptor in `utils/api.js`. There is currently **no refresh-token rotation** — single access token.
- **Roles**: `user` and `admin` only (see `user.model.js`). There is **no `seller` role** yet.
- **Payments**: **Razorpay** (not Stripe). Flow = create order (`paymentStatus:"pending"`) → open Razorpay modal → `POST /verify-payment` verifies signature server-side → mark `completed`. There is **also** a server-to-server webhook (`POST /api/orders/v1/webhook`, raw-body HMAC verified) that marks orders paid/failed independently — see "Security".
- **Frontend state**: auth via React Context (`AuthContext`); cart via Redux Toolkit + redux-persist. Don't move auth into Redux without reason.
- **Styling**: Tailwind v4 (via `@tailwindcss/vite`), `lucide-react` icons, `framer-motion`, `clsx`/`tailwind-merge`.

## Real-time Chat (implemented)

Single-vendor model: every buyer chats with **the store** (an `admin` account). Built on Socket.io sharing the Express HTTP server.

- **Models**: `Conversation` (participants, optional `product` context, `lastMessage`/`lastMessageAt`, `unreadCounts` Map<userId,count>) and `Message` (`conversation`, `sender`, `text`, `type: "text"|"image"|"file"|"order_card"`, `metadata`, `orderRef`, `readBy`). `User` gained `isOnline` + `lastSeen`.
- **REST** (`/api/conversations/v1`, all auth-guarded): `POST /` find-or-create buyer↔store convo (optional `{ productId }`); `GET /` my convos w/ unread counts; `GET /:id/messages` paginated history; `PATCH /:id/read` mark read.
- **Socket.io** (`src/socket/socket.manager.js`): handshake JWT auth (`socket.handshake.auth.token` via `verifyAccessToken`), `socket.user = { id, role }`. Rooms: `user:<id>` (personal) + `conv:<conversationId>`. Events — client→server: `join_conversation {conversationId}`, `send_message {conversationId,text,type?,metadata?}` (persist→broadcast), `message_read {conversationId,messageIds?}`, `typing_start`/`typing_stop {conversationId}`. Server→client: `receive_message`, `conversation:updated`, `messages_read`, `joined_conversation`, `user:online`/`user:offline`, `typing_start`/`typing_stop`. Presence has a **10s disconnect grace** + multi-tab tracking. `getIO()` exposes the instance to controllers.
- **Order integration** (`src/socket/order.events.js`, called from `order.controller.js`): `emitOrderPaid` / `emitOrderStatusChanged` are **hybrid** — they persist an `order_card` message into the buyer↔store chat (shows in history) **and** emit transient `order:paid` / `order:status_changed` to the participants' personal rooms (live toast).
- **Frontend**: `SocketContext` opens one authed socket while logged in; `useSocket` / `useStartChat` hooks; `pages/Chat.jsx` (list + window + product-context card + presence dots + typing + "Seen" receipts; sidebar driven by `conversation:updated`). Entry points: chat icon in `Navbar`, and a "Contact Store" button on each product card in `Home.jsx`.
- **Dev**: Vite proxies `/socket.io` (ws:true) → backend. **Prod**: must run on a persistent host (Render/Railway), NOT Vercel serverless. `CLIENT_URL` env sets Socket.io CORS origin.

## Important Gaps vs. Roadmap (intended future work)

These exist in `shoptalk_build_roadmap.html` but are **not implemented** — see `FEATURE_PLAN.md`:

1. **Seller role & seller dashboard** — only `user`/`admin` exist; products are admin-only CRUD. (Chat is single-vendor for now.)
2. **Tests** — Jest + Supertest integration tests for auth/product/checkout.
3. **Refresh-token pattern**.

(Security hardening — helmet, cors whitelist, express-validator, Razorpay webhook — and admin analytics + moderation are all **done**, see below.)

## Admin Moderation (implemented)

- **Users** (`User.isBanned`): `PATCH /api/users/v1/:id/ban` (admin) bans/unbans; banned users are blocked at **login** (403). `DELETE /api/users/v1/:id` (admin) removes a user. Admins can't be banned/deleted, and you can't act on your own account. `GET /api/users/v1/allusers` is now **admin-guarded** (was missing `isAdmin`). Self-service `PUT /update` + `DELETE /delete` are unchanged.
- **Products** (`Product.isFlagged`, `flagReason`): `POST /api/products/v1/:id/report` (any logged-in user) flags a product with a reason; `PATCH /api/products/v1/:id/flag` (admin) clears/sets the flag; existing admin `DELETE /:id` removes it. Report/flag invalidate the `products:all` cache so admin sees changes immediately.
- **Frontend**: `AdminUsers` (ban/unban + banned badge, fixed delete → `DELETE /:id`), `AdminProducts` (flagged rows float to top, Flag badge, unflag + remove), and a **Report** (flag icon) button on each `Home` product card.

## Admin Analytics (implemented)

- **Backend**: `GET /api/analytics/v1/overview` (admin-guarded) in `analytics.controller.js` — MongoDB aggregation for revenue (`$sum` on completed-payment orders), paid/total orders, users, products, conversion rate, a gap-filled 30-day revenue trend, top-5 products (`$unwind` items → units + revenue), order-status breakdown, and recent orders.
- **Frontend**: `admin/pages/Dashboard.jsx` renders stat cards + **Recharts** (area = revenue trend, vertical bar = top products, donut = orders by status) + recent-orders table. Admin pages are **lazy-loaded** (`React.lazy` in `App.jsx`) so Recharts ships in a separate chunk, keeping the storefront bundle lean.

## Security (implemented)

- **`helmet`** in `src/app.js` with `contentSecurityPolicy: false` (the SPA loads the Razorpay checkout script + Cloudinary/Pexels images — a strict default CSP would block them) and `crossOriginResourcePolicy: cross-origin`.
- **`cors`** with an origin whitelist from `CLIENT_URL` (comma-separated); requests with no Origin (curl/mobile/same-origin) are allowed.
- **`express-validator`**: chains in `validators/{auth,product,order}.validator.js`, applied in routes before the controller, with `middleware/validate.middle.js` turning failures into a `400 ApiError`. (Rate-limiting via `express-rate-limit` already existed.)
- **Razorpay webhook**: `controllers/webhook.controller.js`, mounted at `POST /api/orders/v1/webhook` **before `express.json()`** (uses `express.raw` — signature HMAC needs the raw body). Verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`, then marks the order `completed`/`failed` (idempotent) and fires `emitOrderPaid`. **Note**: `nodemon` doesn't watch `.env`, so adding the secret requires a manual backend restart.

## Gotchas

- Import paths from `src/app.js` reach back into `../routes`, `../controllers` etc. — backend root is `/backend`, but `app.js` lives in `/backend/src`. Mind the `../` depth.
- `backend/cookies.txt` is a stray curl artifact, not config.
- Frontend dev relies on Vite proxying `/api` → backend (see `vite.config.js`). In production, Express serves the built `dist` and falls back to `index.html` for client routing.
- Razorpay keys, Cloudinary, Mongo URI, Redis, and SMTP creds all come from `backend/env/.env` (see `env/.env.example`).
