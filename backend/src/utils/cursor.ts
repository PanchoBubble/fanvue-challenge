/**
 * Cursor-based pagination utilities.
 *
 * Cursor format: base64-encoded ISO timestamp string.
 * Using createdAt as cursor since it's indexed with threadId
 * and provides stable ordering even under concurrent inserts.
 */

export function encodeCursor(createdAt: Date): string {
  return Buffer.from(createdAt.toISOString()).toString("base64url");
}

export function decodeCursor(cursor: string): Date {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
  const date = new Date(decoded);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid cursor");
  }
  return date;
}
