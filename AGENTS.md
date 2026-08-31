# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

Ghost 6 blog (Docker + SQLite in **development mode only**). Production Ghost requires MySQL 8 — do not treat this stack as production-ready.

Tooling: Task, Deno 2.x, Prettier, gscan (via Node Docker), GitHub Actions, Renovate.

## Layout

| Path                          | Tracked? | Purpose                                                                         |
| ----------------------------- | -------- | ------------------------------------------------------------------------------- |
| `content/themes/`             | yes      | Themes (`neon-protocol` active; Source vendored under `content/themes/source`)  |
| `content/settings/`           | yes      | `routes.yaml`, `redirects.yaml`, etc.                                           |
| `content/public/`             | yes      | Public overrides (`.well-known`, admin-auth)                                    |
| `data/`                       | **no**   | Runtime SQLite, uploads, logs — never commit                                    |
| `.env`                        | **no**   | Local settings (`URL`, `PORT`, site title) — use `.env.example`                 |
| `.env.secrets`                | **no**   | Local secrets (`GHOST_ADMIN_EMAIL` / `PASSWORD`) — use `.env.secrets.example`   |
| `scripts/ghost-bootstrap.mjs` | yes      | First-boot owner, neon-protocol theme, nav, About page, free members + comments |

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

Site: `http://localhost:2368` — Admin: `http://localhost:2368/ghost` (owner from `GHOST_ADMIN_EMAIL` / `GHOST_ADMIN_PASSWORD` on first boot)

## Do

- Keep themes/settings/public under `content/` so they stay versioned and baked into the image
- Run `task format` / `task lint` / `task test` before finishing CI-related or theme changes
- Use Conventional Commits (`feat`, `fix`, `chore`, …)
- Leave `content/themes/source/renovate.json` alone (vendored theme); repo Renovate config is root `renovate.json`
- Keep `neon-protocol` as the designed frontend: dark default, light via the sensors toggle, routes `/` (home), `/articles/`, `/portfolio/`, `/about/`

## Don't

- Commit `.env`, `.env.secrets`, `data/`, or `node_modules/`
- Switch Ghost to Postgres, or claim SQLite works in Ghost production mode
- Format `.hbs` with Prettier (excluded; Ghost helpers break the HTML parser — use gscan)
- Add npm/`package.json` for repo tooling — use Deno (`deno.json`)
- Read `.env` or other secret env files (blocked by `.cursorignore` and a `beforeReadFile` hook)
- Invite extra staff users or enable paid memberships; this stack is one owner + free newsletter sign-up and native comments for all members

## Cursor

- [`.cursorignore`](.cursorignore) excludes `.env` / `.env.*` (keeps `*.example` templates) and `data/`
- [`.cursor/hooks.json`](.cursor/hooks.json):
  - `beforeReadFile` — deny agent reads of `.env` files (`failClosed`)
  - `afterFileEdit` — format the edited file with Prettier, then run `deno task test`
