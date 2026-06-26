import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { Server as IoServer } from "socket.io";
import { apiRouter } from "./routes.js";
import { exportRouter } from "./export.js";
import { registerSocketHandlers } from "./sockets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);
app.use("/api", exportRouter);

const clientDist = resolve(__dirname, "../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io|health).*/, (_req, res) => {
    res.sendFile(resolve(clientDist, "index.html"));
  });
}

const httpServer = createServer(app);
const io = new IoServer(httpServer, {
  cors: { origin: true, credentials: true },
});

registerSocketHandlers(io);

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => {
  console.log(`[retro-board] listening on http://localhost:${port}`);
});
