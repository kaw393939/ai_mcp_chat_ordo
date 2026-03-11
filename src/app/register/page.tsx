"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateLocal(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Enter a valid email address";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (password.length > 72) {
      errors.password = "Password must be at most 72 characters";
    }
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (name.trim().length > 100) {
      errors.name = "Name must be at most 100 characters";
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError("");

    const errors = validateLocal();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const body = await res.json();
        if (res.status === 409) {
          setFieldErrors({ email: "This email is already registered" });
        } else if (res.status === 400) {
          setGeneralError(body.error || "Invalid input");
        } else {
          setGeneralError(body.error || "Registration failed");
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm opacity-50">
            Sign up to get full access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {generalError && (
            <div className="px-4 py-3 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
              {generalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest opacity-60 ml-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--surface-muted)] border-theme focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-shadow ${fieldErrors.name ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="Your name"
              autoComplete="name"
            />
            {fieldErrors.name && (
              <p className="text-[10px] font-semibold text-red-500 ml-1">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest opacity-60 ml-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--surface-muted)] border-theme focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-shadow ${fieldErrors.email ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-[10px] font-semibold text-red-500 ml-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest opacity-60 ml-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--surface-muted)] border-theme focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-shadow ${fieldErrors.password ? "ring-2 ring-red-500/50" : ""}`}
              placeholder="8+ characters"
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="text-[10px] font-semibold text-red-500 ml-1">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs opacity-50">
          Already have an account?{" "}
          <Link href="/login" className="font-bold opacity-100 text-[var(--accent-color)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
