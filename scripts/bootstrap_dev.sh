#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.tools"
BIN_DIR="$TOOLS_DIR/bin"

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
    echo "Unsupported platform: $(uname -s)/$(uname -m). This bootstrap supports Linux/WSL x86_64." >&2
    exit 1
fi

UV_VERSION="0.11.28"
UV_ARCHIVE="uv-x86_64-unknown-linux-gnu.tar.gz"
UV_SHA256="e490a6464492183c5d4534a5527fb4440f7f2bb2f228162ad7e4afe076dc0224"
UV_URL="https://github.com/astral-sh/uv/releases/download/$UV_VERSION/$UV_ARCHIVE"

NODE_VERSION="24.18.0"
NODE_ARCHIVE="node-v$NODE_VERSION-linux-x64.tar.xz"
NODE_SHA256="55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742"
NODE_URL="https://nodejs.org/dist/v$NODE_VERSION/$NODE_ARCHIVE"
NODE_HOME="$TOOLS_DIR/node-v$NODE_VERSION-linux-x64"

GITLEAKS_VERSION="8.30.1"
GITLEAKS_ARCHIVE="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
GITLEAKS_URL="https://github.com/gitleaks/gitleaks/releases/download/v$GITLEAKS_VERSION/$GITLEAKS_ARCHIVE"

mkdir -p "$BIN_DIR" "$TOOLS_DIR/cache" "$TOOLS_DIR/python"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

download_and_verify() {
    local url="$1"
    local destination="$2"
    local checksum="$3"
    curl --proto '=https' --tlsv1.2 -fsSL "$url" -o "$destination"
    echo "$checksum  $destination" | sha256sum --check --status
}

if [[ ! -x "$BIN_DIR/uv" ]] || [[ "$("$BIN_DIR/uv" --version)" != "uv $UV_VERSION "* ]]; then
    download_and_verify "$UV_URL" "$work_dir/$UV_ARCHIVE" "$UV_SHA256"
    tar -xzf "$work_dir/$UV_ARCHIVE" -C "$work_dir"
    install -m 0755 "$work_dir/uv-x86_64-unknown-linux-gnu/uv" "$BIN_DIR/uv"
    install -m 0755 "$work_dir/uv-x86_64-unknown-linux-gnu/uvx" "$BIN_DIR/uvx"
fi

if [[ ! -x "$NODE_HOME/bin/node" ]]; then
    download_and_verify "$NODE_URL" "$work_dir/$NODE_ARCHIVE" "$NODE_SHA256"
    tar -xJf "$work_dir/$NODE_ARCHIVE" -C "$TOOLS_DIR"
fi
for executable in node npm npx corepack; do
    ln -sfn "$NODE_HOME/bin/$executable" "$BIN_DIR/$executable"
done

if [[ ! -x "$BIN_DIR/gitleaks" ]] || [[ "$("$BIN_DIR/gitleaks" version)" != "$GITLEAKS_VERSION" ]]; then
    download_and_verify "$GITLEAKS_URL" "$work_dir/$GITLEAKS_ARCHIVE" "$GITLEAKS_SHA256"
    tar -xzf "$work_dir/$GITLEAKS_ARCHIVE" -C "$work_dir" gitleaks
    install -m 0755 "$work_dir/gitleaks" "$BIN_DIR/gitleaks"
fi

export PATH="$BIN_DIR:$PATH"
export UV_CACHE_DIR="$TOOLS_DIR/cache"
export UV_PYTHON_INSTALL_DIR="$TOOLS_DIR/python"
export PLAYWRIGHT_BROWSERS_PATH="$TOOLS_DIR/playwright"

uv python install 3.12.13
if [[ ! -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    chmod 600 "$ROOT_DIR/.env"
fi
uv sync --project "$ROOT_DIR/backend" --frozen
npm --prefix "$ROOT_DIR/frontend" ci
npm --prefix "$ROOT_DIR/frontend" exec -- playwright install chromium

echo "Development environment is ready."
echo "Run: make check"
