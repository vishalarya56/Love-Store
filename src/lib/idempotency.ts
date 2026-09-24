import { db } from "@/lib/db";

/**
 * Idempotency helper using the idempotency_keys table.
 * Returns the cached response (with replay marker) if a matching key exists.
 */
export async function withIdempotency<T>(
  creatorId: string,
  key: string,
  operation: string,
  run: () => Promise<T>
): Promise<{ replay: boolean; result: T }> {
  const existing = await db.idempotencyKey.findUnique({
    where: {
      creatorId_key_operation: { creatorId, key, operation },
    },
  });
  if (existing) {
    return { replay: true, result: JSON.parse(existing.response) as T };
  }
  const result = await run();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.idempotencyKey.create({
    data: {
      creatorId,
      key,
      operation,
      response: JSON.stringify(result),
      expiresAt,
    },
  });
  return { replay: false, result };
}
