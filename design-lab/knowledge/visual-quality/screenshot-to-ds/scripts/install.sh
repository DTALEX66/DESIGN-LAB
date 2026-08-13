#!/usr/bin/env bash
# Install screenshot-to-design-system Agent Skill for Cursor, Claude Code, Codex, etc.
#
# Usage:
#   curl -fsSL .../install.sh | bash                    # all agents, global
#   curl -fsSL .../install.sh | bash -s -- --project    # all agents, project
#   curl -fsSL .../install.sh | bash -s -- --cursor     # Cursor only
#   curl -fsSL .../install.sh | bash -s -- --claude     # Claude Code only
#   curl -fsSL .../install.sh | bash -s -- --codex      # OpenAI Codex only

set -euo pipefail

SKILL_NAME="screenshot-to-design-system"
REPO_URL="${SKILL_REPO_URL:-https://github.com/WCF900905/screenshot-to-design-system.git}"
SCOPE="global"
AGENTS=(cursor claude codex)

usage() {
  cat <<'EOF'
Install screenshot-to-design-system for Agent Skills–compatible tools.

Usage: install.sh [OPTIONS]

Options:
  --global          Install to user home (default)
  --project         Install to current project (run from repo root)
  --all             Install for Cursor + Claude Code + Codex (default)
  --cursor          Install for Cursor only
  --claude          Install for Claude Code only
  --codex           Install for OpenAI Codex only
  -h, --help        Show this help

Discovery paths:
  Cursor       ~/.cursor/skills/  or  .cursor/skills/
  Claude Code  ~/.claude/skills/  or  .claude/skills/
  Codex        ~/.agents/skills/  or  .agents/skills/

When installing multiple agents, the skill is cloned once to the Codex path
(~/.agents/skills/) and symlinked into Cursor and Claude Code directories.
Codex explicitly supports symlinked skills.
EOF
}

agent_base_dir() {
  local agent="$1"
  local scope="$2"
  case "${agent}:${scope}" in
    cursor:global) echo "${HOME}/.cursor/skills" ;;
    cursor:project) echo "$(pwd)/.cursor/skills" ;;
    claude:global) echo "${HOME}/.claude/skills" ;;
    claude:project) echo "$(pwd)/.claude/skills" ;;
    codex:global) echo "${HOME}/.agents/skills" ;;
    codex:project) echo "$(pwd)/.agents/skills" ;;
    *) echo "Unknown agent/scope: ${agent}/${scope}" >&2; exit 1 ;;
  esac
}

install_clone() {
  local target_dir="$1"
  mkdir -p "$(dirname "$target_dir")"

  if [[ -L "$target_dir" ]]; then
    local real_dir
    real_dir="$(cd "$(dirname "$target_dir")" && readlink "$target_dir")"
    if [[ "$real_dir" != /* ]]; then
      real_dir="$(cd "$(dirname "$target_dir")" && cd "$real_dir" && pwd)"
    fi
    target_dir="$real_dir"
  fi

  if [[ -d "${target_dir}/.git" ]]; then
    echo "  Updating ${target_dir} ..."
    git -C "$target_dir" pull --ff-only
  elif [[ -d "$target_dir" ]]; then
    echo "  Error: ${target_dir} exists but is not a git repo. Remove it first." >&2
    exit 1
  else
    echo "  Cloning ${REPO_URL} -> ${target_dir} ..."
    git clone "$REPO_URL" "$target_dir"
  fi

  if [[ ! -f "${target_dir}/SKILL.md" ]]; then
    echo "  Error: SKILL.md not found in ${target_dir}" >&2
    exit 1
  fi

  echo "$target_dir"
}

install_symlink() {
  local link_path="$1"
  local canonical_dir="$2"

  mkdir -p "$(dirname "$link_path")"

  if [[ -e "$link_path" && ! -L "$link_path" ]]; then
    echo "  Error: ${link_path} exists and is not a symlink. Remove it first." >&2
    exit 1
  fi

  ln -sfn "$canonical_dir" "$link_path"
  echo "  Linked ${link_path} -> ${canonical_dir}"
}

# Parse args
SELECTED=()
for arg in "$@"; do
  case "$arg" in
    --project) SCOPE="project" ;;
    --global)  SCOPE="global" ;;
    --all)     AGENTS=(cursor claude codex) ;;
    --cursor)  SELECTED+=(cursor) ;;
    --claude)  SELECTED+=(claude) ;;
    --codex)   SELECTED+=(codex) ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done

if ((${#SELECTED[@]} > 0)); then
  AGENTS=("${SELECTED[@]}")
fi

echo "Installing ${SKILL_NAME} (${SCOPE}) for: ${AGENTS[*]}"
echo ""

if ((${#AGENTS[@]} > 1)); then
  canonical_base="$(agent_base_dir codex "$SCOPE")"
  canonical_dir="${canonical_base}/${SKILL_NAME}"
  canonical_dir="$(install_clone "$canonical_dir")"

  for agent in "${AGENTS[@]}"; do
    [[ "$agent" == "codex" ]] && continue
    base="$(agent_base_dir "$agent" "$SCOPE")"
    install_symlink "${base}/${SKILL_NAME}" "$canonical_dir"
  done
else
  agent="${AGENTS[0]}"
  base="$(agent_base_dir "$agent" "$SCOPE")"
  install_clone "${base}/${SKILL_NAME}" >/dev/null
  echo "  Installed: ${base}/${SKILL_NAME}"
fi

echo ""
echo "Done. Restart your AI tool, then invoke the skill:"
echo "  Cursor / Claude Code:  /${SKILL_NAME}"
echo "  Codex:                 mention the skill or pick it from /skills"
echo ""
echo "Optional: pip install Pillow  # for scripts/sample_colors.py"
