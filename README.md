# Apps Image

<p>
  <a href="https://github.com/aliuq/apps-image/actions/workflows/check-version.yaml">
    <img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/check-version.yaml?label=Check%20Version">
  </a>
  <a href="https://github.com/aliuq/apps-image/actions/workflows/build-image.yaml">
    <img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/build-image.yaml?label=Build%20Image">
  </a>
  <a href="https://hub.docker.com/u/aliuq">
    <img alt="Docker Hub" src="https://img.shields.io/badge/Docker%20Hub-aliuq-blue">
  </a>
  <a href="https://aliuq.github.io/apps-image">
    <img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub%20Pages-https://aliuq.github.io/apps--image-blue">
  </a>
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

## Related Projects

- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [Docker](https://www.docker.com/) - Container platform
- [@actions/toolkit](https://github.com/actions/toolkit) - GitHub Actions Toolkit

---

Made with ❤️ by [aliuq](https://github.com/aliuq)
