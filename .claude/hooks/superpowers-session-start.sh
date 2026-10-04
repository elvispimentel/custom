#!/usr/bin/env bash
# Injeta using-superpowers no começo de cada sessão (startup, clear, compact),
# para o Claude checar skills antes de responder, sem o usuário precisar lembrar.
set -euo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
F="$ROOT/.claude/skills/using-superpowers/SKILL.md"
[ -f "$F" ] || exit 0
node -e '
const fs = require("fs");
const body = fs.readFileSync(process.argv[1], "utf8");
const ctx = "<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\nBelow is the full content of your using-superpowers skill. For all other skills, use the Skill tool:\n\n" + body + "\n</EXTREMELY_IMPORTANT>";
process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:ctx}}));
' "$F"
