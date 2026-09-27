---
name: create-draft
description: >-
  Creates a Ghost draft from a local markdown file on the site in skills.env.
  Uploads referenced images and video, and sets the locale tag, translation
  tag, public tags, custom excerpt, and meta description. Does not publish.
  Use when the user asks to create a Ghost draft, upload a draft, or send a
  markdown file to Ghost.
---

# Create draft

Create one Ghost **draft**. Do not publish. Do not send a newsletter. Do not set `status` to `published`.

Field rules, tags, and the script result: [reference.md](reference.md).

## Auth

`skills.env` at the repo root supplies `GHOST_URL` and `CONTENT_API_KEY`. If either is missing, stop and ask the user to fill `skills.env`. Never read `.env` or `.env.secrets`. Never print `CONTENT_API_KEY`.

Only `create-draft.ts` calls the Admin API.

## Workflow

1. Use the markdown path the user gives. If they name none and `drafts/*.md` has one file, use that. If several, ask.
2. Title is the first `# ` heading. Omit that heading from the HTML. Keep the author's wording.
3. Locale from the prose: `en-us`, `ja-jp`, `pt-br`, or `es-la`. English defaults to `en-us`.
4. Slug is unsuffixed for `en-us`. Otherwise `{base}-ja`, `{base}-pt`, or `{base}-es`.
5. Write `custom_excerpt` (≤ 300 characters) and `meta_description` (≤ 160 characters) in the article's language. Do not invent facts. Optional frontmatter `excerpt`, `meta_description`, and `tags` override these when they already fit.
6. Choose 1–3 public topic tags. No `#` prefix. The script adds the `#lang-*` tag and `#translation-{base}` itself.
7. Convert the body to HTML. Fenced code becomes `<pre><code class="language-{lang}">` with the code escaped. Mermaid fences use `language-mermaid`. Local images and `<video>` / `<source>` files become `{{asset:path}}` placeholders (repo-root relative, forward slashes). Paths that appear only inside fenced code are not assets. Wrap each `<video>` in `<!--kg-card-begin: html-->` … `<!--kg-card-end: html-->`.
8. Set `feature_image` and `feature_image_alt` only from frontmatter. If either is absent, omit both and say so in the result. Do not invent an image.
9. Write the manifest to a temp file (do not commit it) and run from the repo root:

```bash
deno run -A .cursor/skills/create-draft/create-draft.ts path/to/manifest.json
```

10. On `slug_exists`, show the existing editor link and stop. Set `"update": true` only when the user asked to replace that draft and its status is still `draft`.
11. Report the script JSON. Say the post is not published.

## Return

```markdown
# Ghost draft

- Title:
- Locale:
- Slug:
- Status: draft
- Post id:
- Admin: {editorUrl}
- After publish: {GHOST_URL}{publicPath}
- Feature image: set | omitted
- Public tags:

Not published. Not publicly readable.
```
