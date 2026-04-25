"use client";

import { useState, useRef, useEffect } from "react";

type TranscriptItem = {
    id: string;
    title: string | null;
    text: string;
    createdAt: string;
};

export default function SearchBar({ items }: { items: TranscriptItem[] }) {
    const [value, setValue] = useState("");
    const [open, setOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const q = value.toLowerCase().trim();
    const results = q
        ? items.filter(t => {
            const title = (t.title || "Audio Recording " + t.id.slice(0, 4).toUpperCase()).toLowerCase();
            return title.includes(q) || t.text.toLowerCase().includes(q);
        })
        : [];

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
        return `${date} · ${time}`;
    };

    const highlight = (text: string, maxLen = 120) => {
        if (!q) return text.slice(0, maxLen);
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return text.slice(0, maxLen);
        const start = Math.max(0, idx - 30);
        const snippet = text.slice(start, start + maxLen);
        const parts = snippet.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
        return parts.map((p, i) =>
            p.toLowerCase() === q ? <mark key={i} style={{ background: "rgba(192,132,252,0.25)", color: "#e2e8f0", borderRadius: "2px", padding: "0 1px" }}>{p}</mark> : p
        );
    };

    return (
        <>
            <style>{`
                .search-wrap { position: relative; width: 100%; max-width: 360px; }

                .sr-dropdown {
                  position: absolute;
                  top: calc(100% + 8px);
                  left: 0;
                  right: 0;
                  background: #15121f;
                  border: 1px solid rgba(255,255,255,0.06);
                  border-radius: 16px;
                  padding: 8px;
                  z-index: 100;
                  max-height: 420px;
                  overflow-y: auto;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(192,132,252,0.05);
                  animation: sr-in 0.15s ease;
                  scrollbar-width: thin;
                  scrollbar-color: rgba(192,132,252,0.15) transparent;
                }

                .sr-dropdown::-webkit-scrollbar { width: 5px; }
                .sr-dropdown::-webkit-scrollbar-track { background: transparent; }
                .sr-dropdown::-webkit-scrollbar-thumb { background: rgba(192,132,252,0.15); border-radius: 3px; }

                @keyframes sr-in {
                  from { opacity: 0; transform: translateY(-6px); }
                  to { opacity: 1; transform: translateY(0); }
                }

                .sr-header {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  color: #64748b;
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  padding: 6px 10px 10px;
                }

                .sr-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 12px;
                  padding: 10px 12px;
                  border-radius: 10px;
                  cursor: pointer;
                  transition: background 0.15s;
                }
                .sr-item:hover { background: rgba(255,255,255,0.03); }

                .sr-icon {
                  width: 34px;
                  height: 34px;
                  background: rgba(30, 20, 50, 0.5);
                  border: 1px solid rgba(192,132,252,0.1);
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #c084fc;
                  flex-shrink: 0;
                }
                .sr-icon svg { width: 16px; height: 16px; }

                .sr-content { flex: 1; min-width: 0; }

                .sr-title {
                  font-size: 13px;
                  font-weight: 600;
                  color: #f1f5f9;
                  margin-bottom: 2px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .sr-snippet {
                  font-size: 11px;
                  color: #94a3b8;
                  line-height: 1.5;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }

                .sr-date {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  color: #64748b;
                  margin-top: 4px;
                }

                .sr-expanded {
                  margin-top: 8px;
                  padding: 10px 12px;
                  background: rgba(0,0,0,0.25);
                  border: 1px solid rgba(255,255,255,0.04);
                  border-radius: 8px;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  line-height: 1.6;
                  color: #94a3b8;
                  max-height: 140px;
                  overflow-y: auto;
                  white-space: pre-wrap;
                  word-break: break-word;
                }

                .sr-empty {
                  text-align: center;
                  padding: 24px 16px;
                  color: #64748b;
                  font-size: 13px;
                }
            `}</style>

            <div className="search-wrap" ref={wrapRef}>
                <div className="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search transcripts..."
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setOpen(true); }}
                        onFocus={() => { if (value) setOpen(true); }}
                    />
                    {value ? (
                        <button
                            onClick={() => { setValue(""); setOpen(false); }}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: "18px", lineHeight: 1 }}
                        >
                            ×
                        </button>
                    ) : (
                        <span className="cmd-k">⌘K</span>
                    )}
                </div>

                {/* Dropdown results */}
                {open && q && (
                    <div className="sr-dropdown">
                        <div className="sr-header">
                            {results.length} result{results.length !== 1 ? "s" : ""}
                        </div>
                        {results.length === 0 ? (
                            <div className="sr-empty">No transcripts match &ldquo;{value}&rdquo;</div>
                        ) : (
                            results.map(t => {
                                const displayTitle = t.title || "Audio Recording " + t.id.slice(0, 4).toUpperCase();
                                const isExpanded = expandedId === t.id;
                                return (
                                    <div key={t.id}>
                                        <div className="sr-item" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                                            <div className="sr-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="sr-content">
                                                <div className="sr-title">{displayTitle}</div>
                                                <div className="sr-snippet">{highlight(t.text)}</div>
                                                <div className="sr-date">{formatDate(t.createdAt)}</div>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="sr-expanded">{t.text}</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
