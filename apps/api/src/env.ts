import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  SESSION_SECRET: z.string().min(8).optional(),
  FIRMS_API_KEY: z.string().optional(),
  FIRMS_BASE_URL: z.string().url().optional()
});

const parsed = envSchema.parse(process.env);

export const env = {
  nodeEnv: parsed.NODE_ENV ?? "development",
  port: Number(parsed.PORT ?? 8787),
  sessionSecret: parsed.SESSION_SECRET,
  allowedOrigins: parsed.ALLOWED_ORIGINS
    ? parsed.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : undefined,
  firmsApiKey: parsed.FIRMS_API_KEY,
  firmsBaseUrl: parsed.FIRMS_BASE_URL ?? "https://firms.modaps.eosdis.nasa.gov"
};

export const isProduction = env.nodeEnv === "production";
