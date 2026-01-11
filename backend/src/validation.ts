import { z } from "zod";

const usernameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-zA-Z0-9_\-]+$/);

const roomSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-zA-Z0-9_\-]+$/);

const encryptedPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  nonce: z.string().min(1).optional(),
  algorithm: z.string().min(1).max(64),
});

const messagePayloadBaseSchema = z.object({
  text: z.string().min(1).max(1000).optional(),
  encrypted: encryptedPayloadSchema.optional(),
});

const messagePayloadSchema = messagePayloadBaseSchema.refine(
  (value) => Boolean(value.text) !== Boolean(value.encrypted),
  "Provide either plaintext or encrypted payload"
);

export const joinRoomSchema = z.object({
  username: usernameSchema,
  room: roomSchema,
});

export const sendMessageSchema = messagePayloadSchema;

export const privateMessageSchema = messagePayloadBaseSchema
  .extend({
    to: usernameSchema,
  })
  .refine(
    (value) => Boolean(value.text) !== Boolean(value.encrypted),
    "Provide either plaintext or encrypted payload"
  );

export const historySchema = z.object({
  room: roomSchema,
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(10),
});

export const privateHistorySchema = z.object({
  with: usernameSchema,
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(10),
});

export const typingSchema = z.object({
  room: roomSchema,
});

export const privateTypingSchema = z.object({
  to: usernameSchema,
});

export const keyExchangeSchema = z.object({
  to: usernameSchema,
  publicKey: z.string().min(16),
  algorithm: z.string().min(1).max(64),
});

export type MessagePayloadInput = z.infer<typeof messagePayloadSchema>;
