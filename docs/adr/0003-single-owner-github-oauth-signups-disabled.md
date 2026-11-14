# Single owner, GitHub sign-in only, sign-ups disabled, writes checked by owner id

There is exactly one Owner and no multi-user support. The owner signs in with GitHub OAuth (inherits GitHub 2FA; no passwords to manage). Email sign-ups are disabled in Supabase Auth. Write policies do not trust "any authenticated user": they compare `auth.uid()` to the owner's user id stored in the database (not hard-coded in the frontend), so an account that somehow gets created still cannot change anything.

## Considered Options

- **Multi-user shelves** (`/username` pages) — rejected for scope: sign-up, tenancy and abuse handling would roughly triple the work.
- **Magic link / email+password** — viable; GitHub chosen because the code already lives there and it gives 2FA for free.
