"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type TranscriptItem = {
    id: string;
    title: string | null;
    text: string;
    createdAt: string;
};

const PREVIEW_COUNT = 5;

export default function ActivityList({ items }: { items: TranscriptItem[] }) {
    const [transcripts, setTranscripts] = useState(items);

    // Sync local state when items prop changes (e.g. after router.refresh())
    useEffect(() => {
        setTranscripts(items);
    }, [items]);

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [menuId, setMenuId] = useState<string | null>(null);
    const [viewAll, setViewAll] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const displayed = viewAll ? transcripts : transcripts.slice(0, PREVIEW_COUNT);
    const hasMore = transcripts.length > PREVIEW_COUNT;

    const handleRename = async (id: string) => {
        if (!editValue.trim()) { setEditingId(null); return; }
        try {
            const res = await fetch(`/api/transcripts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: editValue.trim() }),
            });
            if (res.ok) {
                setTranscripts(prev => prev.map(t => t.id === id ? { ...t, title: editValue.trim() } : t));
            }
        } catch { /* silent */ }
        setEditingId(null);
        setMenuId(null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this transcript? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/transcripts/${id}`, { method: "DELETE" });
            if (res.ok) {
                setTranscripts(prev => prev.filter(t => t.id !== id));
                if (expandedId === id) setExpandedId(null);
                router.refresh();
            }
        } catch { /* silent */ }
        setMenuId(null);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        let relative: string;
        if (diffMin < 1) relative = "Just now";
        else if (diffMin < 60) relative = `${diffMin}m ago`;
        else if (diffHr < 24) relative = `${diffHr}h ago`;
        else if (diffDay < 7) relative = `${diffDay}d ago`;
        else relative = d.toLocaleDateString();

        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const date = d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

        return { relative, time, date };
    };

    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -340, behavior: "smooth" });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 340, behavior: "smooth" });

    const renderCard = (t: TranscriptItem, isHorizontal = false) => {
        const words = t.text.split(/\s+/).filter(Boolean).length;
        const dt = formatDate(t.createdAt);
        const displayTitle = t.title || "Audio Recording " + t.id.slice(0, 4).toUpperCase();
        const isExpanded = expandedId === t.id;
        const isMenuOpen = menuId === t.id;

        return (
            <div
                key={t.id}
                className={`t-card ${isExpanded ? "expanded" : ""} ${isHorizontal ? "t-card-horiz" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
            >
                <div className="t-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="t-card-content">
                    <div className="t-header">
                        {editingId === t.id ? (
                            <input
                                className="rename-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(t.id); if (e.key === "Escape") setEditingId(null); }}
                                onBlur={() => handleRename(t.id)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        ) : (
                            <div className="t-title">{displayTitle}</div>
                        )}
                        <div className="t-lang">EN</div>
                    </div>
                    <div className="t-meta">
                        {dt.date} · {dt.time} · {words.toLocaleString()}w · {dt.relative}
                    </div>

                    {isExpanded && (
                        <div className="t-expand" onClick={(e) => e.stopPropagation()}>
                            {t.text}
                        </div>
                    )}
                </div>

                <button
                    className="t-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : t.id); }}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>

                {isMenuOpen && (
                    <div className="t-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button className="t-dropdown-item" onClick={() => { setEditValue(displayTitle); setEditingId(t.id); setMenuId(null); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Rename
                        </button>
                        <button className="t-dropdown-item danger" onClick={() => handleDelete(t.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <style>{`
                .activity-header {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 20px;
                }

                .activity-title {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 12px;
                  font-weight: 600;
                  color: #e2e8f0;
                  letter-spacing: 0.2em;
                  text-transform: uppercase;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                }
                .activity-title::before {
                  content: "";
                  display: inline-block;
                  width: 6px; height: 6px;
                  background: #06b6d4;
                  border-radius: 50%;
                }

                .activity-count {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  color: #c084fc;
                  background: rgba(192,132,252,0.1);
                  padding: 2px 8px;
                  border-radius: 100px;
                  margin-left: 8px;
                }

                .view-all-btn {
                  font-size: 13px;
                  color: #cbd5e1;
                  background: rgba(255,255,255,0.03);
                  padding: 6px 12px;
                  border-radius: 100px;
                  border: none;
                  cursor: pointer;
                  transition: background 0.2s;
                  font-family: 'Inter', sans-serif;
                }
                .view-all-btn:hover { background: rgba(255,255,255,0.08); }


                /* ── Main list ── */
                .t-list { display: flex; flex-direction: column; gap: 8px; }

                /* ── Horizontal scroll mode ── */
                .t-scroll-wrap { position: relative; }
                .t-list-horiz {
                  display: flex;
                  gap: 16px;
                  overflow-x: auto;
                  scroll-snap-type: x mandatory;
                  padding: 4px 0 16px;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                  scrollbar-color: rgba(192,132,252,0.2) transparent;
                }
                .t-list-horiz::-webkit-scrollbar { height: 6px; }
                .t-list-horiz::-webkit-scrollbar-track { background: transparent; }
                .t-list-horiz::-webkit-scrollbar-thumb { background: rgba(192,132,252,0.2); border-radius: 3px; }

                .t-card-horiz {
                  min-width: 320px;
                  max-width: 320px;
                  scroll-snap-align: start;
                  flex-shrink: 0;
                  background: rgba(18, 15, 33, 0.5);
                  border: 1px solid rgba(255,255,255,0.04);
                  border-radius: 16px;
                  padding: 16px;
                }
                .t-card-horiz:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); }

                .scroll-arrow {
                  position: absolute;
                  top: 50%;
                  transform: translateY(-50%);
                  width: 36px;
                  height: 36px;
                  background: rgba(18, 15, 33, 0.9);
                  border: 1px solid rgba(255,255,255,0.08);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #f1f5f9;
                  cursor: pointer;
                  z-index: 10;
                  backdrop-filter: blur(10px);
                  transition: all 0.2s;
                }
                .scroll-arrow:hover { background: rgba(192,132,252,0.15); border-color: rgba(192,132,252,0.3); }
                .scroll-arrow.left { left: -12px; }
                .scroll-arrow.right { right: -12px; }
                .scroll-arrow svg { width: 16px; height: 16px; }

                /* ── Card styles (shared) ── */
                .t-card {
                  display: flex;
                  align-items: flex-start;
                  gap: 16px;
                  border-radius: 14px;
                  padding: 14px 16px;
                  transition: all 0.2s;
                  cursor: pointer;
                  position: relative;
                }
                .t-card:hover { background: rgba(255,255,255,0.02); }
                .t-card.expanded { background: rgba(192,132,252,0.03); }

                .t-card-icon {
                  width: 42px;
                  height: 42px;
                  background: rgba(30, 20, 50, 0.5);
                  border: 1px solid rgba(192, 132, 252, 0.1);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #c084fc;
                  flex-shrink: 0;
                }
                .t-card-icon svg { width: 20px; height: 20px; }

                .t-card-content { flex: 1; min-width: 0; }

                .t-header {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 4px;
                }

                .t-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #f1f5f9;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .t-lang {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  color: #c084fc;
                  background: rgba(192, 132, 252, 0.1);
                  padding: 2px 6px;
                  border-radius: 4px;
                  flex-shrink: 0;
                }

                .t-meta {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  color: #64748b;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                }

                .t-expand {
                  margin-top: 12px;
                  padding: 14px 16px;
                  background: rgba(0,0,0,0.2);
                  border: 1px solid rgba(255,255,255,0.04);
                  border-radius: 10px;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 12px;
                  line-height: 1.7;
                  color: #94a3b8;
                  max-height: 180px;
                  overflow-y: auto;
                  white-space: pre-wrap;
                  word-break: break-word;
                  animation: expand-in 0.2s ease;
                }

                @keyframes expand-in {
                  from { opacity: 0; max-height: 0; }
                  to { opacity: 1; max-height: 180px; }
                }

                .t-menu-btn {
                  position: absolute;
                  top: 14px;
                  right: 12px;
                  width: 28px;
                  height: 28px;
                  background: rgba(255,255,255,0.03);
                  border: 1px solid rgba(255,255,255,0.04);
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #64748b;
                  cursor: pointer;
                  opacity: 0;
                  transition: all 0.15s;
                }
                .t-card:hover .t-menu-btn { opacity: 1; }
                .t-menu-btn:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }

                .t-dropdown {
                  position: absolute;
                  top: 44px;
                  right: 12px;
                  background: #1a1528;
                  border: 1px solid rgba(255,255,255,0.06);
                  border-radius: 10px;
                  padding: 4px;
                  z-index: 50;
                  min-width: 140px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                  animation: drop-in 0.12s ease;
                }

                @keyframes drop-in {
                  from { opacity: 0; transform: translateY(-4px); }
                  to { opacity: 1; transform: translateY(0); }
                }

                .t-dropdown-item {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 8px 12px;
                  border-radius: 7px;
                  font-size: 13px;
                  color: #cbd5e1;
                  cursor: pointer;
                  transition: background 0.15s;
                  border: none;
                  background: none;
                  width: 100%;
                  font-family: 'Inter', sans-serif;
                }
                .t-dropdown-item:hover { background: rgba(255,255,255,0.04); }
                .t-dropdown-item.danger { color: #f87171; }
                .t-dropdown-item.danger:hover { background: rgba(239,68,68,0.08); }
                .t-dropdown-item svg { width: 14px; height: 14px; }

                .rename-input {
                  background: rgba(255,255,255,0.04);
                  border: 1px solid rgba(192,132,252,0.3);
                  border-radius: 6px;
                  padding: 4px 8px;
                  font-size: 14px;
                  font-weight: 600;
                  color: #f1f5f9;
                  outline: none;
                  font-family: 'Inter', sans-serif;
                  width: 200px;
                }
                .rename-input:focus { border-color: #c084fc; }

                .empty-state {
                  text-align: center;
                  padding: 60px 24px;
                  background: rgba(255,255,255,0.01);
                  border: 1px dashed rgba(255,255,255,0.06);
                  border-radius: 20px;
                }
                .empty-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #e2e8f0;
                  margin-bottom: 6px;
                }
                .empty-sub { font-size: 13px; color: #94a3b8; }
            `}</style>

            {/* Header */}
            <div className="activity-header">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="activity-title">RECENT ACTIVITY</div>
                    {transcripts.length > 0 && <span className="activity-count">{transcripts.length}</span>}
                </div>
                {hasMore && (
                    <button className="view-all-btn" onClick={() => setViewAll(!viewAll)}>
                        {viewAll ? "← Collapse" : "View all →"}
                    </button>
                )}
            </div>

            {transcripts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-title">No transcripts yet</div>
                    <div className="empty-sub">Upload an audio file to get started</div>
                </div>
            ) : viewAll ? (
                /* ── Horizontal scroll view ── */
                <div className="t-scroll-wrap">
                    <button className="scroll-arrow left" onClick={scrollLeft}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="t-list-horiz" ref={scrollRef}>
                        {transcripts.map(t => renderCard(t, true))}
                    </div>
                    <button className="scroll-arrow right" onClick={scrollRight}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            ) : (
                /* ── Vertical list view (limited) ── */
                <div className="t-list">
                    {displayed.map(t => renderCard(t))}
                </div>
            )}
        </>
    );
}
