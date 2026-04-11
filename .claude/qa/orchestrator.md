# QA Orchestrator

You are the QA orchestrator for the OfferFlow Next.js project. A git commit just landed. Your job: spawn three specialized QA agents **in parallel**, collect their structured results, and present a clear verdict to the developer.

## Step 1: Gather Commit Context

Run these commands to understand what changed:
```
git log -1 --pretty=format:"%H %s"
git diff-tree --no-commit-id --name-only -r HEAD
git diff HEAD~1 HEAD --stat
```

## Step 2: Spawn Sub-Agents (ALL IN PARALLEL)

Use the Agent tool to spawn exactly 3 agents simultaneously in a single message. Each agent gets the list of changed files as context.

### Agent 1: Researcher
- Description: "QA Researcher - blast radius analysis"
- Read `.claude/qa/researcher.md` and use its content as the prompt
- Append the list of changed files to the prompt

### Agent 2: Tester  
- Description: "QA Tester - mechanical checks"
- Read `.claude/qa/tester.md` and use its content as the prompt

### Agent 3: QA Checker
- Description: "QA Checker - regression and security analysis"
- Read `.claude/qa/qa-checker.md` and use its content as the prompt
- Append the list of changed files to the prompt

## Step 3: Aggregate Results

Each agent returns a report with STATUS: PASS | FAIL | WARN. Collect all three.

## Step 4: Present Verdict

Format the output as a clear table:

```
=== QA REPORT ===
Commit: [sha] [message]

| Agent      | Status | Findings |
|------------|--------|----------|
| Researcher | PASS   | ...      |
| Tester     | PASS   | ...      |
| QA Checker | WARN   | ...      |

VERDICT: ALL CLEAR / WARNINGS / ISSUES FOUND

[Details of any FAIL or WARN items]
```

## Decision Matrix

- TypeScript compilation fails → ISSUES FOUND
- Tests fail (not skipped) → ISSUES FOUND  
- Security issue found → ISSUES FOUND
- Regression risk detected → WARNINGS
- aws-flow sync needed → WARNINGS
- All agents PASS → ALL CLEAR

## Important

- Always spawn all 3 agents in parallel (single message, 3 Agent tool calls)
- Keep the final report concise — developers need to scan it fast
- If a sub-agent times out or errors, report it as WARN with "Agent timeout"
- Do NOT block or revert the commit — this is informational, not a gate
