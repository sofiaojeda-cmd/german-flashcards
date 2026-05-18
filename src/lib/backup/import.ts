/**
 * schemaVersion history:
 *   1 — initial release. See export.ts for full schema definition.
 */

import type { BackupSchema } from "./export";

export type ImportValidationError =
  | "invalid-json"
  | "incompatible-version"
  | "missing-fields";

export type ImportValidationResult =
  | { ok: true; backup: BackupSchema }
  | { ok: false; error: ImportValidationError };

export function validateBackup(raw: string): ImportValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid-json" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "invalid-json" };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.schemaVersion !== 1) {
    return { ok: false, error: "incompatible-version" };
  }

  const data = obj.data as Record<string, unknown> | undefined;
  if (
    !data ||
    typeof data.settings !== "object" || data.settings === null ||
    typeof data.progress !== "object" || data.progress === null ||
    !Array.isArray(data.deckCards) ||
    !Array.isArray(data.reviewRecords)
  ) {
    return { ok: false, error: "missing-fields" };
  }

  return { ok: true, backup: obj as unknown as BackupSchema };
}

export async function restoreBackup(backup: BackupSchema): Promise<void> {
  const db = (await import("@/lib/db/schema")).default;

  await db.transaction("rw", db.settings, db.progress, db.deckCards, db.reviewRecords, async () => {
    await Promise.all([
      db.settings.clear(),
      db.progress.clear(),
      db.deckCards.clear(),
      db.reviewRecords.clear(),
    ]);

    await Promise.all([
      db.settings.put(backup.data.settings),
      db.progress.put(backup.data.progress),
      db.deckCards.bulkPut(backup.data.deckCards),
      db.reviewRecords.bulkPut(backup.data.reviewRecords),
    ]);
  });
}
