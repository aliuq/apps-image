#!/bin/bash

set -euxo pipefail

VERSION="{{version}}"

# Clone the repository
mkdir -p app && cd app
git clone https://github.com/excalidraw/excalidraw . && git checkout $VERSION

# Install Bun and Node.js
mise use node@22 yarn@1 -g

yarn --network-timeout 600000 install

NODE_ENV=production yarn build:app:docker

# Clear
rm .git -rf
