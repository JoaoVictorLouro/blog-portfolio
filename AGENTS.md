# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

Ghost 6 blog (Docker + SQLite in **development mode only**). Production Ghost requires MySQL 8 — do not treat this stack as production-ready.

Tooling: Task, Deno 2.x, Prettier, gscan (via Node Docker), GitHub Actions, Renovate.

## Layout

| Path                          | Tracked? | Purpose                                                                                                                                                                                                           |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/themes/`             | yes      | Themes (`neon-protocol` active; Source vendored under `content/themes/source`)                                                                                                                                    |
| `content/settings/`           | yes      | `routes.yaml`, `redirects.yaml`, etc.                                                                                                                                                                             |
| `content/public/`             | yes      | Public overrides (`.well-known`, admin-auth, `humans.txt`)                                                                                                                                                        |
| `data/`                       | **no**   | Runtime SQLite, uploads, logs — never commit                                                                                                                                                                      |
| `.env`                        | **no**   | Local settings (`URL`, `PORT`, site title) — use `.env.example`                                                                                                                                                   |
| `.env.secrets`                | **no**   | Local secrets (`GHOST_ADMIN_EMAIL` / `PASSWORD`) — use `.env.secrets.example`                                                                                                                                     |
| `scripts/ghost-bootstrap.mjs` | yes      | First-boot owner, neon-protocol theme, nav, locale About pages, demo articles (4 locales), newsletters, content-api webhook registration (8 post/page events), free members + comments                            |
| `content-api/`                | yes      | Deno REST API: in-memory article translation map at `/contentapi/i18n/article-translations.json` (hourly + Ghost webhooks) and YouTube videos cache at `/contentapi/youtube/videos.json` (boot + hourly Atom RSS) |
| `config/nginx/`               | yes      | Reverse proxy: `/contentapi/*` → content-api, everything else → Ghost                                                                                                                                             |
| `scripts/i18n/locales.mjs`    | yes      | Shared locale registry (`en-us`, `ja-jp`, `pt-br`, `es-la`) for bootstrap, theme build, and content-api                                                                                                           |

Compose bind-mounts versioned `content/*` over the runtime `data/content` volume. The `Dockerfile` copies `content/` into the GHCR image `ghcr.io/joaovictorlouro/blog-portfolio`.

## Commands

Prefer Task (or Deno tasks) over ad-hoc npm:

```bash
task up          # setup + build + start
task down / logs / status / recreate / update
task format      # Prettier (Deno)
task lint        # gscan on content/themes/neon-protocol
task test        # gscan + docker compose config
```

Site: `http://localhost:2368` (nginx) — Admin: `http://localhost:2368/ghost` — Content API: `http://localhost:2368/contentapi/health` (owner from `GHOST_ADMIN_EMAIL` / `GHOST_ADMIN_PASSWORD` on first boot)

## Do

- Keep themes/settings/public under `content/` so they stay versioned and baked into the image
- Run `task format` / `task lint` / `task test` before finishing CI-related or theme changes
- Use Conventional Commits (`feat`, `fix`, `chore`, …)
- Leave `content/themes/source/renovate.json` alone (vendored theme); repo Renovate config is root `renovate.json`
- Keep `neon-protocol` as the designed frontend: dark default, light via the sensors toggle, locale routes `/en-us/`, `/ja-jp/`, `/pt-br/`, `/es-la/` (home, articles, portfolio, about)
- Portfolio is a static theme gallery under `content/themes/neon-protocol/assets/images/portfolio/` (no Ghost posts); edit images + `partials/portfolio-gallery.hbs` to change it
- Tag every post with exactly one internal language tag (`#lang-en-us`, `#lang-ja-jp`, `#lang-pt-br`, `#lang-es-la`) and optionally one translation group tag (`#translation-{group-id}` shared across locale versions)
- Run `deno task build:i18n` after editing locale JSON files under `content/themes/neon-protocol/locales/`

## Don't

- Commit `.env`, `.env.secrets`, `data/`, or `node_modules/`
- Switch Ghost to Postgres, or claim SQLite works in Ghost production mode
- Format `.hbs` with Prettier (excluded; Ghost helpers break the HTML parser — use gscan)
- Add npm/`package.json` for repo tooling — use Deno (`deno.json`)
- Read `.env` or other secret env files (blocked by `.cursorignore` and a `beforeReadFile` hook)
- Invite extra staff users or enable paid memberships; this stack is one owner + free newsletter sign-up and native comments for all members

## Cursor

- Article copy review from a live URL: [`.cursor/skills/review-article/SKILL.md`](.cursor/skills/review-article/SKILL.md)
- Translate a post into missing locales as Ghost drafts: [`.cursor/skills/translate-article/SKILL.md`](.cursor/skills/translate-article/SKILL.md)
- [`.cursorignore`](.cursorignore) excludes `.env` / `.env.*` (keeps `*.example` templates) and `data/`
- [`.cursor/hooks.json`](.cursor/hooks.json):
  - `beforeReadFile` — deny agent reads of `.env` files (`failClosed`)
  - `afterFileEdit` — format the edited file with Prettier, then run `deno task test`
