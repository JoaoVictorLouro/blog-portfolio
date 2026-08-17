# Ghost CMS (SQLite + Docker)

Local Ghost 6 blog using SQLite in Docker.

**Note:** Ghost only supports SQLite in development mode (`NODE_ENV=development`). This stack is for local use. Production requires MySQL 8.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
- [Task](https://taskfile.dev/installation/)

## Quick start

```bash
task up
```

- Site: [http://localhost:2368](http://localhost:2368)
- Admin setup: [http://localhost:2368/ghost](http://localhost:2368/ghost)

Content and the SQLite database persist under `./data/content` (including `data/content/data/ghost.db`).

## Useful commands

```bash
task logs       # follow logs
task status     # status / health
task down       # stop
task update     # pull latest image and restart
task recreate   # recreate container after .env changes
task setup      # create .env if missing and ensure data dir
```

## Configuration

Edit `.env` to change `URL` or `PORT`. After changing env vars, recreate the container:

```bash
task recreate
```
