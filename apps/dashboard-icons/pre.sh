#!/bin/bash

set -euxo pipefail

VERSION="e405c77"

# Clone the repository
mkdir -p app && cd app
git clone --depth=1 https://github.com/homarr-labs/dashboard-icons . && git checkout $VERSION

# Set up environment variables
export NEXT_PUBLIC_DISABLE_POSTHOG="true"
export NEXT_TELEMETRY_DISABLED=1
export CI_MODE=true
export NODE_ENV=production

cd web
mise trust .
mise install
mise use bun@latest -g

# Install dependencies
bun install

# Build the application
bun run build

# Clean unused files to avoid trigger github actions dist size limit
# System.IO.IOException: No space left on device
rm -rf node_modules .next/server
