#!/usr/bin/env bash
# Packages the skill as dist/design-thinking-methods.zip for upload
# to claude.ai (Settings → Capabilities → Skills).
set -euo pipefail

cd "$(dirname "$0")/.."
NAME="design-thinking-methods"
DIST="dist"
REPO_ROOT="$(git rev-parse --show-toplevel)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# Only what the skill needs at runtime (plus LICENSE) — no README, no dist.
mkdir -p "$STAGE/$NAME"
cp SKILL.md "$STAGE/$NAME/"
cp "$REPO_ROOT/LICENSE" "$STAGE/$NAME/"
cp -R references assets scripts "$STAGE/$NAME/"
rm -f "$STAGE/$NAME/scripts/package.sh"

mkdir -p "$DIST"
rm -f "$DIST/$NAME.zip"
(cd "$STAGE" && zip -qr "$OLDPWD/$DIST/$NAME.zip" "$NAME" -x '*.DS_Store')

echo "Paket: $DIST/$NAME.zip"
unzip -l "$DIST/$NAME.zip"
