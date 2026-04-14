export function isPrismaErrorCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: unknown }).code === code;
}

export function getPrismaUniqueConstraintTarget(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    return [];
  }

  const meta = (error as { meta?: unknown }).meta;

  if (!meta || typeof meta !== 'object') {
    return [];
  }

  const target = (meta as { target?: unknown }).target;

  if (typeof target === 'string') {
    return [target];
  }

  if (Array.isArray(target)) {
    return target.filter((item): item is string => typeof item === 'string');
  }

  return [];
}
