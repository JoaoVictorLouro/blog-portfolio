---
name: review-article
description: >-
  Reviews a published Ghost article from a URL for grammar, wording, internal
  inconsistencies, fact-checkable claims, and locale/tag release hygiene.
  Use when the user pastes a post URL (e.g. /en-us/articles/slug/), asks to
  review an article, copy-edit prose, or fact-check a blog post.
---

# Review article

Posts live in Ghost runtime data, not git. Fetch the live URL. Do not search the repo for markdown. Do not read `.env` or use the Ghost Admin API.

Stack details (locales, chrome, translation JSON, fixtures): [reference.md](reference.md).

## Workflow

1. **Parse URL** — origin, locale (`en-us` | `ja-jp` | `pt-br` | `es-la`), slug from `/{locale}/articles/{slug}/`. If the path does not match, say so and still extract the post on the page.
2. **Fetch** — article HTML via WebFetch or `curl`. Also fetch `{origin}/contentapi/i18n/article-translations.json` when the origin is reachable.
3. **Extract** — title, public tag chips, datetime, and `.np-prose` body. Convert HTML to text but keep headings, lists, quotes, code, and link URLs. Drop theme chrome (hero overlay, share, comments, LLM attribution).
4. **Grammar and wording** — copy-edit for that locale (`en-US`, `ja-JP`, `pt-BR`, `es-419`). Keep the author’s voice (terminal-style titles like `NEON_PROTOCOL // SYSTEM_OVERVIEW` are allowed). Flag calques, mixed-language slips, and theme UI strings leaking into the body.
5. **Inconsistencies** — numbers, dates, names, versions, claims that contradict the same piece; title vs excerpt vs body; URL locale vs language of the prose; translation-map siblings that disagree on **facts** (ignore tone-only differences).
6. **Fact check** — list discrete claims (versions, dates, APIs, quotes, stats). Search official docs / WebSearch. Mark each **confirmed**, **contradicted**, or **unverified**. Never invent sources. Cap at ~8 high-impact claims unless the user asks for exhaustive checking.
7. **Release hygiene** — expect exactly one `#lang-*` language tag; optional `#translation-{group}`; public tags vs topic; excerpt vs piece; broken in-body links. Report only; do not edit Ghost unless asked.

If the post looks like a `style-review-*` UI fixture, still review but state that the copy may be intentional smoke-test content.

## Report

Severity: **Must fix** / **Should fix** / **Nit**.

Each finding: short quote or paraphrase, issue, suggested rewrite **in the article’s language**. Fact rows include a source URL.

```markdown
# Article review: {title}

- URL:
- Locale:
- Slug:

## Summary

## Grammar and wording

## Inconsistencies

## Fact check

## Ghost / locale release

## Suggested patches
```

Default: findings only. Out of scope: theme/CSS, gscan, Docker, visual layout—unless they appear as text in the article.
