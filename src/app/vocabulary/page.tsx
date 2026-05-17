"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelInput, PixelFolderTab, PixelNotebookPage } from "@/components/pixel";

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

type BadgeStyle = { bg: string; border: string; color: string; boxShadow: string };

const STATUS_BADGE: Record<string, BadgeStyle> = {
  learning: {
    bg:        "var(--accent-blue)",
    border:    "2px solid #2a5c8a",
    color:     "var(--text-light)",
    boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.28), inset -1px -1px 0 rgba(0,0,0,0.18)",
  },
  mastered: {
    bg:        "var(--accent-green)",
    border:    "2px solid #3a6b1a",
    color:     "var(--text-light)",
    boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.28), inset -1px -1px 0 rgba(0,0,0,0.18)",
  },
  known: {
    bg:        "var(--accent-gold)",
    border:    "2px solid #a07810",
    color:     "var(--text-primary)",
    boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.28), inset -1px -1px 0 rgba(0,0,0,0.18)",
  },
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

        {/* ── Folder tabs + folder body + notebook ── */}
        <div style={{ position: "relative" }}>
          {/* Tab row — overlaps folder body's top border by 3px via negative margin */}
          {topics.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "2px",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none" as React.CSSProperties["msOverflowStyle"],
                position: "relative",
                zIndex: 1,
                marginBottom: "-3px",
              }}
            >
              <PixelFolderTab
                label="All topics"
                active={activeTopic === "all"}
                onClick={() => switchTopic("all")}
              />
              {topics.map((topic) => (
                <PixelFolderTab
                  key={topic}
                  label={capitalize(topic)}
                  active={activeTopic === topic}
                  onClick={() => switchTopic(topic)}
                />
              ))}
            </div>
          )}

          {/* Folder body — gold wrap around notebook page */}
          <div
            style={{
              backgroundColor: "var(--folder-tab-color)",
              border: "3px solid var(--border-dark)",
              padding: "6px 10px 10px",
              position: "relative",
              zIndex: 0,
              // Multi-tone depth: top+left lighter (highlight), bottom+right darker (shadow), drop shadow below
              boxShadow: [
                "4px 6px 0 rgba(26,15,8,0.50)",
                "inset 0 4px 0 rgba(255,255,255,0.15)",
                "inset 4px 0 0 rgba(255,255,255,0.10)",
                "inset 0 -3px 0 rgba(0,0,0,0.12)",
                "inset -3px 0 0 rgba(0,0,0,0.10)",
              ].join(", "),
            }}
          >
            <PixelNotebookPage>
              {collected === 0 ? (
                <EmptyCollection onStart={() => router.push("/review")} />
              ) : filtered.length === 0 ? (
                <NoResults onClear={clearFilters} />
              ) : (
                filtered.map((row) => (
                  <CardRow
                    key={row.card.id}
                    row={row}
                    expanded={expandedId === row.card.id}
                    onToggle={() =>
                      setExpandedId(expandedId === row.card.id ? null : row.card.id)
                    }
                    onAction={handleAction}
                  />
                ))
              )}
            </PixelNotebookPage>
          </div>
        </div>
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

  async function doAction(action: "known" | "learning") {
    setBusy(true);
    try {
      await onAction(card.id, action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Single notebook line — exactly line-height tall */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          height: "var(--notebook-line-height)",
          background: hovered && !expanded ? "rgba(0,0,0,0.04)" : "transparent",
          border: "none",
          padding: "0",
          cursor: "pointer",
          fontFamily: "var(--font-pixel)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textAlign: "left",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "20px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {article ? (
            <>
              <span style={{ color: ARTICLE_COLOR[card.gender!] }}>{article}</span>
              <span style={{ color: "var(--text-primary)" }}>{rest}</span>
            </>
          ) : (
            <span style={{ color: "var(--text-primary)" }}>{card.front}</span>
          )}
          <span style={{ color: "var(--text-muted)", fontSize: "17px" }}>
            {" · "}
            {card.back}
          </span>
        </span>

        <span
          style={{
            backgroundColor: STATUS_BADGE[record.status]?.bg ?? "var(--bg-panel-dark)",
            color:           STATUS_BADGE[record.status]?.color ?? "var(--text-light)",
            border:          STATUS_BADGE[record.status]?.border ?? "2px solid var(--border-dark)",
            boxShadow:       STATUS_BADGE[record.status]?.boxShadow,
            padding: "2px 8px",
            fontSize: "14px",
            flexShrink: 0,
            textTransform: "capitalize",
            minWidth: "88px",
            textAlign: "center",
          }}
        >
          {record.status}
        </span>
      </button>

      {/* Expanded detail — two columns: text left, ghost action button right */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--notebook-line-color)",
            borderBottom: "1px solid var(--notebook-line-color)",
            padding: "10px 0",
            display: "flex",
            gap: "8px",
            alignItems: "stretch",
          }}
        >
          {/* Left: example sentence + metadata */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "16px", color: "var(--text-muted)" }}>
              <span>Last reviewed: {formatLastReviewed(record.lastReviewed)}</span>
              <span>Next review: {formatDueDate(record.dueDate)}</span>
            </div>
          </div>

          {/* Right: ghost action button top-aligned, visually below the status badge above */}
          <div style={{ minWidth: "96px", display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
            <GhostActionButton busy={busy} status={record.status} onAction={doAction} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ghost action button (inside expanded row) ─────────────────────

function GhostActionButton({
  busy,
  status,
  onAction,
}: {
  busy: boolean;
  status: string;
  onAction: (action: "known" | "learning") => Promise<void>;
}) {
  const [hovered, setHovered] = React.useState(false);
  const isKnown = status === "known";
  return (
    <button
      disabled={busy}
      onClick={() => onAction(isKnown ? "learning" : "known")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: busy ? "not-allowed" : "pointer",
        fontFamily: "var(--font-pixel)",
        fontSize: "15px",
        color: busy ? "var(--text-muted)" : "var(--text-primary)",
        textDecoration: hovered && !busy ? "underline" : "none",
        opacity: busy ? 0.45 : 1,
        textAlign: "right",
        lineHeight: 1.3,
      }}
    >
      {isKnown ? "Move back to Learning" : "Move to Known"}
    </button>
  );
}

// ── Empty states ──────────────────────────────────────────────────

function EmptyCollection({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        padding: "32px 0",
        display: "flex",
        flexDirection: "column",
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
    <div style={{ padding: "32px 0" }}>
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
