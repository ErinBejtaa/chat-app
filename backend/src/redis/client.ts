import { createClient } from "redis";
import { env } from "../config/env.js";

export const redis = createClient({ url: env.REDIS_URL });
export const redisSub = redis.duplicate();

redis.on("error", (err) => {
  console.error("Redis error", err);
});

redisSub.on("error", (err) => {
  console.error("Redis subscriber error", err);
});

export const connectRedis = async () => {
  await redis.connect();
  await redisSub.connect();
};
