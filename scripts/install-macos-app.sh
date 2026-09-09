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

running_pids=()
while IFS= read -r pid; do
  [[ -n "$pid" ]] && running_pids+=("$pid")
done < <(
  ps -axo pid=,command= | awk \
    '$2 ~ /\/MonoCode\.app\/Contents\/MacOS\/monocode$/ { print $1 }'
)

if (( ${#running_pids[@]} > 0 )); then
  kill -TERM "${running_pids[@]}" 2>/dev/null || true

  for _ in {1..100}; do
    remaining=0
    for pid in "${running_pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        remaining=1
        break
      fi
    done
    (( remaining == 0 )) && break
    sleep 0.1
  done

  if (( remaining != 0 )); then
    echo "MonoCode did not quit; close it and run the command again." >&2
    exit 1
  fi
fi

if [[ -e "$installed_app" ]]; then
  rm -rf -- "$installed_app"
fi

/usr/bin/ditto "$source_app" "$installed_app"
open -n "$installed_app"

echo "Installed and opened $installed_app"
