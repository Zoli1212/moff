#!/bin/bash
# Post-commit trigger — reads hook input, only fires on actual git commit commands
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ ! "$COMMAND" =~ ^git\ commit ]]; then
  exit 0
fi

COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo "")
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || echo "")
DIFF_STAT=$(git diff-tree --no-commit-id --stat -r HEAD 2>/dev/null || echo "")

cat << EOF
POST_COMMIT_QA_TRIGGER
commit_sha: $COMMIT_SHA
commit_message: $COMMIT_MSG
changed_files:
$CHANGED_FILES
diff_stat:
$DIFF_STAT

IMPORTANT: A commit just landed. Run the QA orchestrator now.
Read .claude/qa/orchestrator.md and follow its instructions to spawn the Researcher, Tester, and QA agents in parallel. Report the aggregated results to the user.
EOF
