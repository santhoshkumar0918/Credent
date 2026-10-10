// Single import point for generated contract ABIs (see ./abis/*.ts).
// Regenerate via `bun run abis` — never hand-edit the generated files.
// NOTE: extensionless imports (not .js) — the barrel is hand-written and
// must resolve under Turbopack, tsc/bundler, and Bun alike.
export { attesterRegistryAbi } from "./abis/AttesterRegistry";
export { attestationRegistryAbi } from "./abis/AttestationRegistry";
export { consentRegistryAbi } from "./abis/ConsentRegistry";
export { challengeModuleAbi } from "./abis/ChallengeModule";
export { mockLendingPoolAbi } from "./abis/MockLendingPool";
