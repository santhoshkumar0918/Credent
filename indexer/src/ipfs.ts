// Slice 3 — IPFS evidence pinning (spec, not yet wired).
// Only the content hash ever reaches the chain (evidenceHash).

export type EvidenceKind = "receipt" | "contract" | "screenshot";

export interface EvidenceBlob {
  kind: EvidenceKind;
  attesterNote: string;
  /** sha256 of the original document. */
  fileHash: string;
  pinnedAt: number;
}

// TODO(slice-3): pinBlob(blob) via pinning service (Pinata / web3.storage);
// return content hash for attest().
export function evidencePlan(): string {
  return "pin off-chain, commit only the content hash on-chain";
}
