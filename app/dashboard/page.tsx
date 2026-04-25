import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TranscriberClient from "./TranscriberClient";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/login");
    }

    // Server-side database fetch
    const transcripts = await prisma.transcript.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" }
    });

    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 p-8 pb-16 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">

                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Audio Transcriber</h1>
                    </div>

                    <div className="text-sm font-medium text-gray-500 bg-gray-100 py-1.5 px-4 rounded-full">
                        {session.user.email}
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Upload Section - 5 columns width */}
                    <div className="md:col-span-5">
                        <TranscriberClient />
                    </div>

                    {/* History Section - 7 columns width */}
                    <div className="md:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[650px] overflow-y-auto custom-scrollbar">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 mb-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Your Transcripts History</h2>
                            <span className="text-xs font-semibold bg-blue-100 text-blue-800 py-1 px-3 rounded-full">
                                {transcripts.length} Entries
                            </span>
                        </div>

                        {transcripts.length === 0 ? (
                            <div className="h-4/5 flex flex-col items-center justify-center text-center">
                                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-lg font-medium">No transcripts found</p>
                                <p className="text-gray-400 text-sm mt-1">Upload an audio note to get started.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transcripts.map((t) => (
                                    <div key={t.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all">
                                        <div className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {t.createdAt.toLocaleString(undefined, {
                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{t.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* simple global CSS for better scrolling aesthetics inside localized scopes */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 10px;
                }
            `}} />
        </div>
    );
}
