#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(
  python3 -c 'import json,sys; print(json.load(sys.stdin).get("file_path",""))' <<<"$input"
)

base=$(basename "$file_path")

if [[ "$base" == ".env" ]] || [[ "$base" == .env.* && "$base" != ".env.example" ]]; then
  printf '%s\n' '{"permission":"deny","user_message":"Reading .env files is blocked for agents."}'
  exit 0
fi

printf '%s\n' '{"permission":"allow"}'
exit 0
