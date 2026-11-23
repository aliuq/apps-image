#!/bin/bash

set -euxo pipefail

# Run from the app directory regardless of the caller's cwd.
cd "$(dirname "$0")"

VERSION="0c97ab4"

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

# build.py requires Pillow. Use a throwaway venv so the system Python can stay
# externally managed. Pin Python 3.12 globally, like the other pre.sh scripts:
# upstream's module-level ProcessPoolExecutor needs the pre-3.14 default `fork`
# start method (3.14 defaults to forkserver). mise exec then picks 3.12 up
# immediately, without waiting for a shell activation refresh.
mise use python@3.12 -g
mise exec -- python3 -m venv .venv
.venv/bin/pip install --no-cache-dir pillow

# Upstream's documented build: fetch the full asset set, then build dist/.
POSEWEAR_RAW="$RAW_DIR" .venv/bin/python scripts/fetch-assets.py
POSEWEAR_RAW="$RAW_DIR" .venv/bin/python build.py

# Keep only the static site in app/; raw assets live outside the clone.
find . -mindepth 1 -maxdepth 1 ! -name dist -exec rm -rf {} +

# The default raw cache is temporary. An explicitly configured POSEWEAR_RAW is
# preserved; POSEWEAR_KEEP_RAW=1 keeps the default assets-raw for incremental
# builds. Delete only after build.py, because dist/o hardlinks the originals.
if [ "${POSEWEAR_KEEP_RAW:-0}" != "1" ] && [ "$RAW_DIR" = "$DEFAULT_RAW_DIR" ]; then
  rm -rf "$RAW_DIR"
fi
