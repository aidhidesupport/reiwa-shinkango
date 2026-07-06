import { readFile, writeFile } from "node:fs/promises";

const source = await readFile("prisma/schema.prisma", "utf8");
const postgresSchema = source
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('url      = env("DATABASE_URL")', 'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
await writeFile("prisma/schema.postgres.prisma", postgresSchema);
