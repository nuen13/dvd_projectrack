# Cover images live in a public Storage bucket under unguessable names

Cover images go in a public-read `covers` bucket; only the owner may upload, replace or delete (Storage policies, image MIME types only, 2 MB cap). Files are named by random UUID, and the browser resizes images to ~1200px WebP before upload. This means a hidden disc's cover is technically reachable by anyone who has its exact URL — accepted, because covers are not sensitive and the names cannot be guessed.

## Considered Options

- **Private bucket with signed URLs** — truly hides covers of non-showcased discs, but every render needs short-lived signed URLs; rejected as complexity without real benefit.
- **Base64 inside the row** (as the original prototype did) — bloats every query and the page; rejected.
