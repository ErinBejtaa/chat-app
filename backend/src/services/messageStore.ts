import { env } from "../config/env.js";
import { redis } from "../redis/client.js";
import type { ChatMessage, DirectMessage } from "../types.js";
import { roomListKey, parseList, directListKey } from "../utils/helper.js";

export const storeRoomMessage = async (message: ChatMessage) => {
  const key = roomListKey(message.room);
  const serialized = JSON.stringify(message);
  await redis.lPush(key, serialized);
  await redis.lTrim(key, 0, env.MESSAGE_HISTORY_MAX - 1);
};

export const getRecentRoomMessages = async (room: string, limit: number) => {
  const items = await redis.lRange(roomListKey(room), 0, limit - 1);
  return parseList<ChatMessage>(items);
};

export const getRoomHistory = async (
  room: string,
  offset: number,
  limit: number
) => {
  const items = await redis.lRange(
    roomListKey(room),
    offset,
    offset + limit - 1
  );
  return parseList<ChatMessage>(items);
};

export const storeDirectMessage = async (message: DirectMessage) => {
  const key = directListKey(message.from, message.to);
  const serialized = JSON.stringify(message);
  await redis.lPush(key, serialized);
  await redis.lTrim(key, 0, env.MESSAGE_HISTORY_MAX - 1);
};

export const getDirectHistory = async (
  userA: string,
  userB: string,
  offset: number,
  limit: number
) => {
  const key = directListKey(userA, userB);
  const items = await redis.lRange(key, offset, offset + limit - 1);
  return parseList<DirectMessage>(items);
};
