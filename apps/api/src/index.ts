import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { lenderRoutes } from "./routes/lenders";
import { consentRoutes } from "./routes/consent";
import { relayerRoutes } from "./routes/relayer";
import { subjectsRoutes } from "./routes/subjects";
import { attesterRoutes } from "./routes/attesters";
import { poolRoutes } from "./routes/pool";
import { notifyRoutes } from "./routes/notify";
import { demoRoutes } from "./routes/demo";

const app = Fastify({
  logger: true,
});

async function start() {
  // Security & Middleware Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Health Check
  app.get("/health", async () => {
    return { status: "ok", service: "Vouchain API", timestamp: new Date().toISOString() };
  });

  // Register API Routes
  await app.register(authRoutes);
  await app.register(lenderRoutes);
  await app.register(consentRoutes);
  await app.register(relayerRoutes);
  await app.register(subjectsRoutes);
  await app.register(attesterRoutes);
  await app.register(poolRoutes);
  await app.register(notifyRoutes);
  await app.register(demoRoutes);

  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`🚀 Vouchain API server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
