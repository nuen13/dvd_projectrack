# ProjectRack

A portfolio shelf of DVD cases — pull a disc off the shelf, drop it in the TV, see the project.

- **Public site** — `projects.nuennuen.com`: only *showcased* discs (Shipped **and** Public).
- **Admin** — `/admin`: the owner signs in with GitHub to add, edit, order and hide discs.

Vocabulary is in [CONTEXT.md](CONTEXT.md). Why things are the way they are is in [docs/adr/](docs/adr/).

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, React Router, TanStack Query, plain CSS ported from the prototype |
| Data / auth / files | Supabase — Postgres with RLS, GitHub OAuth, Storage bucket `covers` |
| Schema | SQL migrations in `supabase/migrations/`, applied with the Supabase CLI |
| Hosting | Cloudflare Pages, deploy on push to `main` |

## Scope

**v1:** public shelf + player (faithful port), admin table + editor with live preview, GitHub sign-in, cover uploads, deploy to `projects.nuennuen.com`, docs.

**Later:** automated tests (unit + Playwright), CI checks in GitHub Actions, link previews / SEO.

## Data model (v1 sketch)

`discs` — `id`, `owner_id`, `title`, `spine_text`, `kind` (type/platform), `made_for`, `status` (`idea | planned | in_progress | shipped | paused | archived`), `is_public`, `cover_tag`, `shipped_on`, `position`, `url`, `description`, `tags[]`, `cover_bg`, `cover_fg`, `pattern`, `spine_wide`, `thickness`, `height`, `image_path`, `image_mode`, timestamps.

Cover width and shelf gap are derived from `height` and `thickness` (ADR-0006).

## Site text (`src/site.config.ts`)

- Top bar: **Aiden (Pham) Tran** · **2026 Project**
- Kicker: **nuennuen production**
- Headline: **Releases**
- TV brand: **NUEN·VISION**

## Security checklist

The repo is public; the data is protected by Supabase policies, not by secrecy.

- [ ] No secrets in git — `.env*` ignored; only `.env.example` committed
- [ ] Only the publishable key in the client; service-role key never used client-side
- [ ] GitHub secret scanning + push protection enabled on the repo
- [x] RLS enabled on every table, deny by default
- [x] Anon `SELECT` on `discs` only where `status = 'shipped' AND is_public`
- [x] Writes only where `auth.uid()` = owner id stored in the database
- [x] `covers` bucket: public read (no listing), owner-only write, WebP only, 2 MB limit
- [ ] Supabase Auth: email sign-ups disabled, GitHub the only provider
- [ ] `_headers`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`
- [ ] Disc links validated to `http`/`https` only
- [x] Supabase security advisor clean after each migration (re-run `supabase/tests/rls_smoke.sql` too)

## Build order

1. Scaffold Vite app + `site.config.ts`; create Supabase project
2. Migration: `discs` table, `owner` setting, RLS policies, `covers` bucket + policies
3. Port the shelf, player and popup as components reading showcased discs
4. GitHub sign-in + `/admin` table (status, Public, drag to reorder)
5. Disc editor with live preview and cover upload
6. Cloudflare Pages + `projects.nuennuen.com` + `_headers`; run the security checklist
