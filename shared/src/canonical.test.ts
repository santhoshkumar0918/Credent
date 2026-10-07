// Canonical-encoding tests: the exact byte shapes both layers must agree
// on. If any of these change, contracts + indexer + frontend break together.
import { describe, expect, test } from "bun:test";
import { encodeAbiParameters, keccak256 } from "viem";
import { hashCommitment, pseudonymFor } from "./commitments.js";
import { outcomeToOnTime } from "./types.js";

describe("pseudonymFor", () => {
  test("matches abi.encode (padded), not abi.encodePacked", () => {
    const s = "0x1111111111111111111111111111111111111111" as const;
    const a = "0x2222222222222222222222222222222222222222" as const;
    expect(pseudonymFor(s, a)).toBe(
      keccak256(
        encodeAbiParameters([{ type: "address" }, { type: "address" }], [s, a])
      )
    );
  });
});

describe("hashCommitment", () => {
  test("field order matches AttestationRegistry commitmentHash", () => {
    const input = {
      subjectPseudonym: "0x53d0449a6734c5e0cb48d7ec1a8afdfd346cd5c4b96c2747aee023e5ad9c400" as const,
      eventType: "GIG_PAYOUT" as const,
      amount: 4250n,
      onTime: true,
      timestamp: 1760000000n,
      salt: "0x4e1f000000000000000000000000000000000000000000000000000000000000" as const,
    };
    const expected = keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "uint8" },
          { type: "uint256" },
          { type: "bool" },
          { type: "uint256" },
          { type: "bytes32" },
        ],
        [input.subjectPseudonym, 2, input.amount, input.onTime, input.timestamp, input.salt]
      )
    );
    expect(hashCommitment(input)).toBe(expected);
  });
});

describe("outcomeToOnTime", () => {
  test("only ON_TIME commits true", () => {
    expect(outcomeToOnTime("ON_TIME")).toBe(true);
    expect(outcomeToOnTime("LATE")).toBe(false);
    expect(outcomeToOnTime("MISSED")).toBe(false);
    expect(outcomeToOnTime("DEFAULTED")).toBe(false);
  });
});
