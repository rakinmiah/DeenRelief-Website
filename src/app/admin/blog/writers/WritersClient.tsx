"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addWriterAction, removeWriterAction } from "../actions";
import type { WriterRow } from "@/lib/blog-admin";

export default function WritersClient({
  initialWriters,
}: {
  initialWriters: WriterRow[];
}) {
  const router = useRouter();
  const [writers, setWriters] = useState<WriterRow[]>(initialWriters);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await addWriterAction(email, name);
      if (!res.ok) {
        setError(res.error ?? "Couldn't add the writer.");
        return;
      }
      setWriters([
        {
          email: email.toLowerCase().trim(),
          displayName: name.trim() || null,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        },
        ...writers,
      ]);
      setEmail("");
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(target: string) {
    if (!confirm(`Remove ${target}? They'll no longer be able to sign in.`)) return;
    const res = await removeWriterAction(target);
    if (!res.ok) {
      setError(res.error ?? "Couldn't remove the writer.");
      return;
    }
    setWriters(writers.filter((w) => w.email !== target));
    router.refresh();
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-charcoal/10 bg-white p-4 mb-6"
      >
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="writer@deenrelief.org"
              className="dr-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Display name <span className="text-grey/60 font-normal">(byline)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aisha Khan"
              className="dr-input"
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-green text-white font-medium hover:bg-green-dark disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add writer"}
          </button>
        </div>
      </form>

      {writers.length === 0 ? (
        <p className="text-grey text-sm text-center py-6">No writers yet.</p>
      ) : (
        <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
          {writers.map((w) => (
            <div key={w.email} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-charcoal truncate">
                  {w.displayName || w.email}
                </p>
                {w.displayName && (
                  <p className="text-xs text-grey/70 truncate">{w.email}</p>
                )}
              </div>
              <span className="text-xs text-grey/60">
                {w.lastLoginAt
                  ? `Last in ${new Date(w.lastLoginAt).toLocaleDateString("en-GB")}`
                  : "Never signed in"}
              </span>
              <button
                onClick={() => handleRemove(w.email)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
