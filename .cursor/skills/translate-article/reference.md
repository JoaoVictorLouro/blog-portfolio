# Translate article — Ghost Admin

## Session

Same pattern as `scripts/seed-style-review-post.mjs`.

- `POST {GHOST_API_URL}/ghost/api/admin/session/`
- Body: `{ "username": "<GHOST_ADMIN_EMAIL>", "password": "<GHOST_ADMIN_PASSWORD>" }`
- Headers: `Accept: application/json`, `Accept-Version: v6.0`, `Origin: <URL>`, `Content-Type: application/json`
- Cookie: `ghost-admin-api-session=...` from `Set-Cookie` (first segment only)

If status is 403, staff device verification is on. Tell the user to set `security__staffDeviceVerification=false` or configure SMTP. Do not retry with guessed credentials.

Subsequent requests send `Cookie` plus the same Accept / Accept-Version / Origin headers.

## Tags

Internal language tags (exactly one per post):

| Locale  | Name          | Slug              |
| ------- | ------------- | ----------------- |
| `en-us` | `#lang-en-us` | `hash-lang-en-us` |
| `ja-jp` | `#lang-ja-jp` | `hash-lang-ja-jp` |
| `pt-br` | `#lang-pt-br` | `hash-lang-pt-br` |
| `es-la` | `#lang-es-la` | `hash-lang-es-la` |

Translation group (shared across siblings):

- Name: `#translation-{groupId}`
- Slug: `hash-translation-{groupId}`
- `groupId` from existing source tag, or source slug if creating

Ensure tags with `GET /ghost/api/admin/tags/?filter=slug:{slug}&limit=1` then `POST /ghost/api/admin/tags/` if missing (`name`, `slug`, `description`). Assign on posts by `{ id }`.

Find siblings: `GET /ghost/api/admin/posts/?filter=tag:hash-translation-{groupId}&include=tags&limit=all` (drafts included). Map each post’s `#lang-*` to a locale. Missing locales = the four codes minus source minus those found.

Public tags: copy source public tag ids (not language/translation internals).

## Source PUT (tags only)

`PUT /ghost/api/admin/posts/{id}/` with `updated_at` from the GET. Include existing fields needed so Ghost does not wipe content: at minimum `id`, `updated_at`, `tags`. Do not set `status` to published. Do not change `html` unless you are only attaching tags.

## Create draft

`POST /ghost/api/admin/posts/?source=html`

```json
{
  "posts": [
    {
      "title": "...",
      "slug": "...",
      "custom_excerpt": "...",
      "html": "...",
      "status": "draft",
      "feature_image": "<copy from source or omit>",
      "feature_image_alt": "<translated>",
      "tags": [{ "id": "<lang>" }, { "id": "<translation>" }, { "id": "<public...>" }]
    }
  ]
}
```

Never `"status": "published"`. Do not send `newsletters`.

## Slugs

Translate the source slug into the target language. The locale stays in the path (`/{locale}/articles/{slug}/`), so the slug does not repeat it.

- Lowercase, hyphenated, ASCII (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- Keep product names and industry terms in English. `Motion Graphics` stays `motion-graphics`
- Japanese: Hepburn romanization, no kana and no macrons (`手軽に` → `tegaru-ni`)
- Do not append `-ja`, `-pt`, or `-es`

`#translation-{groupId}` stays the source slug (or the tag already on the source). Do not rebuild that id from the translated slug.

If `filter=slug:{candidate}` already exists, try `candidate-2`, `candidate-3`, …

## Links

- Admin: `{URL}/ghost/#/editor/post/{id}`
- Public after publish: `{URL}/{locale}/articles/{slug}/`
