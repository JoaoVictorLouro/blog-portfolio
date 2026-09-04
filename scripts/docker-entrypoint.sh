#!/bin/sh
set -e

theme_assets="/var/lib/ghost/content/themes/neon-protocol/assets"
ghost_assets="/ghostassets"

if [ -d "$ghost_assets" ]; then
  mkdir -p "$theme_assets/js/vendor" "$theme_assets/css/vendor" "$theme_assets/fonts"

  if [ -d "$ghost_assets/js/vendor" ]; then
    cp -a "$ghost_assets/js/vendor/." "$theme_assets/js/vendor/"
  fi

  if [ -d "$ghost_assets/css/vendor" ]; then
    cp -a "$ghost_assets/css/vendor/." "$theme_assets/css/vendor/"
  fi

  if [ -d "$ghost_assets/fonts" ]; then
    cp -au "$ghost_assets/fonts/." "$theme_assets/fonts/"
  fi
fi

exec docker-entrypoint.sh "$@"
