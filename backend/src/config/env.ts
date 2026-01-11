import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MESSAGE_HISTORY_LIMIT: z.coerce.number().int().positive().default(10),
  MESSAGE_HISTORY_MAX: z.coerce.number().int().positive().default(1000),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
