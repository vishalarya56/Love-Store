# 💕 LoveStory

A premium, mobile-first, cinematic romantic website creation platform.

A creator pays **₹9** to receive **2 website credits**, then builds a
personalized digital love letter (creator name, partner name, emotion, story,
photos, signature…) that's published at a unique shareable link
(`#/love/<slug>`) the recipient opens on their phone.

> When someone opens a LoveStory link, the first impression should be:
> *"Wow… this is beautiful. Someone really made this for me."*

---

## ✨ What's inside

- **Landing page** — premium hero, floating hearts, feature grid, 5-step flow.
- **5-step creator flow** — Start → Emotion → Story → Memories → Preview, with
  debounced autosave (700 ms) + `localStorage` backup.
- **Login-free guest sessions** — no phone number or OTP required; an anonymous session is created automatically.
- **Payment + credits** — `FakePaymentProvider` (₹9 → 2 credits), server-side
  signature verification, atomic credit consumption inside a DB transaction,
  duplicate-payment & duplicate-generation protection, idempotency keys.
- **Image upload** — Sharp-based validation (magic-byte sniffing), 10 MB cap,
  normalized to WebP (max 1600 px long edge), full image state machine.
- **Recipient experience** — the hero of the product: glowing heartbeat heart,
  3-second cinematic intro, progressive story reveal inside a glass card,
  swipeable snap-scroll memory gallery, emotional final message, signature,
  Replay / Share / optional ambient music (Web Audio, no asset). 10 emotion
  themes that visibly change colors & particles. Reduced-motion aware.
- **Dashboard** — credits, published stories, delete with confirmation.
- **Privacy** — public love payload never exposes the creator's phone, payment
  IDs, or any internal fields. Draft images are owner-only; only published
  websites are public.

## 🧱 Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) + **lucide-react**
- **Framer Motion** for animation
- **Prisma ORM** with **SQLite** (sandbox equivalent of the Supabase/Postgres
  design in the worklog)
- **Zod** validation (canonical, server-authoritative)
- **Zustand** for lightweight client state
- **Sharp** for image processing
- Fonts: **Playfair Display** (headings) + **Poppins** (body)

## 🚀 Run it

```bash
# 1. Install deps
bun install            # or: pnpm install / npm install

# 2. Configure the database
cp .env.example .env   # DATABASE_URL=file:./db/custom.db

# 3. Create the SQLite schema
bun run db:push

# 4. Start the dev server
bun run dev            # http://localhost:3000
```

Then:

- Visit `http://localhost:3000/` — landing page.
- Click **Start** → enter name + an Indian mobile (e.g. `9876543210`) → the
  demo OTP is shown on screen → verify → you're in the creator flow.
- Complete the 5 steps; on the **Preview** step, "Pay ₹9 · Get 2 credits"
  (demo payment, no real charge) → "Create my Love Website" → lands on the
  recipient experience.
- **View the demo love letter** without going through the flow: POST the seed
  endpoint, then open the link:
  ```bash
  curl -X POST http://localhost:3000/api/seed
  # → {"success":true,"data":{"slug":"demo",...}}
  ```
  then open `http://localhost:3000/#/love/demo`.

## 🗺️ Routes (hash-based, single `/` page)

| Hash route        | View                                  |
|-------------------|---------------------------------------|
| `#/`              | Landing                               |
| `#/create`        | Creator flow (new draft)              |
| `#/create/:id`    | Creator flow (resume draft)           |
| `#/dashboard`     | Your credits & published stories      |
| `#/love/:slug`    | Recipient experience (public)         |

## 🔌 API (selected)

