import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  APP_MODE: z.enum(["demo", "provider"]).default("demo"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
  SLACK_WEBHOOK_URL: z.string().optional(),
  ENABLE_AI_SUMMARIES: z.string().optional().transform((v) => v === "true"),
  OPENAI_API_KEY: z.string().optional()
});

export const env = schema.parse(process.env);
