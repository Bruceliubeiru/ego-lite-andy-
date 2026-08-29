#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SKILL_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

install_link() {
  base="$1"
  target="$base/research-router"
  mkdir -p "$base"

  if [ -L "$target" ]; then
    current=$(readlink "$target" || true)
    if [ "$current" = "$SKILL_DIR" ]; then
      printf 'research-router already installed: %s\n' "$target"
      return 0
    fi
  fi

  if [ -e "$target" ] || [ -L "$target" ]; then
    backup="${target}.backup.$(date +%Y%m%d%H%M%S)"
    mv "$target" "$backup"
    printf 'backed up existing skill to: %s\n' "$backup"
  fi

  ln -s "$SKILL_DIR" "$target"
  printf 'installed research-router: %s -> %s\n' "$target" "$SKILL_DIR"
}

install_link "$HOME/.codex/skills"
install_link "$HOME/.claude/skills"

printf '\nRestart or reload Codex/Claude so the new skill is discovered.\n'
printf 'The router will use ego-browser when live/authenticated browser verification is needed.\n'
