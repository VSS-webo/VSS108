
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Recycle,
  House,
  LayoutDashboard,
  MessageCircle,
  PlusCircle,
  UserRound,
  Menu,
  X,
  Sun,
  Moon,
  LogIn,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthButton from "@/components/AuthButton";

const navigation = [
  { label: "Marketplace", href: "/", icon: House, protected: false },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, protected: true },
  { label: "Messages", href: "/messages", icon: MessageCircle, protected: true },
  { label: "List an item", href: "/listings/new", icon: PlusCircle, protected: true },
  { label: "My profile", href: "/profile", icon: UserRound, protected: true },
];

function NavbarContent() {
  const pathname = usePathname();

  const [signedIn, setSignedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<{
    label: string;
    href: string;
  } | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("loopcampus-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const enabled = savedTheme
      ? savedTheme === "dark"
      : prefersDark;

    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
    document.documentElement.style.colorScheme = enabled ? "dark" : "light";
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      setSignedIn(!error && !!data.user);
      setAuthLoading(false);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(!!session?.user);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAuthPrompt(null);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAuthPrompt(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem("loopcampus-theme", next ? "dark" : "light");
  }

  function navigate(item: (typeof navigation)[number]) {
    setMobileOpen(false);

    if (item.protected && !authLoading && !signedIn) {
      setAuthPrompt({ label: item.label, href: item.href });
    }
  }

  function active(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function navClass(href: string) {
    return [
      "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
      active(href)
        ? "bg-[#eaf0e3] text-[#294b35] dark:bg-[#304c39] dark:text-[#e5efc9]"
        : "text-[#687264] hover:bg-[#f0f3eb] hover:text-[#294b35] dark:text-[#c2cbbd] dark:hover:bg-[#29372d] dark:hover:text-white",
    ].join(" ");
  }

  function ThemeButton() {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Light mode" : "Dark mode"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe3d8] text-[#294b35] transition hover:bg-[#f0f3eb] dark:border-[#3a483d] dark:text-[#e5efc9] dark:hover:bg-[#29372d]"
      >
        {darkMode ? <Sun size={19} /> : <Moon size={19} />}
      </button>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#e5e7de] bg-[#faf9f6]/95 text-[#202a21] shadow-sm backdrop-blur-md dark:border-[#303b32] dark:bg-[#171e19]/95 dark:text-[#edf1e9]">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9] transition group-hover:rotate-[-5deg]">
              <Recycle size={23} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              loop<span className="text-[#648957]">campus</span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 xl:flex"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const locked = item.protected && !authLoading && !signedIn;

              return locked ? (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item)}
                  title={`Sign in to access ${item.label}`}
                  className={navClass(item.href)}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={navClass(item.href)}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <ThemeButton />
            <AuthButton />
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <ThemeButton />
            <AuthButton />
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe3d8] text-[#294b35] dark:border-[#3a483d] dark:text-[#e5efc9]"
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-[#e5e7de] bg-[#faf9f6] px-4 py-3 dark:border-[#303b32] dark:bg-[#171e19] xl:hidden"
          >
            <nav
              aria-label="Mobile navigation"
              className="mx-auto flex max-w-7xl flex-col gap-1"
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                const locked = item.protected && !authLoading && !signedIn;

                return locked ? (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item)}
                    className={[
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
                      active(item.href)
                        ? "bg-[#eaf0e3] text-[#294b35] dark:bg-[#304c39] dark:text-[#e5efc9]"
                        : "text-[#687264] hover:bg-[#f0f3eb] dark:text-[#c2cbbd] dark:hover:bg-[#29372d]",
                    ].join(" ")}
                  >
                    <Icon size={19} />
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active(item.href) ? "page" : undefined}
                    className={[
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                      active(item.href)
                        ? "bg-[#eaf0e3] text-[#294b35] dark:bg-[#304c39] dark:text-[#e5efc9]"
                        : "text-[#687264] hover:bg-[#f0f3eb] dark:text-[#c2cbbd] dark:hover:bg-[#29372d]",
                    ].join(" ")}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {authPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAuthPrompt(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-prompt-title"
            className="relative w-full max-w-md rounded-3xl border border-[#e5e7de] bg-[#faf9f6] p-7 text-[#202a21] shadow-2xl dark:border-[#354339] dark:bg-[#1d2820] dark:text-[#edf1e9] sm:p-8"
          >
            <button
              type="button"
              onClick={() => setAuthPrompt(null)}
              aria-label="Close sign-in prompt"
              className="absolute right-4 top-4 rounded-lg p-2 text-[#687264] hover:bg-[#eaf0e3] dark:text-[#c2cbbd] dark:hover:bg-[#304c39]"
            >
              <X size={18} />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0e3] text-[#294b35] dark:bg-[#304c39] dark:text-[#e5efc9]">
              <LogIn size={23} />
            </div>

            <h2
              id="signin-prompt-title"
              className="mt-5 text-2xl font-semibold tracking-tight"
            >
              Sign in to continue
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#687264] dark:text-[#c2cbbd]">
              Please sign in to access {authPrompt.label.toLowerCase()} and
              connect with your campus community.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/auth?next=${encodeURIComponent(authPrompt.href)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#294b35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3525]"
              >
                <LogIn size={17} />
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => setAuthPrompt(null)}
                className="rounded-xl border border-[#dfe3d8] px-5 py-3 text-sm font-semibold text-[#40533b] transition hover:bg-[#f0f3eb] dark:border-[#3a483d] dark:text-[#e5efc9] dark:hover:bg-[#29372d]"
              >
                Maybe later
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export default function Navbar() {
  return (
    <Suspense
      fallback={
        <div className="h-16" aria-hidden="true" />
      }
    >
      <NavbarContent />
    </Suspense>
  );
}