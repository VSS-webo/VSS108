
"use client";

import { Suspense, FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, Recycle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";


function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}


function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
          },
        });

        if (authError) throw authError;

        if (data.session) {
        const nextPath = getSafeNextPath(searchParams.get("next"));

        router.replace(nextPath);
        router.refresh();
        return;
        }

        setMessage(
          "Account created. Check your email for a confirmation link, then sign in."
        );
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        const nextPath = getSafeNextPath(searchParams.get("next"));

        router.replace(nextPath);
        router.refresh();
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-8 text-[#202a21]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#52644b]"
        >
          <ArrowLeft size={17} />
          Back to marketplace
        </Link>

        <div className="grid min-h-[78vh] items-center gap-12 py-10 lg:grid-cols-2">
          <section className="hidden rounded-[32px] bg-[#294b35] p-12 text-white lg:block">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#d7e7bd]">
              <Recycle size={26} />
            </div>

            <p className="mt-12 text-xs font-bold uppercase tracking-[2px] text-[#c9dfae]">
              Your campus, connected
            </p>

            <h1 className="mt-5 max-w-md text-5xl font-semibold leading-[1.1] tracking-[-2px]">
              Good things
              <br />
              go around.
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-white/70">
              Find useful things, pass on what you no longer need, and help
              your campus get more from the things it already has.
            </p>

            <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-6 text-sm text-white/75">
              <ShieldCheck size={19} className="text-[#c9dfae]" />
              Account-based access to your listings and exchanges
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9] lg:hidden">
              <Recycle size={25} />
            </div>

            <p className="text-xs font-bold uppercase tracking-[2px] text-[#6e8d60]">
              Welcome to LoopCampus
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-1.2px]">
              {mode === "signup" ? "Join the loop." : "Welcome back."}
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#7c8175]">
              {mode === "signup"
                ? "Create an account to list items and connect with other students."
                : "Sign in to manage your listings and exchange requests."}
            </p>

            <div className="mt-7 grid grid-cols-2 rounded-xl bg-[#efefe8] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className={`rounded-lg py-3 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-[#294b35] shadow-sm"
                    : "text-[#7a7e72]"
                }`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setMessage("");
                }}
                className={`rounded-lg py-3 text-sm font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-[#294b35] shadow-sm"
                    : "text-[#7a7e72]"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Display name
                  </label>
                  <input
                    id="name"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we call you?"
                    className="w-full rounded-xl border border-[#e1e2d9] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#78966a] focus:ring-4 focus:ring-[#78966a]/10"
                  />
                </div>
              )}

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

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
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
                {busy
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create my account"
                    : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[#858a7d]">
              By continuing, use LoopCampus responsibly and arrange
              exchanges safely in public campus locations.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p>Loading authentication...</p>
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
