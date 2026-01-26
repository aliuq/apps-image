#!/bin/bash

set -euo pipefail

VERSION="f0b5462"

# Clone the repository
mkdir -p app && cd app
git clone --depth=1 https://github.com/raycast/ray-so . && git checkout $VERSION

# Configure Next.js for standalone output
if ! grep -q 'output:' next.config.js; then
  sed -i '/const nextConfig = {/a\  output: "standalone",' next.config.js;
else
  sed -i 's/output: .*/output: "standalone",/' next.config.js;
fi

# Install Bun and Node.js
mise use bun@latest node@lts -g

# Build the application
bun install --no-cache && bun run build
