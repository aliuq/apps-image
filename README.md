# Apps Image

<p>
  <a href="https://github.com/aliuq/apps-image/actions/workflows/check-version.yaml"><img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/check-version.yaml?label=Check%20Version"></a>
  <a href="https://github.com/aliuq/apps-image/actions/workflows/build-image.yaml"><img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/build-image.yaml?label=Build%20Image"></a>
  <a href="https://hub.docker.com/u/aliuq"><img alt="Docker Hub" src="https://img.shields.io/badge/Docker%20Hub-aliuq-blue"></a>
  <a href="https://aliuq.github.io/apps-image"><img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub%20Pages-https://aliuq.github.io/apps--image-blue"></a>
</p>

A collection of Docker images for various applications, automatically built and published with version tracking and multi-variant support.

> 🌐 **Documentation**: Visit [https://aliuq.github.io/apps-image](https://aliuq.github.io/apps-image) for the full image catalog
>
> 🐳 **Docker Hub**: Find all images at [hub.docker.com/u/aliuq](https://hub.docker.com/u/aliuq)

## Local Testing with act

### Check Version

Test version checking for applications:

```bash
# Check single application
act workflow_dispatch -W .github/workflows/check-version.yaml \
  --input debug=true \
  --input context=base/nginx

# Check multiple applications
act workflow_dispatch -W .github/workflows/check-version.yaml \
  --input debug=true \
  --input context=base/nginx,base/self

# Check all applications
act workflow_dispatch -W .github/workflows/check-version.yaml \
  --input debug=true \
  --input context=all
```

### Build Image

Test image building locally:

```bash
# Dry run: view docker metadata only
act workflow_dispatch -W .github/workflows/build-test.yaml \
  --input debug=true \
  --input context=apps/icones \
  --input build=false \
  --input notify=false

# Full build: includes image building and notifications
act workflow_dispatch -W .github/workflows/build-test.yaml \
  --input debug=true \
  --input context=apps/icones

# Build with specific variants (latest, dev)
act workflow_dispatch -W .github/workflows/build-test.yaml \
  --input debug=true \
  --input context=apps/icones \
  --input build=false \
  --input notify=false \
  --input variants=latest,dev
```

## Add New Application

Follow these steps to add a new application to the repository:

### 1. Create Application Directory

Create a new directory under `apps/` or `base/` depending on your application type:

```bash
mkdir -p apps/your-app
cd apps/your-app
```

### 2. Create meta.json

Create a `meta.json` file to define application metadata and version checking strategy:

```json
{
  "name": "your-app",
  "type": "app",
  "title": "Your App Title",
  "slogan": "Brief description for the catalog",
  "description": "Detailed description of your application",
  "license": "MIT",
  "variants": {
    "latest": {
      "version": "1.0.0",
      "sha": "abc1234",
      "checkver": {
        "type": "version",
        "repo": "https://github.com/owner/repo",
        "file": "package.json"
      }
    }
  }
}
```

**Docker Configuration (default):**

```json
{
  "docker": {
    "file": "Dockerfile",
    "images": ["aliuq/{{name}}", "ghcr.io/aliuq/{{name}}"],
    "tags": [
      "type=raw,value=latest",
      "type=raw,value={{version}}"
    ],
    "platforms": ["linux/amd64", "linux/arm64"]
  }
}
```

### 3. Create Dockerfile

Create a `Dockerfile` for your application. You can use version placeholders that will be automatically replaced:

**Available placeholders:**

- `{{version}}` - Version string (e.g., `1.2.3`)
- `{{major}}` - Major version (e.g., `1`)
- `{{minor}}` - Minor version (e.g., `1.2`)
- `{{sha}}` - Short commit SHA (7 characters)
- `{{fullSha}}` - Full commit SHA (40 characters)
- `{version}` - Alternative syntax
- `$version$` - Alternative syntax

### 4. Create README.md (Optional)

Add a `README.md` file in your application directory with usage instructions:

### 5. Custom Build Scripts (Optional)

To customize the build process, create `pre.sh` and/or `post.sh` scripts in the application's directory.

> [!TIP]
> Especially useful when building multi-platform web application images, since building Next.js apps on arm64 is very slow. You can pre-build assets in `pre.sh` and copy them in the Dockerfile.

**Example pre.sh:**

```bash
#!/bin/bash

set -euxo pipefail

VERSION="{{version}}"

# Clone the repository
mkdir -p app && cd app
git clone --depth=1 https://github.com/raycast/ray-so . && git checkout $VERSION

# Install Bun and Node.js
mise use bun@latest node@lts -g

# Build the application
bun install --no-cache && bun run build
```

then in your Dockerfile, copy the built assets:

```dockerfile
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY ./app/public ./public
COPY ./app/.next/standalone/apps/rayso/app ./
COPY ./app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Script Options:**

- `-e`: Exit immediately if a command returns a non-zero status
- `-u`: Exit immediately when attempting to use an unset variable
- `-x`: Print each command to standard output as it is executed
- `-o pipefail`: Pipeline fails if any command in it fails

**Available placeholders:**

- `{{version}}` - Version string (e.g., `1.2.3`)
- `{{sha}}` - Short commit SHA (7 characters)
- `{{fullSha}}` - Full commit SHA (40 characters)
- `{version}` - Alternative syntax
- `$version$` - Alternative syntax

## Related Projects

- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [Docker](https://www.docker.com/) - Container platform
- [@actions/toolkit](https://github.com/actions/toolkit) - GitHub Actions Toolkit

---

Made with ❤️ by [aliuq](https://github.com/aliuq)
