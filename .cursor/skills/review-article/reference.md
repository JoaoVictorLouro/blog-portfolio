# Article review — stack reference

## URLs

Public posts: `{origin}/{locale}/articles/{slug}/`

Example: `http://localhost:2368/en-us/articles/style-review-02/`

Locale codes (path segment → copy locale):

| Path    | BCP 47   | Internal tag  |
| ------- | -------- | ------------- |
| `en-us` | `en-US`  | `#lang-en-us` |
| `ja-jp` | `ja-JP`  | `#lang-ja-jp` |
| `pt-br` | `pt-BR`  | `#lang-pt-br` |
| `es-la` | `es-419` | `#lang-es-la` |

English is the default collection: untagged posts still appear under `/en-us/`. Other locales require the matching `#lang-*` tag.

## What to extract vs ignore

Rendered by `content/themes/neon-protocol/post.hbs`.

**Review**

- `h1.np-display` (title)
- Public tags (`.np-card-tags` / `.np-chip`; visibility public only)
- `<time datetime>`
- Article body: `.np-prose` (`{{content}}`)

**Ignore**

- Hero scan overlay (`cover-scan-overlay`, glitch layers)
- Share bar (`.np-article-share`)
- Translation switcher chrome (review sibling **URLs/titles** from the JSON, not the widget copy)
- Comments
- `.np-llm-attribution` (theme string, not author prose)
- Nav, footer, theme UI strings

## Translation siblings

`GET {origin}/contentapi/i18n/article-translations.json`

Use this map to find other-locale versions of the same post. Compare facts and structure, not voice. Missing siblings is a release note, not a grammar error.

## Publishing conventions

- Exactly one language tag: `#lang-en-us`, `#lang-ja-jp`, `#lang-pt-br`, or `#lang-es-la`
- Optional shared group: `#translation-{group-id}` across locale versions
- Posts are authored in Ghost; nothing under `content/` is the article source
- Do not read `.env` / `.env.secrets`; do not call Ghost Admin API for this skill

## Fixture posts

`scripts/seed-style-review-post.mjs` seeds `style-review-{n}` slugs with titles like `STYLE_REVIEW // UI_SMOKE_TEST`. Those pages exist to exercise Koenig cards and CSS. Flag them; do not treat filler fixture copy as a real editorial voice sample.
