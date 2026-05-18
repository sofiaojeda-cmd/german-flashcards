/**
 * schemaVersion history:
 *   1 — initial release. Exports settings, progress, deckCards, reviewRecords.
 *       Card content is intentionally omitted (re-seeded from static JSON on load).
 */

import type { StoredSettings, StoredProgress } from "@/lib/db/schema";
import type { DeckCard, ReviewRecord } from "@/types";

export type BackupSchema = {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    settings: StoredSettings;
    progress: StoredProgress;
    deckCards: DeckCard[];
    reviewRecords: ReviewRecord[];
  };
};

export async function exportProgress(): Promise<void> {
  const db = (await import("@/lib/db/schema")).default;

  const [settings, progress, deckCards, reviewRecords] = await Promise.all([
    db.settings.get("user"),
    db.progress.get("user"),
    db.deckCards.toArray(),
    db.reviewRecords.toArray(),
  ]);

  if (!settings || !progress) {
    throw new Error("No user data found to export.");
  }

  const backup: BackupSchema = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: "0.1.0",
    data: { settings, progress, deckCards, reviewRecords },
  };

  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `german-flashcards-backup-${date}.json`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
