#!/bin/bash

# Check if directory parameter is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <directory_name>"
  echo "Example: $0 myapp"
  exit 1
fi

DIR_NAME="$1"

# Check if directory name is valid
if ! echo "$DIR_NAME" | grep -q '^[a-zA-Z0-9_-]\+$'; then
  echo "Error: Directory name can only contain letters, numbers, underscores, and hyphens"
  exit 1
fi

# Get the compose directory path (assuming script is in compose directory)
SCRIPT_DIR="$(dirname "$0")"
COMPOSE_PATH="$(dirname "$SCRIPT_DIR")/apps"
TARGET_PATH="$COMPOSE_PATH/$DIR_NAME"

# Check if directory already exists
if [ -d "$TARGET_PATH" ]; then
  echo "Error: Directory '$DIR_NAME' already exists in $COMPOSE_PATH"
  exit 1
fi

# Create the directory
mkdir -p "$TARGET_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to create directory '$TARGET_PATH'"
  exit 1
fi


touch "$TARGET_PATH/Dockerfile"
touch "$TARGET_PATH/meta.json"
touch "$TARGET_PATH/README.md"

echo "✅ Successfully created directory structure:"
echo "📁 $TARGET_PATH/"
echo "   ├── Dockerfile"
echo "   ├── meta.json"
echo "   └── README.md"
echo ""
