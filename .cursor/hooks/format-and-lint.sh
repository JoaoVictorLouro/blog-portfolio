#!/usr/bin/env bash
set -u

input=$(cat)
file_path=$(
  python3 -c 'import json,sys; print(json.load(sys.stdin).get("file_path",""))' <<<"$input" 2>/dev/null || true
)

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

if [[ -n "${file_path:-}" && -f "$file_path" ]]; then
  if ! deno run -A npm:prettier@3.9.6 --write "$file_path" >/dev/null 2>&1; then
    echo "format-and-lint: prettier skipped or failed for $file_path" >&2
  fi
fi

if ! deno task test >&2; then
  echo "format-and-lint: deno task test failed" >&2
fi

exit 0
