---
name: translate-article
description: >-
  Translates a Ghost article into missing blog locales (en-us, ja-jp, pt-br,
  es-la), creates Admin API drafts (never publishes), and returns editor and
  public links. Use when the user asks to translate, localize, or create other
  language versions of a post URL.
---

# Translate article

Create **draft** posts for locales that do not already have a translation sibling. Do not publish. Do not overwrite existing locale posts. Do not translate pages.

Locales and public URL shape: [review-article/reference.md](../review-article/reference.md). Session, tags, payload, slugs: [reference.md](reference.md).

## Auth

Use env `GHOST_ADMIN_EMAIL`, `GHOST_ADMIN_PASSWORD`, `URL` (default `http://localhost:2368`), `GHOST_API_URL` (default `http://127.0.0.1:2368`). If any required credential is missing, ask the user to export them. Never Read `.env` / `.env.secrets`. Never print passwords.

## Workflow

1. Parse URL → origin, source locale, slug.
2. Admin session; `GET /ghost/api/admin/posts/?filter=slug:{slug}&include=tags&formats=html&limit=1`.
3. Source locale from `#lang-*`. If missing, infer from URL and attach that lang tag on the source (`PUT` tags only; do not change `status`).
4. Reuse `#translation-{id}` on the source. If none, create `#translation-{source-slug}` and attach it to the source without publishing.
5. List siblings via Admin (`filter` on the translation tag, include drafts). Skip locales that already have a sibling. Admin is source of truth (content-api JSON omits drafts).
6. For each missing locale, rework title, `custom_excerpt`, HTML, and `feature_image_alt` into that locale. Keep HTML structure, `href`/`src`, code, and product names. Keep the author’s voice (terminal-style titles OK). Targets: `en-US`, `ja-JP`, `pt-BR`, `es-419`.
7. `POST /ghost/api/admin/posts/?source=html` with `status: "draft"`. Copy `feature_image`, public tags, translation tag, exactly one target `#lang-*`. No newsletters.
8. Slugs: to `en-us` use unsuffixed base; otherwise `{base}-ja` / `-pt` / `-es`. If taken, append `-2`, etc.

## Return

```markdown
# Translations (drafts)

| Locale | Title | Post id | Admin                             | After publish                      |
| ------ | ----- | ------- | --------------------------------- | ---------------------------------- |
| …      | …     | …       | {origin}/ghost/#/editor/post/{id} | {origin}/{locale}/articles/{slug}/ |

Drafts are not publicly readable.

## Skipped

- {locale}: already has a sibling ({url or slug})
```
