# Ghost CMS (SQLite + Docker)

Local Ghost 6 blog using SQLite in Docker, with versioned theme/settings/public content and GHCR image publishing.

**Note:** Ghost only supports SQLite in development mode (`NODE_ENV=development`). This stack is for local use. Production requires MySQL 8.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
- [Task](https://taskfile.dev/installation/)
- [Deno](https://deno.land/) 2.x (format / lint / test tasks)

## Quick start

```bash
task up
```

Set `GHOST_ADMIN_EMAIL` and `GHOST_ADMIN_PASSWORD` in `.env.secrets` before the first start (see `.env.secrets.example`). General settings such as `URL` and `PORT` live in `.env` (see `.env.example`). Bootstrap creates the owner on first boot, activates the **neon-protocol** theme, seeds nav (HOME / ARTICLES / PORTFOLIO / ABOUT), creates `/about/`, and leaves free newsletter sign-up on. Dark theme is the default; the sensors icon in the header toggles light mode.

- Site: [http://localhost:2368](http://localhost:2368) — home
- Articles: [http://localhost:2368/articles/](http://localhost:2368/articles/)
- Portfolio: [http://localhost:2368/portfolio/](http://localhost:2368/portfolio/)
- About: [http://localhost:2368/about/](http://localhost:2368/about/)
- Admin: [http://localhost:2368/ghost](http://localhost:2368/ghost) (log in with the env credentials; no setup wizard)

Runtime data (SQLite, uploads, logs) lives under `./data/content` and is gitignored. An existing database that already has an owner keeps that user; later `.env.secrets` password changes are ignored.

## Versioned content

Tracked under `content/`:

| Path                | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `content/themes/`   | Themes (`neon-protocol` active; Source kept as a vendor baseline) |
| `content/settings/` | `routes.yaml`, `redirects.yaml`, etc.                             |
| `content/public/`   | Public assets (`.well-known`, admin-auth)                         |

These folders are bind-mounted into Ghost and baked into the published image.

## Container image

Image: `ghcr.io/joaovictorlouro/blog-portfolio`

Built from the root `Dockerfile` (Ghost 6 Alpine + versioned content). Pushes to GHCR on `main` and `v*` tags.

## Useful commands

```bash
task logs       # follow logs
task status     # status / health
task down       # stop
task update     # pull base images, rebuild, restart
task recreate   # recreate container after env file changes
task setup      # create .env / .env.secrets if missing and ensure dirs
task format     # Prettier write (Deno)
task lint       # gscan neon-protocol theme checks
task test       # gscan + docker compose config
```

Or via Deno directly: `deno task format`, `deno task lint`, `deno task test`.

## Configuration

Edit `.env` for general settings and `.env.secrets` for owner credentials. After changing env vars, recreate the container:

```bash
task recreate
```

`.env` (from `.env.example`):

| Variable           | Purpose                              |
| ------------------ | ------------------------------------ |
| `URL`              | Public URL Ghost uses for links      |
| `PORT`             | Host port mapped to Ghost            |
| `GHOST_ADMIN_NAME` | Owner display name (default `Admin`) |
| `GHOST_SITE_TITLE` | Site title (default `Kono Gaijin`)   |

`.env.secrets` (from `.env.secrets.example`):

| Variable               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `GHOST_ADMIN_EMAIL`    | Owner email (created once on first boot) |
| `GHOST_ADMIN_PASSWORD` | Owner password (min 10 characters)       |

If you still have a combined `.env` from before this split, move `GHOST_ADMIN_EMAIL` and `GHOST_ADMIN_PASSWORD` into `.env.secrets`.

Members can subscribe to the newsletter and comment on articles with a free account. Ghost native comments are enabled for all members; paid plans are turned off. Ghost Admin still has **Settings → Staff → Invite**; bootstrap never creates a second staff user.

Portfolio is a static image gallery in the theme (`content/themes/neon-protocol/assets/images/portfolio/`). Contact form endpoint, GitHub, and social URLs are theme design settings.

## CI

- **Pull requests** — Deno format check, gscan lint, and theme/Compose tests
- **Publish** — build and push the Docker image to GHCR
- **Renovate** — dependency updates Saturdays 09:00–20:00 (`America/Sao_Paulo`); minor and patch for `>=1.0.0` automerge (0.x and majors stay manual)

Install the [Renovate GitHub App](https://github.com/apps/renovate) on this repository if it is not already enabled.
