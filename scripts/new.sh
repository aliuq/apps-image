#!/bin/sh

# Check if directory parameter is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <directory_name_or_path>"
  echo "Examples:"
  echo "  $0 myapp          # Creates apps/myapp"
  echo "  $0 test/myapp     # Creates test/myapp"
  echo "  $0 base/mybase    # Creates base/mybase"
  echo "  $0 sync/mysync    # Creates sync/mysync"
  exit 1
fi

INPUT_PATH="$1"

# Check if input contains a slash (indicates it's a path with prefix)
case "$INPUT_PATH" in
  */*)
    # Input contains slash, use as-is
    DIR_PATH="$INPUT_PATH"
    DIR_NAME=$(basename "$INPUT_PATH")
    PREFIX=$(dirname "$INPUT_PATH")
    ;;
  *)
    # Input is just a name, default to apps/ prefix
    DIR_NAME="$INPUT_PATH"
    PREFIX="apps"
    DIR_PATH="apps/$DIR_NAME"
    ;;
esac

# Map PREFIX to TYPE based on directory structure
case "$PREFIX" in
  apps)
    TYPE="app"
    ;;
  base)
    TYPE="base"
    ;;
  sync)
    TYPE="sync"
    ;;
  test)
    TYPE="app"  # test directory maps to app type
    ;;
  *)
    TYPE="app"  # default to app for any other prefix
    ;;
esac

# Validate directory name (only the basename) - using POSIX compliant regex
if ! echo "$DIR_NAME" | grep -q '^[a-zA-Z0-9_-]\+$'; then
  echo "Error: Directory name can only contain letters, numbers, underscores, and hyphens"
  echo "Invalid name: '$DIR_NAME'"
  exit 1
fi

# Validate prefix (should be one of the known types)
case "$PREFIX" in
  apps|base|sync|test)
    # Valid prefixes
    ;;
  *)
    echo "Warning: Using non-standard prefix '$PREFIX'"
    echo "Standard prefixes are: apps, base, sync, test"
    echo "Type will be set to 'app' by default"
    printf "Continue anyway? (y/N): "
    read REPLY
    case "$REPLY" in
      [Yy]|[Yy][Ee][Ss])
        # Continue
        ;;
      *)
        echo "Cancelled."
        exit 1
        ;;
    esac
    ;;
esac

# Get the compose directory path (assuming script is in scripts directory)
SCRIPT_DIR="$(dirname "$0")"
COMPOSE_PATH="$(dirname "$SCRIPT_DIR")"
TARGET_PATH="$COMPOSE_PATH/$DIR_PATH"

# Check if directory already exists
if [ -d "$TARGET_PATH" ]; then
  echo "Error: Directory '$DIR_PATH' already exists in $COMPOSE_PATH"
  exit 1
fi

# Create the directory structure
mkdir -p "$TARGET_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to create directory '$TARGET_PATH'"
  exit 1
fi

# Create basic files
touch "$TARGET_PATH/Dockerfile"
touch "$TARGET_PATH/meta.json"
touch "$TARGET_PATH/README.md"

# Create a basic meta.json template based on type mapping
cat > "$TARGET_PATH/meta.json" << EOF
{
  "name": "$DIR_NAME",
  "type": "$TYPE",
  "version": "\$version\$",
  "sha": "\$fullSha\$",
  "repo": "",
  "description": "",
  "dockerMeta": {
    "context": "$DIR_PATH",
    "dockerfile": "Dockerfile",
    "push": true,
    "tags": [
      "type=raw,value=latest",
      "type=raw,value=\$version\$",
      "type=raw,value=\$sha\$"
    ]
  },
  "checkVer": {
    "type": "version",
    "file": "package.json"
  }
}
EOF

# Create a basic Dockerfile template
cat > "$TARGET_PATH/Dockerfile" << EOF
# Basic Dockerfile template for $DIR_NAME
FROM alpine/git AS base
WORKDIR /app
RUN git clone YOUR_REPO_URL . && git checkout \$sha\$

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=base /app .
# RUN npm install && npm run build

FROM nginx:alpine
WORKDIR /app
# COPY --from=build /app/dist /usr/share/nginx/html

# Version: \$version\$
# SHA: \$fullSha\$

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create a basic README template
cat > "$TARGET_PATH/README.md" << 'EOF'
# $DIR_NAME

## Description

Brief description of $DIR_NAME.

## Usage

Instructions for using this application.

## Configuration

Configuration details and environment variables.

## Build

```bash
docker build -t $DIR_NAME .
```

## Run

```bash
docker run -d --name $DIR_NAME $DIR_NAME
```
EOF

# Replace variables in README.md
sed -i.bak "s/\$DIR_NAME/$DIR_NAME/g" "$TARGET_PATH/README.md" && rm "$TARGET_PATH/README.md.bak"

echo "✅ Successfully created $PREFIX application structure:"
echo "📁 $TARGET_PATH/"
echo "   ├── Dockerfile (with basic template and placeholders)"
echo "   ├── meta.json (with type: '$TYPE' and placeholders)"
echo "   └── README.md (with basic template)"
echo ""
echo "💡 Placeholder Usage:"
echo "   \$version\$   - Will be replaced with actual version"
echo "   \$sha\$      - Will be replaced with 7-char commit SHA"
echo "   \$fullSha\$  - Will be replaced with full commit SHA"
echo ""
echo "🔧 Alternative Placeholders (also supported):"
echo "   {{version}}, {version}"
echo "   {{sha}}, {sha}"
echo "   {{fullSha}}, {fullSha}"
echo ""
echo "📝 Next steps:"
echo "   1. Edit meta.json with your application details"
echo "   2. Update Dockerfile with your build steps"
echo "   3. Add your application code"
echo "   4. Update README.md with specific documentation"
echo "   5. The placeholders will be automatically replaced during CI/CD"

# # 创建 apps/myapp
# ./scripts/new.sh myapp

# # 创建 test/mytest
# ./scripts/new.sh test/mytest

# # 创建 base/mybase
# ./scripts/new.sh base/mybase

# # 创建 sync/mysync
# ./scripts/new.sh sync/mysync

# # 创建自定义前缀（会有警告）
# ./scripts/new.sh custom/myapp
