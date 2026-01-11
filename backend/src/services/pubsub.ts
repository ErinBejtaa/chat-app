import { v4 as uuidv4 } from "uuid";
import type { Server } from "socket.io";
import type { RedisClientType } from "redis";
import type { TypingEvent, UserEvent, ChatMessage } from "../types.js";
import {
  parseJson,
  roomListKey,
  roomTypingChannel,
  userChannel,
} from "../utils/helper.js";

type AnyRedisClient = RedisClientType<any, any, any>;

export class PubSubService {
  private io: Server;
  private redis: AnyRedisClient;
  private redisSub: AnyRedisClient;
  private instanceId = uuidv4();

  constructor(io: Server, redis: AnyRedisClient, redisSub: AnyRedisClient) {
    this.io = io;
    this.redis = redis;
    this.redisSub = redisSub;
  }

  private roomCounterKey(room: string) {
    return `subcount:room:${room}`;
  }

  private userCounterKey(user: string) {
    return `subcount:user:${user}`;
  }

  private instanceField() {
    return `instance:${this.instanceId}`;
  }

  async ensureRoom(room: string) {
    const nextCount = await this.redis.hIncrBy(
      this.roomCounterKey(room),
      this.instanceField(),
      1
    );
    if (nextCount === 1) {
      await this.redisSub.subscribe(roomListKey(room), (payload) => {
        const message = parseJson<ChatMessage>(payload);
        if (!message) return;
        this.io.to(room).emit("message", message);
      });
      await this.redisSub.subscribe(roomTypingChannel(room), (payload) => {
        const event = parseJson<TypingEvent>(payload);
        if (!event) return;
        this.io.to(room).emit("typing", event);
      });
    }
  }

  async releaseRoom(room: string) {
    const nextCount = await this.redis.hIncrBy(
      this.roomCounterKey(room),
      this.instanceField(),
      -1
    );
    if (nextCount <= 0) {
      await this.redis.hDel(this.roomCounterKey(room), this.instanceField());
      await this.redisSub.unsubscribe(roomListKey(room));
      await this.redisSub.unsubscribe(roomTypingChannel(room));
    }
  }

  async ensureUser(username: string) {
    const nextCount = await this.redis.hIncrBy(
      this.userCounterKey(username),
      this.instanceField(),
      1
    );
    if (nextCount === 1) {
      await this.redisSub.subscribe(userChannel(username), (payload) => {
        const event = parseJson<UserEvent>(payload);
        if (!event) return;
        this.io.to(username).emit(event.type, event.payload);
      });
    }
  }

  async releaseUser(username: string) {
    const nextCount = await this.redis.hIncrBy(
      this.userCounterKey(username),
      this.instanceField(),
      -1
    );
    if (nextCount <= 0) {
      await this.redis.hDel(
        this.userCounterKey(username),
        this.instanceField()
      );
      await this.redisSub.unsubscribe(userChannel(username));
    }
  }

  publishRoomMessage(room: string, message: ChatMessage) {
    return this.redis.publish(roomListKey(room), JSON.stringify(message));
  }

  publishRoomTyping(room: string, event: TypingEvent) {
    return this.redis.publish(roomTypingChannel(room), JSON.stringify(event));
  }

  publishUserEvent(username: string, event: UserEvent) {
    return this.redis.publish(userChannel(username), JSON.stringify(event));
  }
}
