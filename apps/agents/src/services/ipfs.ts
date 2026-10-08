import { keccak256, toHex, type Hex } from "viem";
import { config } from "../config.js";

export interface EvidenceReceipt {
  kind: "receipt" | "contract" | "screenshot";
  workerId: string;
  eventType: string;
  amount: string;
  currency: string;
  outcome: string;
  proofTier: number;
  timestamp: number;
  platformAttester: string;
  pinnedAt: number;
}

export interface PinnedResult {
  cid: string;
  evidenceHash: Hex;
  pinnedToPinata: boolean;
}

export async function pinEvidenceReceipt(receipt: EvidenceReceipt): Promise<PinnedResult> {
  const contentStr = JSON.stringify(receipt);
  const localHash = keccak256(toHex(contentStr));

  if (config.pinataJwt) {
    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.pinataJwt}`,
        },
        body: JSON.stringify({
          pinataContent: receipt,
          pinataMetadata: {
            name: `vouchain-receipt-${receipt.workerId}-${receipt.timestamp}`,
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { IpfsHash: string };
        return {
          cid: data.IpfsHash,
          evidenceHash: localHash,
          pinnedToPinata: true,
        };
      } else {
        console.warn("Pinata API returned error status:", res.status);
      }
    } catch (err) {
      console.warn("Pinata API call failed, using deterministic CID fallback:", err);
    }
  }

  // Deterministic mock CID format (matches standard IPFS v1 base58/base32 pattern)
  const mockCid = `bafkrei${localHash.slice(2, 34)}`;
  return {
    cid: mockCid,
    evidenceHash: localHash,
    pinnedToPinata: false,
  };
}
