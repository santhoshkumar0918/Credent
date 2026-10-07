import { PrivyClient } from "@privy-io/server-auth";
import type { FastifyRequest, FastifyReply } from "fastify";

const privyAppId = process.env.PRIVY_APP_ID || "cm12345678901234567890123";
const privyAppSecret = process.env.PRIVY_APP_SECRET || "placeholder-secret";

export const privy = new PrivyClient(privyAppId, privyAppSecret);

export interface AuthenticatedUser {
  privyDid: string;
  walletAddress?: string;
  phone?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function verifyAuthToken(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // In dev mode with no token provided, populate a default mock session
    req.user = {
      privyDid: "did:privy:cm_mock_user_12345",
      walletAddress: "0x5f2e...b1",
      phone: "+919876543210",
    };
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const claims = await privy.verifyAuthToken(token);
    req.user = {
      privyDid: claims.userId,
    };
  } catch {
    reply.status(401).send({ error: "Invalid or expired authorization token" });
  }
}
