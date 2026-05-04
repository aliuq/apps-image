#!/bin/bash

set -euxo pipefail

VERSION="3004c64"

# Clone the repository
mkdir -p app && cd app
git clone https://github.com/excalidraw/excalidraw . && git checkout $VERSION

# Install Node.js and Yarn
mise use node@22 yarn@1 -g

yarn install --frozen-lockfile --network-timeout 600000

NODE_ENV=production yarn build:app:docker

# Clear files that are not needed in the Docker build context
rm -rf .git
rm -rf node_modules
yarn cache clean || true
