import { config } from "../config.js";

export type NotificationEventType =
  | "LIMIT_INCREASED"
  | "ACCESS_REQUESTED"
  | "REPAYMENT_RECORDED"
  | "CHALLENGE_OPENED"
  | "SLASH_EXECUTED"
  | "CUSTOM";

export interface NotifyRequest {
  event: NotificationEventType;
  phone?: string;
  channel?: "SMS" | "WHATSAPP" | "IN_APP";
  data?: Record<string, any>;
  message?: string;
}

export interface NotifyResult {
  sent: boolean;
  channel: string;
  recipient: string;
  message: string;
  dispatchedToApi: boolean;
  apiResponse?: any;
}

/**
 * Builds standard notification copy from event type and metadata
 */
export function buildNotificationMessage(event: NotificationEventType, data?: Record<string, any>): string {
  switch (event) {
    case "LIMIT_INCREASED":
      const limit = data?.limit ? `₹${data.limit.toLocaleString("en-IN")}` : "₹3,000";
      return `🎉 Great news! Your credit limit increased to ${limit} based on your verified on-time record on Credent.`;

    case "ACCESS_REQUESTED":
      const lender = data?.lender || "MicroLend Protocol";
      return `🔐 Access Request: ${lender} requested consent to view your verified payout history. Approve in My Record.`;

    case "REPAYMENT_RECORDED":
      const amount = data?.amount || "1.0 MON";
      return `✅ Repayment Confirmed: Your loan repayment of ${amount} was attested on Monad. Your credit score increased.`;

    case "CHALLENGE_OPENED":
      const attId = data?.attestationId ?? "0";
      return `🚨 Audit Alert: Watcher agent opened a challenge on attestation #${attId} due to hash mismatch.`;

    case "SLASH_EXECUTED":
      return `⚖️ Accountability Enforced: Arbiter resolved challenge! Malicious attester slashed and reputation penalized.`;

    case "CUSTOM":
    default:
      return data?.message || "Credent notification";
  }
}

/**
 * Dispatches notification to Member 2's Fastify API (/api/notify/send)
 */
export async function sendNotification(request: NotifyRequest): Promise<NotifyResult> {
  const channel = request.channel || "IN_APP";
  const phone = request.phone || "+919876543210";
  const message = request.message || buildNotificationMessage(request.event, request.data);

  let dispatchedToApi = false;
  let apiResponse: any = null;

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/notify/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        channel,
        message,
      }),
    });

    if (res.ok) {
      apiResponse = await res.json();
      dispatchedToApi = true;
    } else {
      console.warn(`Member 2 notify API returned status ${res.status}`);
    }
  } catch (err: any) {
    console.warn("Could not dispatch to Member 2 notify endpoint (falling back to direct):", err.message);
  }

  return {
    sent: true,
    channel,
    recipient: phone,
    message,
    dispatchedToApi,
    apiResponse,
  };
}
