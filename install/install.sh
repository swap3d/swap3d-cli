#!/bin/sh

set -eu
umask 077

REPOSITORY="${SWAP3D_GITHUB_REPOSITORY:-swap3d/swap3d-cli}"
VERSION="${SWAP3D_VERSION:-latest}"
INSTALL_DIR="${SWAP3D_INSTALL_DIR:-$HOME/.local/bin}"
RELEASE_BASE_URL="${SWAP3D_RELEASE_BASE_URL:-https://github.com/$REPOSITORY/releases}"

usage() {
  cat <<'EOF'
Install Swap3D CLI without Node.js.

Usage:
  install.sh [--version VERSION] [--install-dir PATH]

Environment:
  SWAP3D_VERSION             Release version or "latest"
  SWAP3D_INSTALL_DIR         Binary installation directory
  SWAP3D_GITHUB_REPOSITORY  GitHub owner/repository
  SWAP3D_RELEASE_BASE_URL    Release base URL for mirrors or testing
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || {
        echo "Error: --version requires a value." >&2
        exit 1
      }
      VERSION="$2"
      shift 2
      ;;
    --install-dir)
      [ "$#" -ge 2 ] || {
        echo "Error: --install-dir requires a value." >&2
        exit 1
      }
      INSTALL_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ "$VERSION" = "latest" ]; then
  RELEASE_URL="$RELEASE_BASE_URL/latest/download"
else
  case "$VERSION" in
    v*) ;;
    *) VERSION="v$VERSION" ;;
  esac

  if ! printf '%s\n' "$VERSION" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
    echo "Error: invalid version '$VERSION'. Expected latest or x.y.z." >&2
    exit 1
  fi
  RELEASE_URL="$RELEASE_BASE_URL/download/$VERSION"
fi

case "$(uname -s)" in
  Darwin)
    PLATFORM="darwin"
    ;;
  Linux)
    PLATFORM="linux"
    ;;
  *)
    echo "Error: unsupported operating system: $(uname -s)" >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64)
    ARCHITECTURE="x64"
    ;;
  arm64|aarch64)
    ARCHITECTURE="arm64"
    ;;
  *)
    echo "Error: unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

LIBC_SUFFIX=""
if [ "$PLATFORM" = "linux" ]; then
  if [ -f /etc/alpine-release ] || (ldd --version 2>&1 || true) | grep -qi musl; then
    LIBC_SUFFIX="-musl"
  fi
fi

ASSET="swap3d-$PLATFORM-$ARCHITECTURE$LIBC_SUFFIX.tar.gz"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/swap3d-install.XXXXXX")"
ARCHIVE_PATH="$TEMP_DIR/$ASSET"
CHECKSUM_PATH="$TEMP_DIR/SHA256SUMS"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT INT TERM

download_file() {
  source_url="$1"
  destination="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --connect-timeout 10 "$source_url" -o "$destination"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$source_url" -O "$destination"
  else
    echo "Error: curl or wget is required." >&2
    exit 1
  fi
}

calculate_sha256() {
  file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$file_path" | awk '{print $NF}'
  else
    echo "Error: no SHA-256 utility is available." >&2
    exit 1
  fi
}

echo "Downloading Swap3D CLI $VERSION for $PLATFORM-$ARCHITECTURE$LIBC_SUFFIX..."
download_file "$RELEASE_URL/$ASSET" "$ARCHIVE_PATH"
download_file "$RELEASE_URL/SHA256SUMS" "$CHECKSUM_PATH"

EXPECTED_SHA256="$(awk -v asset="$ASSET" '$2 == asset {print $1}' "$CHECKSUM_PATH")"
[ -n "$EXPECTED_SHA256" ] || {
  echo "Error: SHA256SUMS does not contain $ASSET." >&2
  exit 1
}

ACTUAL_SHA256="$(calculate_sha256 "$ARCHIVE_PATH")"
[ "$ACTUAL_SHA256" = "$EXPECTED_SHA256" ] || {
  echo "Error: checksum verification failed for $ASSET." >&2
  exit 1
}

tar -xzf "$ARCHIVE_PATH" -C "$TEMP_DIR"
[ -x "$TEMP_DIR/swap3d" ] || {
  echo "Error: release archive does not contain an executable swap3d binary." >&2
  exit 1
}

EXISTING_SWAP3D="$(command -v swap3d 2>/dev/null || true)"
TARGET_PATH="$INSTALL_DIR/swap3d"
if [ -n "$EXISTING_SWAP3D" ] && [ "$EXISTING_SWAP3D" != "$TARGET_PATH" ]; then
  echo "Warning: another swap3d command exists at $EXISTING_SWAP3D." >&2
  echo "PATH order will decide which installation is used." >&2
fi

mkdir -p "$INSTALL_DIR"
if command -v install >/dev/null 2>&1; then
  install -m 0755 "$TEMP_DIR/swap3d" "$TARGET_PATH"
else
  cp "$TEMP_DIR/swap3d" "$TARGET_PATH"
  chmod 0755 "$TARGET_PATH"
fi

INSTALLED_VERSION="$("$TARGET_PATH" --version)"
echo "Swap3D CLI $INSTALLED_VERSION installed at $TARGET_PATH"

case ":$PATH:" in
  *":$INSTALL_DIR:"*)
    echo "Run: swap3d --help"
    ;;
  *)
    echo "Add this directory to PATH:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    echo "Then run: swap3d --help"
    ;;
esac
