import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineConfig, env } from "prisma/config";

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

function loadDatabaseUrlFromDotenv(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  const dotenvFile = findDotenvFile(process.cwd());

  if (!dotenvFile) {
    return;
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
      process.env.DATABASE_URL = parseDotenvValue(
        assignment.slice(separatorIndex + 1),
      );
      return;
    }
  }
}

loadDatabaseUrlFromDotenv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