```
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
GET    /api/auth/session
POST   /api/auth/logout

POST   /api/drafts                       GET /api/drafts
GET    /api/drafts/:id                   PATCH /api/drafts/:id   DELETE /api/drafts/:id
POST   /api/drafts/:id/images            POST /api/drafts/:id/generate
PATCH  /api/images/:id                  DELETE /api/images/:id
GET    /api/img/:id                      (access-controlled image serving)

POST   /api/payments/create-order       POST /api/payments/verify
GET    /api/credits
GET    /api/websites                     DELETE /api/websites/:id
GET    /api/public/love/:slug            (public DTO only)
POST   /api/seed                         (idempotent demo seeder)
```

All protected endpoints: authenticate → rate-limit → validate → authorize →
ownership → state → business rules → DB/storage.

## 🎨 Design tokens

Defined in `src/app/globals.css`:

- `--love-pink-50 … --love-pink-600`, `--love-rose/purple/red`
- Romantic gradients: `--love-grad-bg / -romantic / -button / -dark / -warm-gold`
- Glass card: `.love-glass`, `.love-glass-strong`
- Animations: `.love-heartbeat`, `.love-glow-pulse`, `.love-pan`,
  `@keyframes love-float / love-twinkle`
- Fluid type: `.love-hero-title`, `.love-section-title`, `.love-body`
- All heavy motion is gated behind `@media (prefers-reduced-motion: reduce)`.

## 🧪 Sandbox adaptations (vs. the full Supabase/Razorpay design)

This build targets a local Next.js + SQLite sandbox, so the following
production-grade integrations from the original spec are substituted with
equivalent, self-contained implementations (see `worklog.md` for the full
rationale):

| Spec (production)            | This sandbox                              |
|------------------------------|-------------------------------------------|
| Supabase Postgres + RLS      | Prisma + SQLite (auth at app layer)       |
| Supabase Auth (real OTP SMS) | Mock OTP (code returned in the response)  |
| Razorpay                     | `FakePaymentProvider` (deterministic sig)  |
| Upstash Redis rate limiting  | In-memory rate limiter                     |
| Supabase Storage             | Local `private/uploads/` + Sharp, served  |
|                              | via `/api/img/:id` with access control     |
| Multi-page routes            | Hash-routed single `/` page                |

All business invariants stay **server-authoritative** — the client is never
trusted for credits, ownership, or state transitions. Generation is one atomic
`db.$transaction` (credit lock → draft lock → image transfer → consume →
publish) with idempotency keys so retries never double-charge.

## 📁 Project layout

```
src/
├── app/
│   ├── layout.tsx            # Playfair + Poppins fonts, metadata
│   ├── page.tsx              # hash router → landing / create / dashboard / love
│   ├── globals.css           # LoveStory design tokens + animations
│   └── api/                  # all route handlers
│       ├── auth/{send-otp,verify-otp,session,logout}
│       ├── drafts/[id]/{images,generate}
│       ├── images/[id]
│       ├── img/[id]          # access-controlled image serving
│       ├── payments/{create-order,verify}
│       ├── credits
│       ├── public/love/[slug]
│       ├── websites/[id]
│       └── seed
├── components/
│   ├── love/                 # RECIPIENT EXPERIENCE (priority)
│   ├── create/               # 5-step creator flow
│   ├── landing/              # landing page
│   ├── dashboard/            # dashboard
│   └── auth/                 # OTP modal
├── lib/                      # auth, api, rate-limit, validation, emotions,
│                             # storage (Sharp), payment (Fake provider),
│                             # idempotency, dto, slug, client (typed fetch)
├── stores/                   # zustand auth store
└── hooks/                    # use-hash-route, use-toast
```

## 📝 Notes

- `private/uploads/` contains the 4 generated romantic demo images
  (`demo-memory-1..4.png`) and their processed WebP variants
  (`demoimg1..4.webp`) so `#/love/demo` works out of the box. The seed
  endpoint re-processes the PNGs if the WebPs are missing.
- `worklog.md` is the full build + verification log.
- Lint: `bun run lint`. The session cookie is `SameSite=None; Secure` so it
  works inside the cross-site preview iframe (and on localhost, which modern
  browsers treat as a secure context).

Made with ❤️.
