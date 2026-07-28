#!/usr/bin/env sh

set -eu

if ! command -v freeze >/dev/null 2>&1; then
  echo "freeze is required: brew install charmbracelet/tap/freeze" >&2
  exit 1
fi

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert is required: brew install librsvg" >&2
  exit 1
fi

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output="$repo_root/assets/readme-terminal.png"
config="$repo_root/scripts/readme-terminal.freeze.json"
temp_dir=$(mktemp -d)
svg="$temp_dir/readme-terminal.svg"

cleanup() {
  rm -f "$svg"
  rmdir "$temp_dir" 2>/dev/null || true
}

trap cleanup EXIT

render_transcript() {
  printf '\033[38;2;148;163;184m~/models\033[0m\n'
  printf '\033[38;2;167;139;250m❯\033[0m \033[38;2;248;250;252mswap3d convert chair.obj --to glb --out chair.glb\033[0m\n\n'
  printf '  \033[38;2;148;163;184mjobId:\033[0m      \033[38;2;226;232;240mcm8k2p7jx0001v9x4d2q6n3fa\033[0m\n\n'
  printf '  \033[38;2;148;163;184mstatus:\033[0m     \033[38;2;226;232;240mqueued\033[0m\n'
  printf '  \033[38;2;148;163;184mstatus:\033[0m     \033[38;2;226;232;240mprocessing\033[0m\n'
  printf '  \033[38;2;148;163;184mstatus:\033[0m     \033[38;2;74;222;128mcompleted\033[0m\n\n'
  printf '  \033[38;2;148;163;184mdownloaded:\033[0m \033[38;2;196;181;253mchair.glb\033[0m\n'
}

mkdir -p "$(dirname -- "$output")"

render_transcript | freeze \
  --config "$config" \
  --output "$svg"

rsvg-convert --zoom 2 --output "$output" "$svg"

echo "Generated $output at 2x resolution"
