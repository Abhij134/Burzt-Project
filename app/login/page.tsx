"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const { data, error } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        });
        if (data) router.push("/dashboard");
        if (error) setError(error.message ?? "Sign up failed");
      } else {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (data) router.push("/dashboard");
        if (error) setError(error.message ?? "Sign in failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: radial-gradient(circle at 30% 20%, #281a42 0%, #0d0f16 60%, #0b0c13 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(192,132,252,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192,132,252,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        .glow-orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,132,252,0.07) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse-orb 4s ease-in-out infinite alternate;
        }

        @keyframes pulse-orb {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 440px;
          background: rgba(22, 18, 38, 0.5);
          border: 1px solid rgba(192,132,252,0.1);
          border-radius: 24px;
          padding: 48px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #c084fc, #06b6d4);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-icon svg { width: 20px; height: 20px; color: #0d0f16; }

        .logo-text {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: 0.02em;
        }

        .card-headline {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .card-sub {
          font-size: 15px;
          color: #94a3b8;
          margin-bottom: 36px;
        }

        .tab-row {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
        }

        .tab-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 9px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #94a3b8;
        }

        .tab-btn.active {
          background: rgba(192,132,252,0.15);
          color: #d8b4fe;
        }

        .field {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
        }

        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 13px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field-input::placeholder { color: #64748b; }

        .field-input:focus {
          border-color: rgba(192,132,252,0.4);
          box-shadow: 0 0 0 3px rgba(192,132,252,0.08);
        }

        .error-box {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #f87171;
          margin-bottom: 16px;
          animation: shake 0.3s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .submit-btn {
          width: 100%;
          margin-top: 8px;
          padding: 14px;
          background: #c084fc;
          border: none;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #0d0f16;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .submit-btn:hover:not(:disabled) {
          background: #d8b4fe;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(192,132,252,0.3);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(13,15,22,0.3);
          border-top-color: #0d0f16;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .footer-note {
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: #64748b;
        }

        .waveform-deco {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          margin-top: 32px;
          opacity: 0.3;
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

        /* ── Skeleton Loading ── */
        .skeleton-block {
          background: linear-gradient(90deg, rgba(192,132,252,0.03) 25%, rgba(192,132,252,0.12) 50%, rgba(192,132,252,0.03) 75%);
          background-size: 200% 100%;
          animation: sk-load 1.5s infinite ease-in-out;
          border-radius: 8px;
        }

        @keyframes sk-load {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="login-root">
        <div className="grid-bg" />
        <div className="glow-orb" />

        <div className="login-card">
          <div className="logo-mark">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="logo-text">Burzt Audio</span>
          </div>

          <h1 className="card-headline">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="card-sub">
            {mode === "signin"
              ? "Sign in to access your transcripts"
              : "Start transcribing audio with AI"}
          </p>

          <div className="tab-row">
            <button
              className={`tab-btn ${mode === "signin" ? "active" : ""}`}
              onClick={() => { setMode("signin"); setError(""); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              Sign Up
            </button>
          </div>

          {loading ? (
            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <div className="skeleton-block" style={{ width: "30%", height: "14px", marginBottom: "8px", borderRadius: "4px" }} />
              <div className="skeleton-block" style={{ width: "100%", height: "45px", marginBottom: "20px", borderRadius: "10px" }} />
              <div className="skeleton-block" style={{ width: "40%", height: "14px", marginBottom: "8px", borderRadius: "4px" }} />
              <div className="skeleton-block" style={{ width: "100%", height: "45px", marginBottom: "32px", borderRadius: "10px" }} />
              <div className="skeleton-block" style={{ width: "100%", height: "45px", borderRadius: "10px" }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="field-input"
                    style={{ paddingRight: "40px" }}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="error-box">{error}</div>}

              <button className="submit-btn" type="submit">
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
          )}

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

          <p className="footer-note">Audio transcription powered by Gemini AI</p>
        </div>
      </div>
    </>
  );
}