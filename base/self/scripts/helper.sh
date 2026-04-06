#!/bin/bash

set -e

# Add or remove a plugin from the oh-my-zsh plugin list
# Usage: _add_omz_plugin <plugin_name> or _add_omz_plugin -<plugin_name> to remove
_add_omz_plugin() {
  local plugin_name="$1"
  local current_shell_rc="${2:-$HOME/.zshrc}"
  # Remove leading/trailing whitespace
  plugin_name="$(echo "${plugin_name}" | xargs)"
  local is_delete="false"

  # Check if plugin name starts with '-', indicating removal operation
  if [[ "$plugin_name" == -* ]]; then
    is_delete="true"
    plugin_name="${plugin_name#-}"
  fi

  # Only proceed if oh-my-zsh is installed and shell RC file exists
  if [[ -n "$current_shell_rc" ]]; then
    # Handle plugin removal: check for exact match with word boundaries
    if [[ "$is_delete" == "true" ]]; then
      # Check if plugin exists in the list (with word boundaries to avoid partial matches)
      if grep -q "^plugins=(.*\b${plugin_name}\b.*)" "$current_shell_rc"; then
        # Remove the plugin from the plugins array
        # This handles: plugins=(plugin_name ...), plugins=(... plugin_name), and plugins=(... plugin_name ...)
        sed -i "/^plugins=(/s/\b${plugin_name}\b[[:space:]]*//g" "$current_shell_rc"
        # Clean up extra spaces: remove leading/trailing spaces and collapse multiple spaces
        sed -i '/^plugins=(/s/([[:space:]]\+/(/; s/[[:space:]]\+)/)/; s/[[:space:]]\{2,\}/ /g' "$current_shell_rc"
      fi
      return
    fi

    # Handle plugin addition: only add if not already present (check for word boundaries)
    if ! grep -q "^plugins=(.*\b${plugin_name}\b.*)" "$current_shell_rc"; then
      sed -i "s/^plugins=(\(.*\))/plugins=(\1 ${plugin_name})/" "$current_shell_rc"
    fi
  fi
}
