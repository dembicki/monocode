#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Linux" || ! -f /etc/arch-release ]]; then
  echo "This installer only supports Arch Linux and Arch-based systems." >&2
  exit 1
fi

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_binary="$project_dir/target/release/monocode"

if [[ ! -x "$source_binary" ]]; then
  echo "Built binary not found at: $source_binary" >&2
  exit 1
fi

data_dir="${XDG_DATA_HOME:-$HOME/.local/share}"
bin_dir="${XDG_BIN_HOME:-$HOME/.local/bin}"
applications_dir="$data_dir/applications"
icons_dir="$data_dir/icons/hicolor"
installed_binary="$data_dir/monocode/monocode"
installed_launcher="$bin_dir/monocode"
installed_desktop="$applications_dir/MonoCode.desktop"

install -Dm755 "$source_binary" "$installed_binary"
install -Dm755 "$project_dir/scripts/run-monocode-arch.sh" "$installed_launcher"
install -Dm644 "$project_dir/scripts/MonoCode.desktop" "$installed_desktop"
install -Dm644 "$project_dir/src-tauri/icons/32x32.png" \
  "$icons_dir/32x32/apps/monocode.png"
install -Dm644 "$project_dir/src-tauri/icons/128x128.png" \
  "$icons_dir/128x128/apps/monocode.png"
install -Dm644 "$project_dir/src-tauri/icons/128x128@2x.png" \
  "$icons_dir/256x256/apps/monocode.png"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$applications_dir"
fi

echo "Installed MonoCode to $installed_binary"
echo "Launch it from the app menu or run: monocode"
