import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    APP_MODE: z.enum(["demo", "provider"]).default("demo"),
    API_BASE_URL: z.string().url().default("http://localhost:4000"),
    WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
    SLACK_WEBHOOK_URL: z.string().optional(),
    ENABLE_AI_SUMMARIES: z.string().optional().transform((v) => v === "true"),
    OPENAI_API_KEY: z.string().optional(),
    AUTH0_DOMAIN: z.string().min(1),
    AUTH0_AUDIENCE: z.string().min(1),
    AUTH0_CLIENT_ID: z.string().min(1),
    AUTH0_CLIENT_SECRET: z.string().min(1),
    AUTH0_ORG_CLAIM: z.string().default("org_id"),
    AUTH_BYPASS_DEMO: z.string().optional().transform((v) => v === "true"),
    STEP_UP_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(900),
    TOKEN_VAULT_BASE_URL: z.string().url().optional(),
    TOKEN_VAULT_API_KEY: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.APP_MODE === "provider") {
      if (!value.TOKEN_VAULT_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["TOKEN_VAULT_BASE_URL"],
          message: "TOKEN_VAULT_BASE_URL is required when APP_MODE=provider."
        });
      }

      if (!value.TOKEN_VAULT_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["TOKEN_VAULT_API_KEY"],
          message: "TOKEN_VAULT_API_KEY is required when APP_MODE=provider."
        });
      }
    }
  });

export const env = schema.parse(process.env);
