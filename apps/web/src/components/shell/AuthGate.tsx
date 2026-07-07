"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface AuthState {
  auth_enabled: boolean;
  user: string | null;
}

/** Full-screen login overlay, shown ONLY when the backend auth flag is on and
 *  there is no session. With auth off (default local demo) it renders nothing.
 *  On login we hard-reload so the WebSocket reconnects with the cookie. */
export function AuthGate() {
  const [state, setState] = useState<AuthState | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: AuthState | null) => !cancelled && setState(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // auth off, still checking, or already signed in — nothing to gate
  if (!state || !state.auth_enabled || state.user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("bad credentials");
      window.location.reload(); // re-establish the WS with the session cookie
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-hairline bg-chrome p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong font-display text-lg font-bold text-cream">
            T
          </div>
          <div>
            <div className="font-display text-[15px] font-semibold text-text">
              TwinOps <span className="text-accent">AI</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-faint">
              <Lock className="size-3" aria-hidden /> Sign in to continue
            </div>
          </div>
        </div>

        <label className="mb-1 block text-xs text-muted" htmlFor="auth-user">
          Username
        </label>
        <input
          id="auth-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mb-3 h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-text outline-none placeholder:text-faint"
        />

        <label className="mb-1 block text-xs text-muted" htmlFor="auth-pass">
          Password
        </label>
        <input
          id="auth-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-text outline-none placeholder:text-faint"
        />

        {error && (
          <p className="mb-3 text-xs text-critical" role="alert">
            Invalid credentials — try again.
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="h-10 w-full rounded-xl bg-accent text-sm font-medium text-cream transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
