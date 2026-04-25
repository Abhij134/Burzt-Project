"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { transcribeAudio, saveTranscript } from "@/app/actions/transcribe";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";
type Panel = "main" | "recording";

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriberClient() {
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [progress, setProgress] = useState(0);
    const [transcript, setTranscript] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [copied, setCopied] = useState(false);
    const [audioDuration, setAudioDuration] = useState<number | null>(null);
    const [panel, setPanel] = useState<Panel>("main");
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const router = useRouter();

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const f = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
                handleFile(f);
                setPanel("main");
                setIsRecording(false);
                setRecordTime(0);
                if (timerRef.current) clearInterval(timerRef.current);
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordTime(0);
            timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
        } catch {
            setErrorMsg("Microphone access denied. Please allow mic access.");
            setStage("error");
            setPanel("main");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };


    const getAudioDuration = (f: File) => {
        const url = URL.createObjectURL(f);
        const audio = new Audio(url);
        audio.addEventListener("loadedmetadata", () => {
            setAudioDuration(Math.round(audio.duration));
            URL.revokeObjectURL(url);
        });
    };

    const handleFile = (f: File) => {
        const isAudio = f.type.startsWith("audio/");
        const isSupportedVideo = f.type.startsWith("video/mp4") || f.name.endsWith(".mp4") || f.name.endsWith(".m4a");

        if (!isAudio && !isSupportedVideo) {
            setErrorMsg("Please upload an audio file (MP3, WAV, M4A, etc.)");
            setStage("error");
            return;
        }
        setFile(f);
        setStage("idle");
        setTranscript("");
        setErrorMsg("");
        getAudioDuration(f);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFile(dropped);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const copyTranscript = async () => {
        await navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setFile(null);
        setStage("idle");
        setTranscript("");
        setErrorMsg("");
        setProgress(0);
        setAudioDuration(null);
        setSaveSuccess(false);
        setIsSaving(false);
    };

    const handleUpload = async () => {
        if (!file) return;
        setStage("uploading");
        setProgress(0);
        setErrorMsg("");

        // Simulate upload progress
        const progressInterval = setInterval(() => {
            setProgress((p) => {
                if (p >= 85) { clearInterval(progressInterval); return p; }
                return p + Math.random() * 12;
            });
        }, 200);

        try {
            const formData = new FormData();
            formData.append("audio", file);

            setStage("processing");
            clearInterval(progressInterval);
            setProgress(90);

            const result = await transcribeAudio(formData);

            if (!result.success) {
                throw new Error(result.error || "Transcription failed");
            }

            setProgress(100);
            setTranscript(result.transcript || "");
            setStage("done");
            // Note: We don't call router.refresh() here anymore, 
            // because we haven't saved to DB yet. 
            // We'll call it after the manual save.
        } catch (err: unknown) {
            clearInterval(progressInterval);
            setErrorMsg(err instanceof Error ? err.message : "Upload failed");
            setStage("error");
        }
    };

    const handleSave = async () => {
        if (!transcript || isSaving) return;
        setIsSaving(true);
        try {
            const res = await saveTranscript(transcript);
            if (res.success) {
                setSaveSuccess(true);
                // Aggressive refresh to ensure ActivityList updates
                router.refresh();
                // If router.refresh() is too slow, we can also manually trigger a fetch or use a short delay
            } else {
                throw new Error(res.error || "Failed to save");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Save failed");
            setStage("error");
        } finally {
            setIsSaving(false);
        }
    };

    const waveHeights = [8, 18, 28, 14, 32, 22, 12, 36, 20, 16, 30, 10, 24, 34, 18, 8, 26, 38, 14, 22];

    return (
        <>
            <style>{`
        /* Scoped to component instead of global to prevent pollution */
        .tc-root { 
          font-family: 'Inter', sans-serif;
          background: rgba(22, 18, 38, 0.4);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .tc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .tc-title {
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
        
        .tc-title::before {
          content: "";
          display: inline-block;
          width: 6px; height: 6px;
          background: #c084fc;
          border-radius: 50%;
        }

        .ai-badge {
          background: rgba(192, 132, 252, 0.1);
          color: #c084fc;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          padding: 4px 10px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(192, 132, 252, 0.2);
        }

        /* ── Drop Zone ── */
        .drop-zone {
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 60px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
          background: rgba(255,255,255,0.015);
          position: relative;
          overflow: hidden;
        }

        .drop-zone:hover, .drop-zone.dragging {
          border-color: rgba(192, 132, 252, 0.3);
          background: rgba(192, 132, 252, 0.03);
          transform: scale(1.005);
        }

        .drop-zone.dragging {
          box-shadow: 0 0 0 1px rgba(192, 132, 252, 0.3), inset 0 0 20px rgba(192, 132, 252, 0.04);
        }

        .drop-icon-layered {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .layer-1 {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 28px;
        }
        
        .layer-2 {
          position: absolute;
          inset: 14px;
          border: 1px dashed rgba(255,255,255,0.06);
          border-radius: 20px;
        }

        .layer-core {
          position: relative;
          width: 64px;
          height: 64px;
          background: #0d0f16;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        }

        .layer-core svg { width: 28px; height: 28px; color: #c084fc; stroke-width: 2; }

        .drop-zone:hover .layer-core { transform: translateY(-3px); box-shadow: 0 14px 24px rgba(0,0,0,0.6); transition: all 0.2s;}

        .drop-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .drop-sub {
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 24px;
        }

        .drop-browse {
          color: #c084fc;
          text-decoration: underline;
          cursor: pointer;
          text-underline-offset: 4px;
        }

        .drop-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
        }
        .drop-meta svg { width: 12px; height: 12px; }

        /* ── File Preview ── */
        .file-preview {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 0;
        }

        .file-icon {
          width: 40px;
          height: 40px;
          background: rgba(192, 132, 252, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .file-icon svg { width: 20px; height: 20px; color: #c084fc; }

        .file-info { flex: 1; min-width: 0; }

        .file-name {
          font-size: 13px;
          font-weight: 500;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .file-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #64748b;
          display: flex;
          gap: 10px;
        }

        .file-clear {
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .file-clear:hover { color: #f87171; }
        .file-clear svg { width: 16px; height: 16px; }

        /* ── Processing Waveform ── */
        .processing-box {
          background: rgba(192, 132, 252, 0.05);
          border: 1px solid rgba(192, 132, 252, 0.1);
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
        }

        .wave-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 48px;
          margin-bottom: 20px;
        }

        .wave-bar-proc {
          width: 4px;
          background: linear-gradient(to top, #06b6d4, #c084fc);
          border-radius: 3px;
          animation: wave-proc 1s ease-in-out infinite;
        }

        @keyframes wave-proc {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        .proc-title {
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 6px;
        }

        .proc-sub {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 20px;
        }

        /* ── Progress Bar ── */
        .progress-track {
          height: 3px;
          background: rgba(255,255,255,0.05);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c084fc, #06b6d4);
          border-radius: 2px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(192, 132, 252, 0.4);
        }

        .progress-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #475569;
          text-align: right;
        }

        /* ── Action Button ── */
        .action-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-btn.primary {
          background: #c084fc;
          color: #000;
        }

        .action-btn.primary:hover:not(:disabled) {
          background: #d8b4fe;
        }

        .action-btn.secondary {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
        }

        .action-btn.secondary:hover {
          background: rgba(255,255,255,0.06);
          color: #cbd5e1;
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Transcript Result ── */
        .result-box {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(192, 132, 252, 0.2);
          border-radius: 16px;
          overflow: hidden;
        }

        .result-header {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .result-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: #c084fc;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          background: #c084fc;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .result-text {
          padding: 20px 18px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.8;
          color: #94a3b8;
          white-space: pre-wrap;
          max-height: 250px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .result-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .save-success-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(192, 132, 252, 0.08);
          border: 1px solid rgba(192, 132, 252, 0.15);
          border-radius: 12px;
          color: #d8b4fe;
          font-size: 13px;
          font-weight: 600;
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .save-success-badge svg {
          width: 14px;
          height: 14px;
          color: #c084fc;
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── Error ── */
        .error-banner {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #f87171;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-banner svg { width: 16px; height: 16px; flex-shrink: 0; }

        /* ── Secondary Options Row ── */
        .options-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 4px;
        }

        .option-card {
          background: #110e1a;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .option-card:hover {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.06);
        }

        .opt-icon {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .opt-info { flex: 1; }
        .opt-title { font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 2px; }
        .opt-sub { font-size: 11px; color: #64748b; }

        /* ── Recording Panel ── */
        .rec-panel {
          text-align: center;
          padding: 40px 24px;
        }

        .rec-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.4);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          animation: rec-pulse 1.5s ease-in-out infinite;
        }

        @keyframes rec-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }

        .rec-circle svg { width: 28px; height: 28px; color: #f87171; }

        .rec-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px;
          font-weight: 700;
          color: #f87171;
          margin-bottom: 8px;
        }

        .rec-label { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }

        .rec-stop {
          background: #c084fc;
          color: #0d0f16;
          border: none;
          padding: 12px 32px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rec-stop:hover { background: #d8b4fe; }

        /* ── URL Panel ── */
        .url-panel { padding: 8px 0; }

        .url-input-wrap {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }

        .url-input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 13px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.2s;
        }
        .url-input:focus { border-color: rgba(45,212,191,0.4); }
        .url-input::placeholder { color: #64748b; }

        .url-go {
          background: #c084fc;
          color: #0d0f16;
          border: none;
          padding: 0 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .url-go:hover { background: #d8b4fe; }

        .back-link {
          font-size: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }
        .back-link:hover { color: #f1f5f9; }
      `}</style>

            <div className="tc-root">
                <div className="tc-header">
                    <div className="tc-title">NEW TRANSCRIPTION</div>
                </div>

                {/* ── Idle: Drop Zone ── */}
                {stage === "idle" && !file && (
                    <div
                        className={`drop-zone ${isDragging ? "dragging" : ""}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*,.mp4,.mp3,.wav,.m4a"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(f);
                            }}
                        />

                        <div className="drop-icon-layered">
                            <div className="layer-1"></div>
                            <div className="layer-2"></div>
                            <div className="layer-core">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                </svg>
                            </div>
                        </div>

                        <div className="drop-title">Drop your audio file here</div>
                        <div className="drop-sub">
                            or <span className="drop-browse">browse files</span>
                        </div>

                        <div className="drop-meta">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Up to 200 MB · Encrypted in transit
                        </div>
                    </div>
                )}

                {/* ── File Selected ── */}
                {file && stage === "idle" && (
                    <>
                        <div className="file-preview">
                            <div className="file-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                </svg>
                            </div>
                            <div className="file-info">
                                <div className="file-name">{file.name}</div>
                                <div className="file-meta">
                                    <span>{formatBytes(file.size)}</span>
                                    {audioDuration != null && <span>{formatDuration(audioDuration)}</span>}
                                    <span>{file.type.split("/")[1]?.toUpperCase() || "AUDIO"}</span>
                                </div>
                            </div>
                            <button className="file-clear" onClick={reset} title="Remove file">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <button className="action-btn primary" onClick={handleUpload}>
                            Transcribe Audio
                        </button>
                    </>
                )}

                {/* ── Uploading ── */}
                {stage === "uploading" && (
                    <div className="processing-box">
                        <div className="proc-title">Uploading audio...</div>
                        <div className="proc-sub">Sending your file to the server</div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="progress-label">{Math.round(progress)}%</div>
                    </div>
                )}

                {/* ── Processing ── */}
                {stage === "processing" && (
                    <div className="processing-box">
                        <div className="wave-container">
                            {waveHeights.map((h, i) => (
                                <div
                                    key={i}
                                    className="wave-bar-proc"
                                    style={{ height: `${h}px`, animationDelay: `${(i * 0.06) % 1}s` }}
                                />
                            ))}
                        </div>
                        <div className="proc-title">Analyzing audio</div>
                        <div className="proc-sub">Gemini AI is generating your transcript</div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: "90%" }} />
                        </div>
                    </div>
                )}

                {/* ── Done ── */}
                {stage === "done" && transcript && (
                    <>
                        <div className="result-box">
                            <div className="result-header">
                                <div className="result-badge">
                                    <div className="badge-dot" />
                                    TRANSCRIPT READY
                                </div>
                            </div>
                            <div className="result-text">{transcript}</div>
                        </div>

                        <div className="result-actions">
                            {!saveSuccess ? (
                                <button
                                    className="action-btn primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save to History"}
                                </button>
                            ) : (
                                <div className="save-success-badge">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Saved
                                </div>
                            )}

                            <button className="action-btn secondary" onClick={reset}>
                                Transcribe another
                            </button>
                        </div>
                    </>
                )}

                {/* ── Error ── */}
                {stage === "error" && (
                    <>
                        <div className="error-banner">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {errorMsg}
                        </div>
                        <button className="action-btn secondary" onClick={reset}>Try again</button>
                    </>
                )}

                {/* Options Row (Visible when idle on main panel) */}
                {stage === "idle" && !file && panel === "main" && (
                    <div className="options-row">
                        <div className="option-card" onClick={() => { setPanel("recording"); startRecording(); }}>
                            <div className="opt-icon record">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" width="18" height="18">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0M12 18v3m-2 0h4" />
                                </svg>
                            </div>
                            <div className="opt-info">
                                <div className="opt-title">Record live</div>
                                <div className="opt-sub">Capture from mic</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Recording Panel ── */}
                {panel === "recording" && isRecording && (
                    <div className="rec-panel">
                        <div className="rec-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0M12 18v3m-2 0h4" />
                            </svg>
                        </div>
                        <div className="rec-time">{formatDuration(recordTime)}</div>
                        <div className="rec-label">Recording from microphone...</div>
                        <button className="rec-stop" onClick={stopRecording}>Transcribe</button>
                    </div>
                )}

            </div>
        </>
    );
}