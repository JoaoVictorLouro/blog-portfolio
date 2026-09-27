# Create draft — Ghost Admin

The script signs `CONTENT_API_KEY` (`id:secret`) with `createAdminJwt` from `content-api/ghost-client.ts`. Header `Authorization: Ghost {jwt}`, `Accept-Version: v6.0`, `Origin: {GHOST_URL}`.

`status` is hardcoded to `draft`. The manifest cannot publish.

## Manifest

```json
{
  "title": "...",
  "slug": "motion-graphics-made-easy",
  "locale": "en-us",
  "custom_excerpt": "...",
  "meta_description": "...",
  "html": "<p>...</p>",
  "feature_image": "drafts/assets/hero.webp",
  "feature_image_alt": "...",
  "public_tags": ["Remotion"],
  "update": false
}
```

Omit `feature_image` and `feature_image_alt` together when there is no hero. `update` defaults to false.

| Field              | Rule                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `locale`           | `en-us`, `ja-jp`, `pt-br`, `es-la`                                   |
| `slug`             | lowercase hyphenated; `en-us` unsuffixed; else `-ja` / `-pt` / `-es` |
| `custom_excerpt`   | 1–300 characters; card excerpt                                       |
| `meta_description` | 1–160 characters; `{{ghost_head}}`                                   |
| `public_tags`      | 1–3 names, no `#`                                                    |
| `html`             | body only, no H1; `{{asset:repo/relative/path}}` for local files     |

`{{asset:…}}` paths are relative to the repo root and must stay inside it. The same path is uploaded once.

## Tags the script attaches

| Role        | Name                  | Slug                      |
| ----------- | --------------------- | ------------------------- |
| Language    | `#lang-{locale}`      | `hash-lang-{locale}`      |
| Translation | `#translation-{base}` | `hash-translation-{base}` |
| Public      | manifest name         | slugified name            |

`{base}` is the slug with `-ja`, `-pt`, or `-es` removed. Existing tags are reused by slug. Missing tags are created. Order on the post: language, translation, public.

## Uploads

| Files                                             | Endpoint                               |
| ------------------------------------------------- | -------------------------------------- |
| `.png` `.jpg` `.jpeg` `.gif` `.webp` `.avif`      | `POST /ghost/api/admin/images/upload/` |
| `.mp4` `.webm` `.mov` `.mp3` `.wav` `.m4a` `.ogg` | `POST /ghost/api/admin/media/upload/`  |

Image parts: `file`, `purpose=image`, `ref`. Media parts: `file`, `ref`. The returned `images[0].url` or `media[0].url` replaces the placeholder.

`<video>` blocks that are not already inside a Koenig HTML card are wrapped with `<!--kg-card-begin: html-->` and `<!--kg-card-end: html-->`.

## Post

`POST /ghost/api/admin/posts/?source=html` (or `PUT /ghost/api/admin/posts/{id}/?source=html` when `update` is true). Body fields: `title`, `slug`, `html`, `custom_excerpt`, `meta_description`, `status: "draft"`, `tags` as `{ id }`. Feature image URL and alt only when a hero was uploaded. No `newsletter`.

If the slug exists and `update` is false, the script exits 1 with `slug_exists` and does not write. Updates run only when the existing post is still a draft, and send `updated_at` from the GET.

After write, the script GETs the post and exits 1 unless `status` is `draft`.

## Result

```json
{
  "id": "...",
  "slug": "...",
  "status": "draft",
  "locale": "en-us",
  "editorUrl": "{GHOST_URL}/ghost/#/editor/post/{id}",
  "publicPath": "/en-us/articles/{slug}/",
  "featureImage": false,
  "published": false
}
```

Public URL after a person publishes: `{GHOST_URL}{publicPath}`.
