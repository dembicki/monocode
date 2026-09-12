#!/usr/bin/env bash

set -euo pipefail

# WebKitGTK's DMA-BUF renderer can trigger a Wayland explicit-sync protocol
# error on current Arch/Omarchy graphics stacks.
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"

app="${XDG_DATA_HOME:-$HOME/.local/share}/monocode/monocode"

if [[ ! -x "$app" ]]; then
  echo "MonoCode is not installed at: $app" >&2
  exit 1
fi

exec "$app" "$@"
