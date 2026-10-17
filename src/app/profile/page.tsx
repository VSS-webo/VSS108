
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [campusName, setCampusName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/auth?next=%2Fprofile");
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, campus_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setDisplayName(
          data?.display_name ||
            String(user.user_metadata?.display_name ?? "")
        );
        setCampusName(data?.campus_name ?? "");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = displayName.trim();
    const campus = campusName.trim();

    if (name.length < 2 || name.length > 80) {
      setError("Your display name must be between 2 and 80 characters.");
      return;
    }

    if (campus.length > 120) {
      setError("Your campus name must be 120 characters or fewer.");
      return;
    }

    setSaving(true);

    try {
      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: name,
            campus_name: campus || null,
          },
          { onConflict: "id" }
        );

      if (saveError) throw saveError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { display_name: name },
      });

      if (metadataError) throw metadataError;

      setNotice("Your profile has been saved.");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-xl border border-[#e1e4d9] bg-white px-4 py-3 text-sm text-[#202a21] outline-none transition focus:border-[#648957] focus:ring-2 focus:ring-[#648957]/15";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] text-[#294b35]">
        <LoaderCircle className="animate-spin" size={28} />
        <span className="ml-3 text-sm">Loading your profile...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-8 text-[#202a21]">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#52644b]"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <section className="mt-8 rounded-3xl border border-[#e4e5db] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4e8] text-[#294b35]">
            <UserRound size={24} />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[2px] text-[#6e8d60]">
            YOUR IDENTITY
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#294b35]">
            Your profile
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#73796d]">
            Help fellow students recognise you when you list items and arrange
            exchanges.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-semibold">
                Account email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className={`${fieldClass} bg-[#f5f6f0] text-[#73796d]`}
              />
              <p className="mt-2 text-xs text-[#858a7d]">
                Your account email cannot be changed here.
              </p>
            </div>

            <div>
              <label htmlFor="displayName" className="text-sm font-semibold">
                Display name *
              </label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                minLength={2}
                required
                placeholder="e.g. Aarav Sharma"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="campusName" className="text-sm font-semibold">
                College or campus
              </label>
              <input
                id="campusName"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                maxLength={120}
                placeholder="e.g. ABC College"
                className={fieldClass}
              />
              <p className="mt-2 text-xs text-[#858a7d]">
                Optional. Only add the campus information you are comfortable
                sharing.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-xl border border-[#dce6d2] bg-[#eef4e8] p-3 text-sm text-[#365337]"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !userId}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3525] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={17} className="animate-spin" />}
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
