#!/bin/bash

set -euxo pipefail

# Run from the app directory regardless of the caller's cwd.
cd "$(dirname "$0")"

VERSION="f9f55db"

# Cache raw assets outside the transient app/ clone. The upstream build uses
# hardlinks for originals, so the cache must be on the same filesystem as
# apps/posewear (the default is). POSEWEAR_RAW may override the location.
DEFAULT_RAW_DIR="$(realpath -m "$PWD/assets-raw")"
RAW_DIR="$(realpath -m "${POSEWEAR_RAW:-$DEFAULT_RAW_DIR}")"
case "$RAW_DIR" in
  "$PWD/app"|"$PWD/app"/*)
    echo "POSEWEAR_RAW must be outside the transient app/ directory" >&2
    exit 1
    ;;
esac

# GitHub-hosted runners start with ~14GB free. The upstream asset build needs
# ~7GB for sources, ~7.5GB for dist, and another copy for the Docker context.
# Only remove preinstalled SDKs on GitHub-hosted runners; never touch a
# developer machine, even if it has passwordless sudo.
if [ "${GITHUB_ACTIONS:-}" = "true" ] && sudo -n true 2>/dev/null; then
  sudo rm -rf /usr/share/dotnet /usr/local/lib/android /opt/ghc /opt/hostedtoolcache/CodeQL
fi

# Build inside ./app so only the static site ends up in the Docker build context.
rm -rf app
mkdir -p app
git clone https://github.com/atuizz/posewear app
cd app
git checkout "$VERSION"

# 使用 mise 管理 Node.js LTS 与 Python 3.12；-p 只写临时 app/mise.toml。
mise use -p mise.toml node@lts python@3.12
mise exec -- python3 -m venv .venv
.venv/bin/pip install --no-cache-dir pillow
PYTHON="$PWD/.venv/bin/python"

# Upstream's documented build: fetch the full asset set, then build dist/.
POSEWEAR_RAW="$RAW_DIR" "$PYTHON" scripts/fetch-assets.py
# 六个可自存扩展栏目的上游档案不随仓库分发，改为从上游部署站补齐数据与图片。
POSEWEAR_RAW="$RAW_DIR" "$PYTHON" ../fetch-modules.py
# CharaDB 只取元数据，图片保持 charadb-2fi.pages.dev 热链，不下载、不再分发。
POSEWEAR_RAW="$RAW_DIR" "$PYTHON" ../fetch-charadb.py
# 通过上游 package.json 的 build 入口构建，build 脚本只是调用 python3 build.py，
# 因此不需要 npm ci。venv 放在 PATH 首位，保证脚本里的 python3 是 3.12 且能
# import Pillow。
export PATH="$PWD/.venv/bin:$PATH"
POSEWEAR_RAW="$RAW_DIR" mise exec -- npm run build
# 上游部署前的守卫：校验 12 份数据、CSP 图片源站与站点结构。
"$PYTHON" tests/check_csp.py "$PWD/dist"

# Keep only the static site in app/; raw assets live outside the clone.
find . -mindepth 1 -maxdepth 1 ! -name dist -exec rm -rf {} +
