#!/bin/bash

set -euxo pipefail

VERSION="e4b5388"

# Clone the repository
mkdir -p app && cd app
git clone https://github.com/imputnet/cobalt . && git checkout $VERSION
rm -rf .git

mise use pnpm -g
corepack enable && corepack prepare --activate
pnpm install --frozen-lockfile
WEB_DEFAULT_API=\$BASE_API pnpm -C web build

mise cache clear
rm -rf node_modules .next/server
