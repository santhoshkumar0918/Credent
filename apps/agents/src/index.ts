import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { config } from "./config.js";
import { collectorRoutes } from "./routes/collector.js";
import { verifierRoutes } from "./routes/verifier.js";
import { scoreRoutes } from "./routes/score.js";
import { watcherRoutes } from "./routes/watcher.js";
import { notifyRoutes } from "./routes/notify.js";
import { anomalyRoutes } from "./routes/anomaly.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Register all Member 3 agent routes
  app.register(healthRoutes);
  app.register(collectorRoutes);
  app.register(verifierRoutes);
  app.register(scoreRoutes);
  app.register(watcherRoutes);
  app.register(notifyRoutes);
  app.register(anomalyRoutes);

  return app;
}

export async function start() {
  const app = buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🤖 Vouchain Agents Server live on http://${config.host}:${config.port}`);
    console.log(`📡 Monad Testnet RPC: ${config.rpcUrl} (Chain ID: ${config.chainId})`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start if executed directly
if (import.meta.main) {
  start();
}
