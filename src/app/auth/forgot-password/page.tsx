
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, Recycle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const supabase = createClient();
      const next = searchParams.get("next");
      const safeNext =
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";

      const redirectUrl = new URL(
        "/auth/reset-password",
        window.location.origin
      );
      redirectUrl.searchParams.set("next", safeNext);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: redirectUrl.toString() }
      );

      if (error) throw error;

      setMessage(
        "If an account exists for that email, a password-reset link will be sent. Please check your inbox and spam folder."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send the reset email. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-5 py-10 text-[#202a21]">
      <section className="w-full max-w-md rounded-3xl border border-[#e4e5db] bg-white p-7 shadow-sm sm:p-9">
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#52644b] hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9]">
          <Recycle size={25} />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[2px] text-[#6e8d60]">
          LoopCampus account recovery
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Forgot password?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#73796d]">
          Enter the email address associated with your account. We’ll send
          you a link to choose a new password.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#e1e2d9] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#78966a] focus:ring-4 focus:ring-[#78966a]/10"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl border border-[#dce6d2] bg-[#eef4e8] p-3 text-sm leading-6 text-[#365337]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#294b35] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1d3525] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <LoaderCircle size={17} className="animate-spin" />}
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </section>
    </main>
  );
}
