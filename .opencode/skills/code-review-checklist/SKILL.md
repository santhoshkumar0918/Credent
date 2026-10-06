---
name: code-review-checklist
description: What to check in a diff before approving it for commit — scope, tests, style, rule compliance. Use for every review pass in this project.
---

## The pass, in order

1. **Scope check.** One logical change? If it touches two unrelated
   concerns, flag for splitting before deep review.
2. **Non-negotiable rules check** (AGENTS.md section 2, every time):
   - No LLM output bypassing schema → DSL → risk validation.
   - No deploy path skipping the validator.
   - Bounded payoffs (TS analysis + onchain `maxPayout`).
   - Oracle-only settlement prices; PENDING on stale/unavailable feeds.
   - No secrets, keys, or credentials in the diff.
   - No new infra dependency without an ARCHITECTURE.md update.
   - Template discipline: no 5th family / new primitive hiding in the diff.
3. **Language-specific checks:**
   - Solidity: `forge build` warning-free, `forge test` green; no
     caller-supplied settlement prices; expiry sanity enforced.
   - TypeScript: no `any` on dsl/sim paths; Zod on input boundaries;
     `bun test` green for dsl/sim; `bun run build` clean for frontend.
4. **Test coverage.** At least one test added or updated per behavior
   changed. New behavior with no test change is not approvable.
5. **Commit-readiness.** Diff is small enough for one specific
   `<scope>: <what>` sentence per `git-commit-conventions`.

## Verdict format

State explicitly what was checked and each result — not "looks good":

```
Scope: single change (CAP bound enforcement) — OK
Rules: bounded payoff holds, validator invoked, no secrets — OK
Forge: build clean, 14 tests green
Tests: added unbounded-path rejection test — OK
Verdict: approved
```

or the same structure naming the specific failing item on rejection.
