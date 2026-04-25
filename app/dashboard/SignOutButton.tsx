"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        if (!window.confirm("Are you sure you want to log out?")) return;
        setLoading(true);
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <button
            onClick={handleSignOut}
            disabled={loading}
            className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200
        ${loading
                    ? "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 cursor-not-allowed"
                    : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[#64748b] hover:text-[#f87171] hover:border-[rgba(248,113,113,0.3)] hover:bg-[rgba(248,113,113,0.05)]"}
      `}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            )}
            {loading ? "Logging out..." : "Log Out"}
        </button>
    );
}
