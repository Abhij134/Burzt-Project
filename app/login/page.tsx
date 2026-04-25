// app/login/page.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // We will use this ONCE to create your admin account
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: "Admin"
    });
    if (data) router.push("/dashboard");
    if (error) alert(error.message);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
     const { data, error } = await authClient.signIn.email({
        email,
        password
    });
    if (data) router.push("/dashboard");
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
        <form className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <div className="flex gap-2">
            <button onClick={handleSignIn} className="w-full bg-blue-600 text-white py-2 rounded">
              Log In
            </button>
            <button onClick={handleSignUp} className="w-full bg-gray-200 text-gray-800 py-2 rounded">
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}