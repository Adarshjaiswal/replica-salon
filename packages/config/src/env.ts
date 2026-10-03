import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

export const appEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url(),
  API_ORIGIN: z.string().url(),
  REQUEST_ID_HEADER: z.string().default("x-request-id"),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_REVIEW_OTP_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  RAZORPAY_REVIEW_PHONE: z
    .string()
    .regex(/^\+91\d{10}$/)
    .default("+916386851855"),
  RAZORPAY_REVIEW_OTP: z
    .string()
    .regex(/^\d{6}$/)
    .default("123456"),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  SMS_PROVIDER_TEMPLATE_NAME: z.string().trim().min(1).default("Template1"),
  EMAIL_SMTP_URL: z.string().optional(),
  WHATSAPP_PROVIDER_TOKEN: z.string().optional(),
  MAPS_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

function findDotenvFile(startDirectory: string): string | null {
  let currentDirectory = startDirectory;

  while (true) {
    const candidate = join(currentDirectory, ".env");

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function parseDotenvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replaceAll("\\n", "\n");
  }

  return trimmed;
}

function loadDotenv(input: NodeJS.ProcessEnv): Record<string, string> {
  const shouldLoadDotenv =
    !input.DATABASE_URL ||
    !input.WEB_ORIGIN ||
    !input.API_ORIGIN ||
    !input.BETTER_AUTH_SECRET;

  if (!shouldLoadDotenv) {
    return {};
  }

  const dotenvFile = findDotenvFile(process.cwd());

  if (!dotenvFile) {
    return {};
  }

  const values: Record<string, string> = {};
  const lines = readFileSync(dotenvFile, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const assignment = trimmedLine.startsWith("export ")
      ? trimmedLine.slice("export ".length)
      : trimmedLine;
    const separatorIndex = assignment.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, separatorIndex).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    values[key] = parseDotenvValue(assignment.slice(separatorIndex + 1));
  }

  return values;
}

function definedProcessEnv(input: NodeJS.ProcessEnv): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

export function parseAppEnv(input: NodeJS.ProcessEnv): AppEnv {
  return appEnvSchema.parse({
    ...loadDotenv(input),
    ...definedProcessEnv(input),
  });
}
