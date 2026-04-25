"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TranscriberClient() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("audio", file);

            const res = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to transcribe audio.");
            }

            // Immediately refresh the dashboard UI to show the newly added DB entry
            router.refresh();
            setFile(null);

            // clear the input visually if necessary (requires a ref in complex apps, state resets it largely though)
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800">New Transcription</h2>
            <form onSubmit={handleUpload} className="space-y-4">
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || loading}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Transcribing Audio...
                        </>
                    ) : "Transcribe"}
                </button>
            </form>
        </div>
    );
}
