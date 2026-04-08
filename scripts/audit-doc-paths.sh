#!/usr/bin/env sh
set -eu

if rg -n "apps/agent/|apps/dashboard/" docs; then
  echo "Outdated app paths found in docs"
  exit 1
fi

echo "Docs app paths are consistent"
