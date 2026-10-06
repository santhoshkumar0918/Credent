---
name: git-commit-conventions
description: Commit sizing, message format, and staging discipline for this project. Use for every commit.
---

## When to commit

As soon as a small, complete change is done — not batched across a
session. Test: can you describe it in one sentence without "and"? If
yes, commit-sized. If you need "and," it's probably two commits.

## Message format

`<scope>: <what changed>` — scope is the owning subagent's name minus
`-agent` (e.g. `dsl-payoff: enforce CAP bound`, `contracts: add
maxPayout guard`, `frontend: wire payoff curve to simulation`).
Specific, never generic — reject "fix stuff," "wip," "updates." If the
"why" isn't obvious from the diff, add a short second line.

## Staging

Stage only relevant files — eyeball `git status` before staging;
never blanket-add without checking. Never stage `.env*` or key
material.

## Pushing

Do not push unless explicitly asked (AGENTS.md section 10). Commit
locally at natural granularity; push at checkpoints — end of session,
before switching machines, before demo rehearsal — and only on request.
