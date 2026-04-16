# Gordon Pro Field App

A customer-facing tree assessment intake app for Gordon Pro Tree Service. Customers submit photos and tree details from home; Claude AI identifies the species and returns contextual tips for the crew before they arrive on site.

---

## Purpose

1. Customer fills out a 3-step intake form (contact info → tree details → photos)
2. Photos + details are sent to Claude Vision API
3. AI returns: species ID, key characteristics, site considerations, crew tips, and safety flags
4. Results page is ready for the Gordon Pro crew before the job

---

## Tech Stack

- **Next.js 14** — App Router, TypeScript
- **Tailwind CSS** — custom Gordon Pro design system
- **Supabase** — Postgres database for submissions
- **Vercel Blob** — photo storage
- **Claude AI (Anthropic)** — tree species identification and crew briefing
- **Resend** — email notifications (optional)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard → Storage → Blob |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `ADMIN_PASSWORD` | Set to any strong password |

### 3. Run the Supabase migration

In your Supabase project, open the SQL editor and run:

```sql
-- contents of supabase/migrations/001_submissions.sql
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing / welcome page |
| `/submit` | 3-step intake form |
| `/results/[id]` | AI analysis result for a submission |
| `/admin` | Password-protected submission log |

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/submit` | POST | Saves form data + uploads photos |
| `/api/analyze` | POST | Runs Claude Vision analysis |
| `/api/submissions` | GET | Returns all submissions (requires `x-admin-password` header) |

---

## Logo

Place the Gordon Pro logo at `/public/images/logo.png`. The header expects a square image (will be displayed at 32×32px).
