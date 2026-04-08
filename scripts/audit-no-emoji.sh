#!/usr/bin/env sh
set -eu

status=0
files=$(find apps/web/src apps/agents/src -type f \( -name "*.ts" -o -name "*.tsx" \))

if [ -z "$files" ]; then
  echo "No source files found for emoji audit"
  exit 0
fi

for file in $files; do
  if perl -ne 'if(/[\x{1F300}-\x{1FAFF}]/){print "$ARGV:$.:$_"; $found=1} END{exit($found?1:0)}' "$file"; then
    :
  else
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "Emoji characters are not allowed in source files"
  exit 1
fi

echo "No emoji characters found"
