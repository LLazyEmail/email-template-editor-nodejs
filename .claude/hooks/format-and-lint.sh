#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just edited and report lint errors back to it.
# Input: the hook JSON on stdin (tool_input.file_path). Exit 2 sends stderr to Claude.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[[ -z "$file" || ! -f "$file" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR"

# Only files inside this repository.
case "$(realpath "$file")" in
  "$(realpath "$CLAUDE_PROJECT_DIR")"/*) ;;
  *) exit 0 ;;
esac

case "$file" in
  *.ts | *.js | *.mjs | *.cjs | *.json | *.md | *.yml | *.yaml) ;;
  *) exit 0 ;;
esac

# Respects .prettierignore; unknown file types are skipped.
npx --no-install prettier --write --ignore-unknown --log-level warn "$file" >/dev/null

case "$file" in
  *.ts | *.js | *.mjs | *.cjs)
    if ! out=$(npx --no-install eslint --fix --no-warn-ignored "$file" 2>&1); then
      echo "ESLint errors in $file (fix them before finishing):" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
