#!/bin/bash
#-------------------------------------------------------------------------------------------------------------
# 自动将 workspace 中的 apps/* base/* test/* 下的目录加入 zoxide
#-------------------------------------------------------------------------------------------------------------

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 zoxide 是否可用
if command -v zoxide >/dev/null 2>&1; then
  dirs=(apps base test)
  count=0

  for app_dir in "${dirs[@]}"; do
    # 仅遍历一级目录且仅限目录（zsh glob 資格：(/)）
    for dir in ${ROOT}/${app_dir}/*(/); do
      [[ -d $dir ]] || continue
      if zoxide add "$dir"; then
        ((count++))
      else
        printf 'Failed to add: %s\n' "$dir" >&2
      fi
    done
  done
fi
