#!/bin/bash

set -euxo pipefail

VERSION="c2830e2"

# Clone the repository
rm -rf app && mkdir -p app && cd app
git clone https://github.com/liyupi/yulegeyu . && git checkout $VERSION
rm -rf .git

# Install Node.js and Yarn (same Node major as the previous Docker build stage)
mise use node@24 yarn@1 -g

yarn install --frozen-lockfile --network-timeout 600000
yarn run build

# Clear files that are not needed in the Docker build context
rm -rf node_modules
yarn cache clean || true
