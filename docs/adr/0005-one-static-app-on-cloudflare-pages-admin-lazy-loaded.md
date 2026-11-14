# One static app on Cloudflare Pages, with Admin lazy-loaded at /admin

Public site and Admin are a single Vite app deployed to Cloudflare Pages at `projects.nuennuen.com`; Admin is a lazily loaded `/admin` route, so visitors never download it in practice. Shipping admin code in the same bundle exposes nothing, because authority lives in RLS (ADR-0001), not in hidden UI. Cloudflare Pages deploys on push to the public GitHub repo and serves security headers (CSP, X-Frame-Options, Referrer-Policy) via `_headers`. No Docker: a static site does not need a container.

## Considered Options

- **Separate admin app/subdomain** — keeps admin code off the public origin, but doubles builds and deploys for no security gain under RLS.
- **Vercel / Netlify** — equivalent; Cloudflare chosen because the owner already manages DNS there.
