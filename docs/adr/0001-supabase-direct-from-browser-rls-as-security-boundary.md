# Browser talks to Supabase directly; RLS is the security boundary

The app is a static React (Vite + TypeScript) site that calls Supabase (Postgres, Auth, Storage) straight from the browser with the public anon key. There is no backend of our own. Row Level Security policies and Storage policies are therefore the *only* thing standing between a visitor and the data, so every table has RLS enabled with deny-by-default, and every policy lives in a versioned SQL migration under `supabase/migrations/` (never clicked together in the dashboard).

## Considered Options

- **ASP.NET Core Web API + React** — the owner's existing stack; more to show for .NET, but most of Supabase would go unused, and the goal of this project is to learn Supabase properly.
- **Next.js + Supabase** — server-rendered public pages (better SEO/link previews) at the cost of a server runtime and more moving parts. Link previews can be recovered later with static meta tags or a prerender step.

## Consequences

- The anon key in the client bundle is expected and safe; the service-role key must never appear in client code or in git.
- A missing or wrong policy is a data leak, not a bug. Run Supabase's security advisor after every migration.
