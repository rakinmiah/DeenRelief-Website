"use client";

import { useState } from "react";
import Image from "next/image";

export default function AuthPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <Image
          src="/images/logo.webp"
          alt="Deen Relief"
          width={180}
          height={32}
          className="mx-auto mb-10"
          style={{ height: "32px", width: "auto" }}
          priority
        />

        <p className="text-grey text-sm mb-6">
          This site is currently in preview. Enter the password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            className="w-full px-4 py-3 rounded-xl border-2 border-grey-light text-charcoal text-center placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-xs">
              Incorrect password. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-full bg-green text-white font-semibold text-sm hover:bg-green-dark transition-colors duration-200 ${loading ? "opacity-75" : ""}`}
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>

        <p className="text-charcoal/20 text-[10px] mt-8">
          Deen Relief — Charity No. 1158608
        </p>
      </div>
    </div>
  );
}
