"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelInput } from "@/components/pixel";

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
    <rect x="4" y="2" width="2" height="2" fill="var(--text-muted)" />
    <rect x="6" y="2" width="2" height="2" fill="var(--text-muted)" />
    <rect x="8" y="2" width="2" height="2" fill="var(--text-muted)" />
    <rect x="2" y="4" width="2" height="2" fill="var(--text-muted)" />
    <rect x="10" y="4" width="2" height="2" fill="var(--text-muted)" />
    <rect x="2" y="6" width="2" height="2" fill="var(--text-muted)" />
    <rect x="10" y="6" width="2" height="2" fill="var(--text-muted)" />
    <rect x="4" y="8" width="2" height="2" fill="var(--text-muted)" />
    <rect x="6" y="8" width="2" height="2" fill="var(--text-muted)" />
    <rect x="8" y="8" width="2" height="2" fill="var(--text-muted)" />
    <rect x="10" y="10" width="2" height="2" fill="var(--text-muted)" />
    <rect x="12" y="12" width="2" height="2" fill="var(--text-muted)" />
  </svg>
);
import { formatInterval } from "@/lib/formatInterval";
import { markAsKnown, resetCardToLearning } from "@/lib/srs/sm2";
import type { VocabRow } from "@/lib/db/vocabulary";

// ── Constants ─────────────────────────────────────────────────────

type Tab = "all" | "learning" | "mastered" | "known";
const TABS: Tab[] = ["all", "learning", "mastered", "known"];
const MS_PER_DAY = 86_400_000;

const ARTICLE_COLOR: Record<string, string> = {
  der: "var(--accent-blue)",
  die: "var(--accent-red)",
  das: "var(--accent-green)",
};

const STATUS_COLOR: Record<string, string> = {
  learning: "var(--accent-blue)",
  mastered: "var(--accent-green)",
  known: "var(--accent-gold)",
};

const STATUS_TEXT: Record<string, string> = {
  learning: "var(--text-light)",
  mastered: "var(--text-light)",
  known: "var(--text-primary)",
};

