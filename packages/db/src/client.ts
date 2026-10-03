import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/client/index.js";

type MariaDbPoolConfig = Exclude<
  ConstructorParameters<typeof PrismaMariaDb>[0],
  string
>;

const globalForPrisma = globalThis as typeof globalThis & {
  replicaPrismaClient?: PrismaClient;
};

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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

function readDatabaseUrlFromDotenv(): string | undefined {
  const dotenvFile = findDotenvFile(process.cwd());

  if (!dotenvFile) {
    return undefined;
  }

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

    if (key === "DATABASE_URL") {
      return parseDotenvValue(assignment.slice(separatorIndex + 1));
    }
  }

  return undefined;
}

function parseDatabaseUrl(databaseUrl: string): {
  config: MariaDbPoolConfig;
  database: string;
} {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!url.hostname || !url.username || !database) {
    throw new Error(
      "DATABASE_URL must include host, username and database name.",
    );
  }

  return {
    database,
    config: {
      host: url.hostname,
      port: parsePositiveInteger(url.port, 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: parsePositiveInteger(
        url.searchParams.get("connection_limit"),
        5,
      ),
      connectTimeout: parsePositiveInteger(
        url.searchParams.get("connect_timeout"),
        2_000,
      ),
      acquireTimeout: parsePositiveInteger(
        url.searchParams.get("acquire_timeout"),
        2_000,
      ),
      socketTimeout: parsePositiveInteger(
        url.searchParams.get("socket_timeout"),
        5_000,
      ),
    },
  };
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromDotenv();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  const { config, database } = parseDatabaseUrl(databaseUrl);

  return new PrismaClient({
    adapter: new PrismaMariaDb(config, { database }),
  });
}

export const prisma =
  globalForPrisma.replicaPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.replicaPrismaClient = prisma;
}
