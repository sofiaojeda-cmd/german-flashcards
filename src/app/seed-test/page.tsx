"use client";

import * as React from "react";
import { seedCards, resetAllData } from "@/lib/db/seed";
import db from "@/lib/db/schema";
import { PixelButton, PixelCard } from "@/components/pixel";

type Stats = {
  cards: number;
  deckCards: number;
  reviewRecords: number;
  byCategory: Record<string, number>;
};

async function getStats(): Promise<Stats> {
  const [cards, deckCards, reviewRecords] = await Promise.all([
    db.cards.count(),
    db.deckCards.count(),
    db.reviewRecords.count(),
  ]);

  const allCards = await db.cards.toArray();
  const byCategory: Record<string, number> = {};
  for (const card of allCards) {
    for (const topic of card.topics) {
      byCategory[topic] = (byCategory[topic] ?? 0) + 1;
    }
  }

  return { cards, deckCards, reviewRecords, byCategory };
}

export default function SeedTestPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toISOString().slice(11, 19)}] ${msg}`, ...prev]);

  const refresh = async () => {
    const s = await getStats();
    setStats(s);
  };

  React.useEffect(() => { refresh(); }, []);

  const handleSeedAll = async () => {
    setBusy(true);
    try {
      addLog("Seeding all categories…");
      const { seeded } = await seedCards();
      addLog(`Done — ${seeded} new cards inserted`);
      await refresh();
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      addLog("Resetting all data…");
      await resetAllData();
      addLog("Reset complete");
      await refresh();
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSeedTopic = async (topic: string) => {
    setBusy(true);
    try {
      addLog(`Seeding topic: ${topic}…`);
      const { seeded } = await seedCards({ topics: [topic] });
      addLog(`Done — ${seeded} new cards for "${topic}"`);
      await refresh();
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        padding: "24px 32px",
        fontFamily: "var(--font-pixel)",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ color: "var(--accent-gold)", marginBottom: "8px" }}>Seed Test</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "18px", marginBottom: "24px" }}>
        Verify Dexie schema and seed loader — not linked from nav
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <PixelButton onClick={handleSeedAll} disabled={busy}>Seed All</PixelButton>
        <PixelButton variant="danger" onClick={handleReset} disabled={busy}>Reset DB</PixelButton>
        <PixelButton variant="secondary" onClick={refresh} disabled={busy}>Refresh Stats</PixelButton>
      </div>

      {/* Per-topic seed buttons */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "18px", marginBottom: "10px" }}>
          Seed single topic:
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["everyday","food","politics","astrology","animals","fitness","self-improvement","berlin"].map((t) => (
            <PixelButton key={t} size="sm" variant="secondary" disabled={busy} onClick={() => handleSeedTopic(t)}>
              {t}
            </PixelButton>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <PixelCard style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "12px", fontSize: "24px" }}>IndexedDB Stats</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <Stat label="Cards" value={stats.cards} />
            <Stat label="Deck entries" value={stats.deckCards} />
            <Stat label="Review records" value={stats.reviewRecords} />
          </div>
          <h3 style={{ fontSize: "20px", marginBottom: "8px", color: "var(--text-muted)" }}>By category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {Object.entries(stats.byCategory).sort().map(([cat, count]) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                <span style={{ color: "var(--text-primary)" }}>{cat}</span>
                <span style={{ color: "var(--text-primary)" }}>{count}</span>
              </div>
            ))}
          </div>
        </PixelCard>
      )}

      {/* Log */}
      <PixelCard shade="dark">
        <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>Log</h3>
        {log.length === 0 ? (
          <p style={{ fontSize: "18px", color: "var(--text-muted)", margin: 0 }}>No activity yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {log.map((entry, i) => (
              <p key={i} style={{ margin: 0, fontSize: "17px", fontFamily: "monospace", color: "var(--text-light)" }}>
                {entry}
              </p>
            ))}
          </div>
        )}
      </PixelCard>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <PixelCard shade="dark" shadowSize="sm">
      <p style={{ margin: 0, fontSize: "18px", color: "var(--text-muted)" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: "32px", color: "var(--accent-gold)" }}>{value}</p>
    </PixelCard>
  );
}
