---
name: research-lookup-protocol
description: How to look up official docs/APIs/library references and report findings without guessing. Use for every research-agent invocation.
---

## Source order

1. The project's own docs first (`prd/`, `ARCHITECTURE.md`, `SPEC.md`).
2. Official upstream docs (Monad, Chainlink CRE, Envio, Foundry book,
   viem/wagmi, Next.js) — preferred over everything below.
3. Package registries / source (crates.io, npm, docs.rs, GitHub source).
4. Community sources last (blogs, forums, Stack Overflow) — and always
   labeled as such.

## Report format

- What the source says (with URL + version).
- Minimal applicable snippet.
- What remains uncertain or version-dependent.
- Whether it conflicts with SPEC.md / ARCHITECTURE.md, if relevant.

## Rules

- Findings only — no project code changes, ever.
- Never present an unofficial source as authoritative without saying so.
- "Not found in official sources" is a valid, complete finding —
  better than a synthesized answer.
