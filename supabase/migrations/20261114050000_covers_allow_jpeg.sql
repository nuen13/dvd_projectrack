-- Safari cannot encode WebP from a canvas (toBlob silently returns PNG), so the
-- browser-side resizer falls back to JPEG there. Allow exactly those two types.
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id = 'covers';

alter table public.discs drop constraint discs_image_path_check;
alter table public.discs add constraint discs_image_path_check
  check (image_path ~ '^[0-9a-f-]{36}\.(webp|jpg)$');
