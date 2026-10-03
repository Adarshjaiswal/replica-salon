import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDirectory = resolve(
  packageDirectory,
  "src/generated/client",
);
const outputDirectory = resolve(
  packageDirectory,
  "dist/generated/client",
);

if (!existsSync(sourceDirectory)) {
  throw new Error(`Prisma generated client not found at ${sourceDirectory}`);
}

rmSync(outputDirectory, { force: true, recursive: true });
cpSync(sourceDirectory, outputDirectory, { recursive: true });
