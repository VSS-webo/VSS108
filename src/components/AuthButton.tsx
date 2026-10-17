
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setSignedIn(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed:", error);
      window.alert("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <span className="text-sm text-[#7c8175]">Loading...</span>
    );
  }

  if (!signedIn) {
    return (
      <Link
        href="/auth"
        className="rounded-xl border border-[#dfe3d8] px-4 py-2.5 text-sm font-semibold text-[#294b35] transition hover:bg-[#f0f3eb]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded-xl border border-[#dfe3d8] px-4 py-2.5 text-sm font-semibold text-[#294b35] transition hover:bg-[#f0f3eb] disabled:opacity-60"
    >
      {signingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
