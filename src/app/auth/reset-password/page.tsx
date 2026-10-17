
"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Recycle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setError(
          "This reset link is invalid or expired. Please request a new one."
        );
      } else {
        setReady(true);
      }
    }

    void checkRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage("Your password has been updated successfully.");

      const next = searchParams.get("next");
      const safeNext =
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";

      window.setTimeout(() => {
        router.replace(
          `/auth?next=${encodeURIComponent(safeNext)}`
        );
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update your password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-5 py-10 text-[#202a21]">
      <section className="w-full max-w-md rounded-3xl border border-[#e4e5db] bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9]">
          <Recycle size={25} />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[2px] text-[#6e8d60]">
          LoopCampus account recovery
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#73796d]">
          Choose a new password with at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#e1e2d9] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#78966a] focus:ring-4 focus:ring-[#78966a]/10"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            disabled={busy || !ready || !!message}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#294b35] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1d3525] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <LoaderCircle size={17} className="animate-spin" />}
            {busy
              ? "Updating..."
              : ready
                ? "Update password"
                : "Checking reset link..."}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#73796d]">
          Remembered it?{" "}
          <Link
            href="/auth"
            className="font-semibold text-[#648957] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-500">
            Loading password reset...
          </p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}