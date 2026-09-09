#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer only supports macOS." >&2
  exit 1
fi

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_app="$project_dir/target/release/bundle/macos/MonoCode.app"
applications_dir="/Applications"
installed_app="$applications_dir/MonoCode.app"

if [[ ! -d "$source_app" ]]; then
  echo "Built app not found at: $source_app" >&2
  exit 1
fi

if [[ ! -d "$applications_dir" ]]; then
  echo "Applications directory not found at: $applications_dir" >&2
  exit 1
fi

if pgrep -x monocode >/dev/null 2>&1; then
  osascript -e 'tell application id "com.monocode.desktop" to quit'

  for _ in {1..50}; do
    if ! pgrep -x monocode >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done

  if pgrep -x monocode >/dev/null 2>&1; then
    echo "MonoCode did not quit; close it and run the command again." >&2
    exit 1
  fi
fi

if [[ -e "$installed_app" ]]; then
  rm -rf -- "$installed_app"
fi

/usr/bin/ditto "$source_app" "$installed_app"
open "$installed_app"

echo "Installed and opened $installed_app"
