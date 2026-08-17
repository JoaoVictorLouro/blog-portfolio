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

- Site: [http://localhost:2368](http://localhost:2368)
- Admin setup: [http://localhost:2368/ghost](http://localhost:2368/ghost)

Runtime data (SQLite, uploads, logs) lives under `./data/content` and is gitignored.

## Versioned content

Tracked under `content/`:

| Path                | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `content/themes/`   | Themes (Source is vendored as the baseline) |
| `content/settings/` | `routes.yaml`, `redirects.yaml`, etc.       |
| `content/public/`   | Public assets (`.well-known`, admin-auth)   |

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
task recreate   # recreate container after .env changes
task setup      # create .env if missing and ensure dirs
task format     # Prettier write (Deno)
task lint       # gscan theme checks
task test       # gscan + docker compose config
```

Or via Deno directly: `deno task format`, `deno task lint`, `deno task test`.

## Configuration

Edit `.env` to change `URL` or `PORT`. After changing env vars, recreate the container:

```bash
task recreate
```

## CI

- **Pull requests** — Deno format check, gscan lint, and theme/Compose tests
- **Publish** — build and push the Docker image to GHCR
- **Renovate** — dependency updates Saturdays 09:00–20:00 (`America/Sao_Paulo`); minor and patch for `>=1.0.0` automerge (0.x and majors stay manual)

Install the [Renovate GitHub App](https://github.com/apps/renovate) on this repository if it is not already enabled.
