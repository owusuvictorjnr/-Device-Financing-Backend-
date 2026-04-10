import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma } from '@prisma/client';

function normalizeConnectionString(
  value: string | undefined,
): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue || trimmedValue === '""' || trimmedValue === "''") {
    return undefined;
  }

  const isQuotedValue =
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"));

  if (!isQuotedValue) {
    return trimmedValue;
  }

  const unquotedValue = trimmedValue.slice(1, -1).trim();
  return unquotedValue.length > 0 ? unquotedValue : undefined;
}

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const connectionString = normalizeConnectionString(process.env.DATABASE_URL);

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  return {
    adapter: new PrismaPg({ connectionString }),
  };
}