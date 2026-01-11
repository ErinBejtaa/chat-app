import type { Server, Socket } from "socket.io";
import { env } from "../config/env.js";
import type {
  EncryptedPayload,
  ChatMessage,
  DirectMessage,
  TypingEvent,
  PrivateTypingEvent,
  KeyExchangeEvent,
} from "../types.js";
import {
  historySchema,
  joinRoomSchema,
  keyExchangeSchema,
  privateHistorySchema,
  privateMessageSchema,
  privateTypingSchema,
  sendMessageSchema,
  typingSchema,
} from "../validation.js";
import {
  getDirectHistory,
  getRecentRoomMessages,
  getRoomHistory,
  storeDirectMessage,
  storeRoomMessage,
} from "../services/messageStore.js";
import { PubSubService } from "../services/pubsub.js";
import { v4 as uuidv4 } from "uuid";

type SocketAck = (
  response: { ok: boolean; error?: string } & Record<string, unknown>
) => void;

const toMessageBody = (payload: {
  text?: string;
  encrypted?: EncryptedPayload;
}) => ({
  text: payload.text ?? null,
  encrypted: payload.encrypted ?? null,
});

const requireIdentity = (socket: Socket, callback?: SocketAck) => {
  const user = socket.data.user as string | undefined;
  if (!user) {
    callback?.({ ok: false, error: "Identify with a username first" });
    return null;
  }
  return user;
};

export const registerSocketHandlers = (io: Server, pubsub: PubSubService) => {
  io.on("connection", (socket) => {
    socket.on("join_room", async (payload, callback?: SocketAck) => {
      const parsed = joinRoomSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid username or room" });
        return;
      }

      const { username, room } = parsed.data;
      const previousRoom = socket.data.room as string | undefined;
      const previousUser = socket.data.user as string | undefined;

      if (previousUser && previousUser !== username) {
        socket.leave(previousUser);
        await pubsub.releaseUser(previousUser);
      }

      if (previousRoom && previousRoom !== room) {
        socket.leave(previousRoom);
        await pubsub.releaseRoom(previousRoom);
      }

      socket.data.user = username;
      socket.data.room = room;

      socket.join(username);
      await pubsub.ensureUser(username);

      socket.join(room);
      await pubsub.ensureRoom(room);

      const recent = await getRecentRoomMessages(
        room,
        env.MESSAGE_HISTORY_LIMIT
      );
      socket.emit("room_history", { room, messages: recent });
      socket.to(room).emit("user_joined", { room, user: username });

      callback?.({ ok: true });
    });

    socket.on("send_message", async (payload, callback?: SocketAck) => {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid message" });
        return;
      }

      const room = socket.data.room as string | undefined;
      const user = socket.data.user as string | undefined;
      if (!room || !user) {
        callback?.({ ok: false, error: "Join a room first" });
        return;
      }

      const body = toMessageBody(parsed.data);
      const message: ChatMessage = {
        id: uuidv4(),
        room,
        user,
        ...body,
        ts: Date.now(),
      };

      await storeRoomMessage(message);
      await pubsub.publishRoomMessage(room, message);
      callback?.({ ok: true });
    });

    socket.on("typing_start", async (payload, callback?: SocketAck) => {
      const parsed = typingSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid typing payload" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      if (socket.data.room !== parsed.data.room) {
        callback?.({ ok: false, error: "Not in room" });
        return;
      }

      const event: TypingEvent = {
        room: parsed.data.room,
        user,
        isTyping: true,
        ts: Date.now(),
      };

      await pubsub.publishRoomTyping(parsed.data.room, event);
      callback?.({ ok: true });
    });

    socket.on("typing_stop", async (payload, callback?: SocketAck) => {
      const parsed = typingSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid typing payload" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      if (socket.data.room !== parsed.data.room) {
        callback?.({ ok: false, error: "Not in room" });
        return;
      }

      const event: TypingEvent = {
        room: parsed.data.room,
        user,
        isTyping: false,
        ts: Date.now(),
      };

      await pubsub.publishRoomTyping(parsed.data.room, event);
      callback?.({ ok: true });
    });

    socket.on("load_history", async (payload, callback?: SocketAck) => {
      const parsed = historySchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid history request" });
        return;
      }

      const { room, offset, limit } = parsed.data;
      if (socket.data.room !== room) {
        callback?.({ ok: false, error: "Not in room" });
        return;
      }

      const messages = await getRoomHistory(room, offset, limit);
      callback?.({ ok: true, room, messages, nextOffset: offset + limit });
    });

    socket.on("private_message", async (payload, callback?: SocketAck) => {
      const parsed = privateMessageSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid private message" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      const body = toMessageBody(parsed.data);
      const message: DirectMessage = {
        id: uuidv4(),
        from: user,
        to: parsed.data.to,
        ...body,
        ts: Date.now(),
      };

      await storeDirectMessage(message);
      await pubsub.publishUserEvent(parsed.data.to, {
        type: "private_message",
        payload: message,
      });
      await pubsub.publishUserEvent(user, {
        type: "private_message",
        payload: message,
      });

      callback?.({ ok: true });
    });

    socket.on("private_typing_start", async (payload, callback?: SocketAck) => {
      const parsed = privateTypingSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid typing payload" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      const event: PrivateTypingEvent = {
        from: user,
        to: parsed.data.to,
        isTyping: true,
        ts: Date.now(),
      };

      await pubsub.publishUserEvent(parsed.data.to, {
        type: "private_typing",
        payload: event,
      });
      callback?.({ ok: true });
    });

    socket.on("private_typing_stop", async (payload, callback?: SocketAck) => {
      const parsed = privateTypingSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid typing payload" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      const event: PrivateTypingEvent = {
        from: user,
        to: parsed.data.to,
        isTyping: false,
        ts: Date.now(),
      };

      await pubsub.publishUserEvent(parsed.data.to, {
        type: "private_typing",
        payload: event,
      });
      callback?.({ ok: true });
    });

    socket.on("key_exchange", async (payload, callback?: SocketAck) => {
      const parsed = keyExchangeSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid key exchange" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      const event: KeyExchangeEvent = {
        from: user,
        to: parsed.data.to,
        publicKey: parsed.data.publicKey,
        algorithm: parsed.data.algorithm,
        ts: Date.now(),
      };

      await pubsub.publishUserEvent(parsed.data.to, {
        type: "key_exchange",
        payload: event,
      });
      callback?.({ ok: true });
    });

    socket.on("load_private_history", async (payload, callback?: SocketAck) => {
      const parsed = privateHistorySchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ ok: false, error: "Invalid private history request" });
        return;
      }

      const user = requireIdentity(socket, callback);
      if (!user) return;

      const { with: peer, offset, limit } = parsed.data;
      const messages = await getDirectHistory(user, peer, offset, limit);
      callback?.({
        ok: true,
        with: peer,
        messages,
        nextOffset: offset + limit,
      });
    });

    socket.on("disconnect", async () => {
      const room = socket.data.room as string | undefined;
      const user = socket.data.user as string | undefined;
      if (room && user) {
        socket.to(room).emit("user_left", { room, user });
      }
      if (room) {
        await pubsub.releaseRoom(room);
      }
      if (user) {
        await pubsub.releaseUser(user);
      }
    });
  });
};
