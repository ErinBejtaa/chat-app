import "dotenv/config";
import http from "node:http";
import express, { Request, Response } from "express";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { connectRedis, redis, redisSub } from "./redis/client.js";
import { PubSubService } from "./services/pubsub.js";
import { registerSocketHandlers } from "./sockets/handlers.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

await connectRedis();

const pubsub = new PubSubService(io, redis, redisSub);
registerSocketHandlers(io, pubsub);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

server.listen(env.PORT, () => {
  console.log(`Chat server listening on port ${env.PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  io.close();
  server.close();
  await Promise.allSettled([redis.quit(), redisSub.quit()]);
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
