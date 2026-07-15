#!/usr/bin/env bash
# WSL(Ubuntu, systemd有効)へDocker Engineを導入する一回限りの管理者用スクリプト。
# OSパッケージを変更するため`make bootstrap`からは実行しない(README参照)。
# 実行にはsudoパスワードが必要。実行後は一度ログインし直してdockerグループを反映する。
set -euo pipefail

if ! grep -qi microsoft /proc/version; then
    echo "This script targets WSL. Aborting." >&2
    exit 1
fi
if [ "$(ps -p 1 -o comm=)" != "systemd" ]; then
    echo "systemd is required (enable it in /etc/wsl.conf and restart WSL). Aborting." >&2
    exit 1
fi

. /etc/os-release
if [ "${ID}" != "ubuntu" ]; then
    echo "This script targets Ubuntu. Aborting." >&2
    exit 1
fi

# Docker公式aptリポジトリの登録 (https://docs.docker.com/engine/install/ubuntu/)
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "${USER}"

echo
echo "Docker Engine installed. Log out and back in (or run 'newgrp docker'),"
echo "then verify with: docker run --rm hello-world"
