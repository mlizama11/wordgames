import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    ADMIN_API_KEY: z.string().min(32).optional(),
    DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().default("http://localhost:8081"),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") return;

    if (!values.ADMIN_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_API_KEY"],
        message: "ADMIN_API_KEY is required in production.",
      });
    }

    if (values.CORS_ORIGIN.includes("localhost")) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN must not target localhost in production.",
      });
    }
  });

export const config = envSchema.parse(process.env);
