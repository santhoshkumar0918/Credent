import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuthToken } from "../middleware/auth";
import { memoryStore } from "../db";

const RoleSchema = z.object({
  role: z.enum(["SUBJECT", "ATTESTER", "LENDER", "WATCHER"]),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Verify auth session & upsert profile
  fastify.post("/api/auth/verify", { preHandler: [verifyAuthToken] }, async (req, reply) => {
    const user = req.user!;
    let profile = memoryStore.users.get(user.privyDid);
    if (!profile) {
      profile = {
        id: crypto.randomUUID(),
        privyDid: user.privyDid,
        walletAddress: user.walletAddress || null,
        phone: user.phone || null,
        createdAt: new Date().toISOString(),
      };
      memoryStore.users.set(user.privyDid, profile);
      memoryStore.roles.set(profile.id, ["SUBJECT"]);
    }
    return { status: "authenticated", user: profile };
  });

  // Get current user profile & active roles
  fastify.get("/api/users/me", { preHandler: [verifyAuthToken] }, async (req, reply) => {
    const user = req.user!;
    const profile = memoryStore.users.get(user.privyDid) || {
      id: "mock_user_id",
      privyDid: user.privyDid,
      walletAddress: user.walletAddress || "0x5f2e...b1",
      phone: user.phone || "+919876543210",
    };
    const userRoles = memoryStore.roles.get(profile.id) || ["SUBJECT", "ATTESTER", "LENDER", "WATCHER"];

    return {
      profile,
      roles: userRoles,
    };
  });

  // Add / switch active role
  fastify.post("/api/users/roles", { preHandler: [verifyAuthToken] }, async (req, reply) => {
    const body = RoleSchema.parse(req.body);
    const user = req.user!;
    const profile = memoryStore.users.get(user.privyDid) || { id: "mock_user_id" };
    const currentRoles = memoryStore.roles.get(profile.id) || ["SUBJECT"];

    if (!currentRoles.includes(body.role)) {
      currentRoles.push(body.role);
      memoryStore.roles.set(profile.id, currentRoles);
    }

    return { status: "success", activeRole: body.role, roles: currentRoles };
  });
}
