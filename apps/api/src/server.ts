import { parseAppEnv } from "@replica/config";
import { createApp } from "./app.js";

const env = parseAppEnv(process.env);
const app = createApp(env);

const server = app.listen(env.PORT, () => {
  console.log(`Replica API listening on port ${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}; shutting down API.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