// ── Helpers ───────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatLastReviewed(ts?: number): string {
  if (!ts) return "Never";
  const days = Math.round((Date.now() - ts) / MS_PER_DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function formatDueDate(dueDate: number): string {
  const days = (dueDate - Date.now()) / MS_PER_DAY;
  if (days <= 0) return "Due now";
  return formatInterval(days);
}

// ── Page ──────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<VocabRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rawSearch, setRawSearch] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<Tab>("all");
  const [activeTopic, setActiveTopic] = React.useState("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // 150ms search debounce
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 150);
    return () => clearTimeout(t);
  }, [rawSearch]);

  React.useEffect(() => {
    async function load() {
      const { getVocabularyList } = await import("@/lib/db/vocabulary");
      setRows(await getVocabularyList());
      setLoading(false);
    }
    load();
  }, []);

  const counts = React.useMemo(() => {
    const c = { learning: 0, mastered: 0, known: 0 };
    for (const { record } of rows) {
      const s = record.status as keyof typeof c;
      if (s in c) c[s]++;
    }
    return c;
  }, [rows]);

  const topics = React.useMemo(() => {
    const seen = new Set<string>();
    for (const { card } of rows) {
      for (const t of card.topics) seen.add(t);
    }
    return Array.from(seen).sort();
  }, [rows]);

  const filtered = React.useMemo(() => {
    let result = rows;
    if (activeTab !== "all") result = result.filter((r) => r.record.status === activeTab);
    if (activeTopic !== "all") result = result.filter((r) => r.card.topics.includes(activeTopic));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.card.front.toLowerCase().includes(q) ||
          r.card.back.toLowerCase().includes(q) ||
          (r.card.exampleSentence?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [rows, activeTab, activeTopic, search]);

  const collected = counts.learning + counts.mastered + counts.known;

  const handleAction = React.useCallback(
    async (cardId: string, action: "known" | "learning") => {
      const now = Date.now();
      if (action === "known") {
        await markAsKnown(cardId, now);
        setRows((prev) =>
          prev.map((r) =>
            r.card.id === cardId
              ? {
                  ...r,
                  record: {
                    ...r.record,
                    status: "known" as const,
                    interval: 365,
                    repetitions: 99,
                    dueDate: now + 365 * MS_PER_DAY,
                    lastReviewed: now,
                  },
                }
              : r
          )
        );
      } else {
        await resetCardToLearning(cardId, now);
        setRows((prev) =>
          prev.map((r) =>
            r.card.id === cardId
              ? {
                  ...r,
                  record: {
                    ...r.record,
                    status: "learning" as const,
                    interval: 0,
                    repetitions: 0,
                    dueDate: now,
                    lastReviewed: now,
                  },
                }
              : r
          )
        );
      }
      setExpandedId(null);
    },
    []
  );

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setExpandedId(null);
  }

  function switchTopic(topic: string) {
    setActiveTopic(topic);
    setExpandedId(null);
  }

  function clearFilters() {
    setRawSearch("");
    setSearch("");
    setActiveTab("all");
    setActiveTopic("all");
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--bg-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-pixel)",
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: "24px" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        padding: "40px 24px 48px",
        fontFamily: "var(--font-pixel)",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* ── Header ── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "4px",
            }}
          >
            <BackArrow onClick={() => router.push("/dashboard")} />
            <h1
              style={{ margin: 0, fontSize: "32px", color: "var(--text-light)", lineHeight: 1 }}
            >
              Your vocabulary
            </h1>
          </div>
          <p style={{ margin: "4px 0 0 44px", fontSize: "18px", color: "var(--text-muted)" }}>
            {collected} words in your collection
          </p>
        </div>

        {/* ── Search ── */}
        <PixelInput
          placeholder="Search German or English…"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          leftIcon={SearchIcon}
        />

        {/* ── Status tabs ── */}
        <div style={{ display: "flex", gap: "8px" }}>
          {TABS.map((tab) => {
            const label =
              tab === "all"
                ? `All (${collected})`
                : tab === "learning"
                ? `Learning (${counts.learning})`
                : tab === "mastered"
                ? `Mastered (${counts.mastered})`
                : `Known (${counts.known})`;
            return (
              <PixelButton
                key={tab}
                variant="secondary"
                size="sm"
                selected={activeTab === tab}
                onClick={() => switchTab(tab)}
                style={{ flex: 1, textAlign: "center" }}
              >
                {label}
              </PixelButton>
            );
          })}
        </div>

        {/* ── Topic chips ── */}
        {topics.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {["all", ...topics].map((topic) => (
              <PixelButton
                key={topic}
                size="sm"
                variant="secondary"
                selected={activeTopic === topic}
                onClick={() => switchTopic(topic)}
                style={{ gap: "6px" }}
              >
                {topic !== "all" && (
                  <img
                    src={`/sprites/category-${topic}.png`}
                    width={16}
                    height={16}
                    alt=""
                    style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
                  />
                )}
                {topic === "all" ? "All topics" : capitalize(topic)}
              </PixelButton>
            ))}
          </div>
        )}

        {/* ── Card list / empty states ── */}
        {collected === 0 ? (
          <EmptyCollection onStart={() => router.push("/review")} />
        ) : filtered.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((row) => (
              <CardRow
                key={row.card.id}
                row={row}
                expanded={expandedId === row.card.id}
                onToggle={() =>
                  setExpandedId(expandedId === row.card.id ? null : row.card.id)
                }
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Back arrow ────────────────────────────────────────────────────

function BackArrow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      aria-label="Back to dashboard"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "4px",
        cursor: "pointer",
        color: hovered ? "var(--text-light)" : "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <rect x="10" y="2" width="2" height="2" />
        <rect x="8" y="4" width="2" height="2" />
        <rect x="6" y="6" width="2" height="2" />
        <rect x="4" y="7" width="2" height="2" />
        <rect x="6" y="9" width="2" height="2" />
        <rect x="8" y="11" width="2" height="2" />
        <rect x="10" y="13" width="2" height="2" />
      </svg>
    </button>
  );
}

// ── Card row ──────────────────────────────────────────────────────

type CardRowProps = {
  row: VocabRow;
  expanded: boolean;
  onToggle: () => void;
  onAction: (cardId: string, action: "known" | "learning") => Promise<void>;
};

function CardRow({ row, expanded, onToggle, onAction }: CardRowProps) {
  const { card, record } = row;
  const [hovered, setHovered] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const spaceIdx = card.front.indexOf(" ");
  const article = card.gender && spaceIdx !== -1 ? card.front.slice(0, spaceIdx) : null;
  const rest = article ? card.front.slice(spaceIdx) : null;
  const topicSprite = card.topics[0] ? `category-${card.topics[0]}` : null;

  async function doAction(action: "known" | "learning") {
    setBusy(true);
    try {
      await onAction(card.id, action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "3px solid var(--border-dark)",
        boxShadow: expanded ? "2px 2px 0 var(--shadow)" : "4px 4px 0 var(--shadow)",
      }}
    >
      {/* Collapsed header — clickable toggle */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          background: hovered && !expanded ? "rgba(139, 90, 60, 0.08)" : "transparent",
          border: "none",
          padding: "12px 16px",
          cursor: "pointer",
          fontFamily: "var(--font-pixel)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textAlign: "left",
        }}
      >
        {/* Left: topic icon + German word + English translation */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            {topicSprite && (
              <img
                src={`/sprites/${topicSprite}.png`}
                width={16}
                height={16}
                alt=""
                style={{
                  imageRendering: "pixelated",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: "22px", lineHeight: 1.2 }}>
              {article ? (
                <>
                  <span style={{ color: ARTICLE_COLOR[card.gender!] }}>{article}</span>
                  <span style={{ color: "var(--text-primary)" }}>{rest}</span>
                </>
              ) : (
                <span style={{ color: "var(--text-primary)" }}>{card.front}</span>
              )}
            </span>
          </div>
          <span
            style={{
              fontSize: "17px",
              color: "var(--text-muted)",
              paddingLeft: topicSprite ? "24px" : "0",
              display: "block",
            }}
          >
            {card.back}
          </span>
        </div>

        {/* Right: status badge — fixed width so all three labels align vertically */}
        <span
          style={{
            backgroundColor: STATUS_COLOR[record.status] ?? "var(--bg-panel-dark)",
            color: STATUS_TEXT[record.status] ?? "var(--text-light)",
            padding: "2px 8px",
            fontSize: "14px",
            border: "2px solid var(--border-dark)",
            flexShrink: 0,
            textTransform: "capitalize",
            minWidth: "88px",
            textAlign: "center",
          }}
        >
          {record.status}
        </span>
      </button>

      {/* Expanded detail section */}
      {expanded && (
        <div
          style={{
            borderTop: "2px solid var(--border-mid)",
            padding: "12px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {card.exampleSentence ? (
            <div>
              <p style={{ fontSize: "18px", color: "var(--text-primary)", margin: "0 0 4px" }}>
                {card.exampleSentence}
              </p>
              {card.exampleTranslation && (
                <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0 }}>
                  {card.exampleTranslation}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0 }}>
              No example sentence.
            </p>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              fontSize: "16px",
              color: "var(--text-muted)",
            }}
          >
            <span>Last reviewed: {formatLastReviewed(record.lastReviewed)}</span>
            <span>Next review: {formatDueDate(record.dueDate)}</span>
          </div>

          <div>
            {record.status !== "known" ? (
              <PixelButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => doAction("known")}
              >
                Move to Known
              </PixelButton>
            ) : (
              <PixelButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => doAction("learning")}
              >
                Move back to Learning
              </PixelButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────

function EmptyCollection({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "3px solid var(--border-dark)",
        boxShadow: "4px 4px 0 var(--shadow)",
        padding: "40px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>
        Your collection is empty. Start a review to add words!
      </p>
      <PixelButton onClick={onStart}>Start a review</PixelButton>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "3px solid var(--border-dark)",
        boxShadow: "4px 4px 0 var(--shadow)",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: "0 0 12px" }}>
        No cards match these filters.
      </p>
      <button
        onClick={onClear}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-pixel)",
          textDecoration: "underline",
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
