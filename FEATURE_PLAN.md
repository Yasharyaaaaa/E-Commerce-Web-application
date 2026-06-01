# ShopTalk — Feature Plan (Roadmap Gap Analysis)

Comparison of the current codebase against `shoptalk_build_roadmap.html`, and a concrete plan for the missing features.

## Where the project stands today

| Roadmap Phase | Status | Notes |
|---|---|---|
| **1. Setup + Auth** | ✅ Mostly done | Monorepo, MongoDB, JWT auth, `verifyToken` + `isAdmin` middleware, React auth via Context. ⚠️ No refresh-token rotation. Roles are `user`/`admin` only — **no `seller`**. |
| **2. E-commerce core** | ✅ Mostly done | Product CRUD (Cloudinary), listing + search + filter + categories, Redux cart, checkout, orders. ⚠️ Uses **Razorpay** (not Stripe), and **signature verification** instead of a **webhook**. Product CRUD is admin-only, not seller-driven. Product has single `image`, not `images[]`. |
| **3. Real-time chat** | ✅ **Done (single-vendor)** | `Conversation`/`Message` models, JWT-authed Socket.io, chat UI, presence, typing, read receipts, product-context card, live order cards. Buyer↔store (admin) model. See CLAUDE.md "Real-time Chat". |
| **4. Admin panel + analytics** | ✅ Done | Analytics dashboard (`$sum` revenue, top products, 30-day trend, orders-by-status, conversion via Recharts) **and** moderation: ban/unban users (`User.isBanned`, blocked at login), report/flag/unflag + remove products (`Product.isFlagged`). `/allusers` is now admin-guarded. |
| **5. Polish / tests / deploy** | 🟡 Hardening done | Deployed (Vercel + backend). **Security hardening done**: `helmet`, `cors` whitelist, `express-validator` on auth/product/order, Razorpay webhook. ⚠️ Still missing: tests (Jest+Supertest). |

## What to add (priority order)

### 🥇 Priority 1 — Real-time Chat System (the headline feature)

This is what makes the project stand out. Build it in this order:

**Backend**
1. **Models**
   - `Conversation`: `participants:[ObjectId→User]`, `product:ObjectId→Product` (optional context), `lastMessage`, `lastMessageAt`, timestamps. Index on `participants` and `lastMessageAt`.
   - `Message`: `conversation:ObjectId` (indexed), `sender:ObjectId→User`, `text`, `type: "text" | "order_card"`, optional `orderRef`, `readBy:[ObjectId]`, timestamps.
2. **REST routes** (`/api/conversations/v1`, all auth-guarded)
   - `POST /` → find-or-create conversation `{ otherUserId, productId? }`, returns conversation (this powers the **"Message Seller"** button).
   - `GET /` → list my conversations (populated with other participant + lastMessage + unread count).
   - `GET /:id/messages` → paginated message history (`limit`/`skip`).
3. **Socket.io server** (`backend/src/socket.js`, attach to the same HTTP server in `index.js`)
   - **Auth middleware**: `io.use(...)` verifying the JWT from `socket.handshake.auth.token` (reuse the verifyToken logic). Reject unauthenticated sockets.
   - **Rooms**: each conversation = room `room:<conversationId>`; join on connect for all my conversations.
   - **Message flow**: client emits `send_message` → **persist to DB first** → emit `receive_message` to the room → update `Conversation.lastMessage`.
   - **Presence**: add `isOnline:Boolean` + `lastSeen:Date` to `User`. On connect/disconnect update and broadcast to that user's conversations.

**Frontend**
4. Add `socket.io-client`; create a `SocketContext` that connects with the token and exposes the socket + presence map.
5. **Chat pages/components**: `ChatList` (sidebar of conversations w/ online dot + unread badge), `ChatWindow` (message list + composer), `ProductContextCard` (image/title/price banner at top when started from a product), `OrderCard` message renderer.
6. **"Message Seller" button** on the product detail view → `POST /api/conversations/v1` → navigate to `/chat/:id`.
7. Add `/chat` and `/chat/:id` routes (PrivateRoute) in `App.jsx`.

**Commerce ↔ chat integration**
8. When an order's status changes (`verify-payment` and admin `updateOrderStatus`), emit a `type:"order_card"` message into the buyer↔seller conversation and to room `order:<orderId>`. Chat renders it as a styled card ("Order #1234 has shipped!").

> ⚠️ **Deployment note**: Vercel serverless doesn't hold WebSocket connections well. Socket.io should run on the persistent backend host (Render/Railway), not on Vercel. Frontend connects to that backend URL.

### 🥈 Priority 2 — Seller role (unlocks the buyer↔seller premise)

- Extend `User.role` enum to `["user", "seller", "admin"]`; add a `roleMiddleware(...roles)` factory alongside `isAdmin`.
- Add `seller:ObjectId→User` to `Product`; let sellers CRUD **their own** products (not admin-only).
- Seller dashboard pages (mirror the admin layout): my products, my incoming orders, my conversations.
- Registration: allow choosing buyer vs seller (the roadmap's Phase 1 milestone).

### 🥉 Priority 3 — Admin analytics + moderation

- Revenue via `$sum` aggregation on paid orders, top products, active users → **Recharts** dashboard.
- Ban/unban (`User.isBanned`), and product flag/remove for moderation.

### Priority 4 — Hardening & tests (resume polish)

- `helmet`, `cors` with an origin whitelist, `express-validator` on auth/product/order inputs.
- Add a **payment webhook** alongside signature verify (Razorpay `payment.captured`) to decrement stock reliably.
- Jest + Supertest: ~10–15 tests covering register/login, product create, checkout, payment verify.
- Refresh-token rotation (httpOnly refresh cookie + short-lived access token).

## Suggested build sequence

1. Seller role + `roleMiddleware` (small, unblocks chat's buyer/seller premise).
2. Chat models + REST + Socket.io auth + basic text chat end-to-end.
3. "Message Seller" + product context card.
4. Presence (online dots) + order-card integration.
5. Admin analytics, then hardening + tests.

## Decisions to confirm before building

- **Keep Razorpay** (current) or switch to Stripe (roadmap)? Razorpay already works — recommend keeping it.
- **Where to host Socket.io** — needs a persistent server (Render/Railway), not Vercel serverless.
- **Seller role now, or single-vendor chat** (buyers chat with admin/store) to ship chat faster?
