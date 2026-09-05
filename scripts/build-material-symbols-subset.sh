#!/usr/bin/env bash
set -euo pipefail

ICONS="account_balance,account_circle,account_tree,arrow_forward,bolt,build,cell_tower,chevron_left,chevron_right,close,cloud,code,dark_mode,database,delete,deployed_code,download,engineering,explore,filter_list,fingerprint,home_max,hub,key,language,layers,light_mode,link,logout,mail,memory,my_location,payments,person,photo_library,play_circle,psychology,rss_feed,save,schedule,school,search,send,share,support_agent,terminal,timeline,translate,verified,warning,web,work"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/content/themes/neon-protocol/assets/fonts"
OUT_FILE="$OUT_DIR/material-symbols-subset.woff2"

mkdir -p "$OUT_DIR"

CSS=$(curl -sS -A "$USER_AGENT" \
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${ICONS}&display=swap")
URL=$(echo "$CSS" | grep -o 'https://fonts.gstatic.com[^)]*' | head -1)

if [[ -z "$URL" ]]; then
  echo "Could not resolve subset font URL from Google Fonts CSS" >&2
  exit 1
fi

curl -sS -L -A "$USER_AGENT" "$URL" -o "$OUT_FILE"

if ! file "$OUT_FILE" | grep -q 'Web Open Font Format (Version 2)'; then
  echo "Downloaded file is not a valid woff2 font" >&2
  exit 1
fi

echo "Wrote $OUT_FILE ($(wc -c < "$OUT_FILE") bytes)"
