import app from "./app.js";
import { connectCache, disconnectCache } from "./config/cache.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { loadDockerSecrets } from "./config/secrets.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

let server;

const start = async () => {
  loadDockerSecrets();

  await connectDatabase();
  await connectCache();

  server = app.listen(port, () => {
    console.log(`inclusive-hire API listening on port ${port}`);
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down API`);

  if (server) {
    server.close(async () => {
      await disconnectCache();
      await disconnectDatabase();
      process.exit(0);
    });
    return;
  }

  await disconnectCache();
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  console.error("Failed to start inclusive-hire API", error);
  process.exit(1);
});
