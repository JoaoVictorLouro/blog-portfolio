#!/usr/bin/env bash
set -u

input=$(cat)

status=$(
  python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))' <<<"$input" 2>/dev/null || true
)

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

sentinel="tmp/cursor-verify-pending"

if [[ "$status" != "completed" ]]; then
  printf '%s\n' '{}'
  exit 0
fi

if [[ ! -f "$sentinel" ]]; then
  printf '%s\n' '{}'
  exit 0
fi

rm -f "$sentinel"
export NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org/}"

log=$(mktemp)
if deno task test >"$log" 2>&1; then
  rm -f "$log"
  printf '%s\n' '{}'
  exit 0
fi

python3 -c '
import json, sys
path = sys.argv[1]
limit = 8000
try:
    with open(path, encoding="utf-8", errors="replace") as f:
        body = f.read()
except OSError:
    body = "(could not read test output)"
if len(body) > limit:
    body = body[:limit] + "\n...[truncated]..."
msg = (
    "deno task test failed after this turn (gscan / theme / content-api / compose). "
    "Fix the failures, then stop. Do not re-run the full suite unless needed.\n\n"
    + body
)
print(json.dumps({"followup_message": msg}))
' "$log"
rm -f "$log"
exit 0
