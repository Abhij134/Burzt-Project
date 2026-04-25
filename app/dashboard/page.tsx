import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TranscriberClient from "./TranscriberClient";
import SignOutButton from "./SignOutButton";
import ActivityList from "./ActivityList";
import SearchBar from "./SearchBar";
import { Suspense } from "react";

async function ActivityFeed({ userId }: { userId: string }) {
    const transcripts = await prisma.transcript.findMany({
        where: { userId },
        select: { id: true, title: true, text: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="sidebar-column">
            {/* Stats above activity */}
            <div className="sidebar-stats">
                <div className="stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="stat-label">TRANSCRIPTS</div>
                    <div className="stat-value primary">{transcripts.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </div>
                    <div className="stat-label">TOTAL WORDS</div>
                    <div className="stat-value gradient">
                        {transcripts
                            .reduce((acc, t) => acc + t.text.split(/\s+/).filter(Boolean).length, 0)
                            .toLocaleString()}
                    </div>
                </div>
            </div>

            {/* History Panel */}
            <div className="history-panel">
                <ActivityList items={transcripts.map(t => ({
                    id: t.id,
                    title: t.title ?? null,
                    text: t.text,
                    createdAt: t.createdAt.toISOString(),
                }))} />
            </div>
        </div>
    );
}

function FeedSkeleton() {
    return (
        <div className="sidebar-column" style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <div className="sidebar-stats">
                <div className="stat-card"><div className="stat-label">LOADING...</div></div>
                <div className="stat-card"><div className="stat-label">LOADING...</div></div>
            </div>
            <div className="history-panel">
                <div style={{ color: '#64748b', fontSize: '13px' }}>Refining your activity stream...</div>
            </div>
        </div>
    );
}

async function SearchBarData({ userId }: { userId: string }) {
    const transcripts = await prisma.transcript.findMany({
        where: { userId },
        select: { id: true, title: true, text: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <SearchBar items={transcripts.map(t => ({
            id: t.id,
            title: t.title ?? null,
            text: t.text,
            createdAt: t.createdAt.toISOString(),
        }))} />
    );
}

export default async function DashboardPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/login");

    const initials = (session.user.email ?? "U")
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0f1016; /* Base dark */
          color: #e2e8f0;
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }

        .db-root {
          min-height: 100vh;
          background: radial-gradient(circle at 30% 10%, #281a42 0%, #0d0f16 60%, #0b0c13 100%);
          position: relative;
        }

        .db-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        /* ── Topbar ── */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
          margin-bottom: 50px;
          z-index: 10;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 32px;
          flex: 1;
        }

        /* Logo retained for branding */
        .logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-mark {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #c084fc, #06b6d4);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-mark svg { width: 18px; height: 18px; color: #0d0f16; }

        .logo-name {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: 0.02em;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: rgba(18, 15, 33, 0.7);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 100px;
          padding: 8px 16px;
          width: 100%;
          max-width: 360px;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .search-bar svg { width: 16px; height: 16px; color: #94a3b8; }
        .search-bar input {
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          flex: 1;
          outline: none;
        }
        .search-bar input::placeholder { color: #64748b; }
        .cmd-k {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #94a3b8;
          background: rgba(255,255,255,0.06);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }



        .user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(25, 18, 43, 0.6);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 40px;
          padding: 4px 16px 4px 4px;
        }

        .avatar {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #06b6d4, #c084fc);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #0d0f16;
        }

        .user-email {
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
        }

        /* ── Page Header ── */
        .page-header {
          margin-bottom: 60px;
          animation: fade-up 0.5s ease;
          max-width: 600px;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .page-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #c084fc;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
        }

        .eyebrow-dot {
          width: 8px;
          height: 8px;
          background: #c084fc;
          border-radius: 50%;
          box-shadow: 0 0 12px #c084fc;
        }

        .page-title {
          font-size: clamp(48px, 6vw, 72px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
        }

        .page-title span {
          background: linear-gradient(90deg, #d8b4fe, #818cf8, #2dd4bf);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .page-sub {
          font-size: 17px;
          color: #94a3b8;
          line-height: 1.6;
        }

        /* ── Sidebar Stats ── */
        .sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .stat-card {
          background: #110e1a;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .stat-icon {
          position: absolute;
          top: 24px;
          right: 24px;
          color: #818cf8;
          opacity: 0.8;
        }
        .stat-icon svg { width: 18px; height: 18px; }

        .stat-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #94a3b8;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .stat-value.primary { color: #ffffff; }
        .stat-value.gradient {
          background: linear-gradient(90deg, #d8b4fe, #2dd4bf);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── Grid Layout ── */
        .main-grid {
          display: grid;
          grid-template-columns: 460px 1fr;
          gap: 32px;
          align-items: start;
        }

        @media (max-width: 960px) {
          .main-grid { grid-template-columns: 1fr; }
        }

        /* ── History Panel ── */
        .history-panel {
          background: rgba(18, 15, 33, 0.4);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 20px;
          padding: 32px;
          animation: fade-up 0.5s ease 0.15s both;
        }

        .animated-subtitle {
          position: relative;
          height: 28px;
          margin-top: 12px;
          font-size: 16px;
          color: #94a3b8;
          font-weight: 500;
        }

        .subtitle-phrase {
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          animation: slideDownCycle 9s infinite;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Stagger the start times */
        .phrase-1 { animation-delay: 0s; }
        .phrase-2 { animation-delay: 4.5s; }

        /* The motion: Fade in from top, hold, fade out to bottom */
        @keyframes slideDownCycle {
          0% { opacity: 0; transform: translateY(-15px); }
          8% { opacity: 1; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 0; transform: translateY(15px); }
        }
      `}</style>

            <div className="db-root">
                <div className="db-inner">
                    {/* Topbar */}
                    <div className="topbar">
                        <div className="topbar-left">
                            <div className="logo-group">
                                <div className="logo-mark">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <span className="logo-name">Burzt Audio</span>
                            </div>

                            <Suspense fallback={<div className="search-skeleton" />}>
                                <SearchBarData userId={session.user.id} />
                            </Suspense>
                        </div>

                        <div className="topbar-right">
                            <div className="user-pill">
                                <div className="avatar">{initials}</div>
                                <span className="user-email">{session.user.email}</span>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>

                    {/* Page Header */}
                    <div className="page-header">
                        <div className="page-eyebrow">
                            <span className="eyebrow-dot" />
                            LIVE · AUDIO INTELLIGENCE
                        </div>
                        <h1 className="page-title">
                            Turn sound<br />
                            into <span>signal.</span>
                        </h1>

                        <div className="animated-subtitle">
                            <div className="subtitle-phrase phrase-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Upload any audio file
                            </div>
                            <div className="subtitle-phrase phrase-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0M12 18v3m-2 0h4" /></svg>
                                Record live from mic
                            </div>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="main-grid">
                        {/* Upload Panel component wrapper */}
                        <TranscriberClient />

                        <Suspense fallback={<FeedSkeleton />}>
                            <ActivityFeed userId={session.user.id} />
                        </Suspense>
                    </div>

                    {/* Footer */}
                    <footer className="db-footer">
                        <div className="waveform-deco">
                            {[6, 12, 20, 14, 8, 18, 10, 16, 6, 14, 20, 8, 12].map((h, i) => (
                                <div
                                    key={i}
                                    className="wave-bar"
                                    style={{
                                        height: `${h}px`,
                                        animationDelay: `${i * 0.1}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <div className="footer-content">
                            <span className="footer-brand">Burzt Audio</span>
                            <span className="footer-dot">·</span>
                            <span className="footer-text">Crafted with precision</span>
                            <span className="footer-dot">·</span>
                            {/* PASTE YOUR CONTACT LINK BELOW in the href="..." attribute */}
                            <a
                                href="https://abhijeetg.netlify.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer-contact"
                            >
                                Contact Us ↗
                            </a>
                        </div>
                    </footer>

                    <style>{`
                      .db-footer {
                        margin-top: 80px;
                        padding: 40px 0 32px;
                        border-top: 1px solid rgba(255,255,255,0.03);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 24px;
                      }

                      .waveform-deco {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 3px;
                        opacity: 0.4;
                      }

                      .wave-bar {
                        width: 3px;
                        background: linear-gradient(to top, #06b6d4, #c084fc);
                        border-radius: 2px;
                        animation: wave-dance 1.2s ease-in-out infinite;
                      }

                      @keyframes wave-dance {
                        0%, 100% { height: 4px; }
                        50% { height: 16px; }
                      }

                      .footer-content {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 13px;
                      }

                      .footer-brand {
                        font-weight: 600;
                        color: #94a3b8;
                      }

                      .footer-dot {
                        color: #475569;
                      }

                      .footer-text {
                        color: #64748b;
                      }

                      .footer-contact {
                        color: #c084fc;
                        text-decoration: none;
                        font-weight: 500;
                        transition: color 0.2s;
                      }
                      .footer-contact:hover {
                        color: #d8b4fe;
                      }
                    `}</style>
                </div>
            </div>
        </>
    );
}