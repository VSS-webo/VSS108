
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Heart,
  Leaf,
  LoaderCircle,
  Plus,
  Recycle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Tag,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  is_free: boolean;
  image_urls: string[];
  status: "available" | "reserved" | "completed";
  created_at: string;
};

const CATEGORIES = [
  "All items",
  "Books",
  "Electronics",
  "Lab Equipment",
  "Stationery",
  "Furniture",
  "Other",
];

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  "All items": Compass,
  Books: BookOpen,
  Electronics: Sparkles,
  "Lab Equipment": SlidersHorizontal,
  Stationery: Tag,
  Furniture: Sprout,
  Other: Recycle,
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function timeAgo(date: string) {
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / 86_400_000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All items");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const [
          { data, error: listingError },
          { data: authData },
        ] = await Promise.all([
          supabase
            .from("listings")
            .select(
              "id, owner_id, title, description, category, condition, price, is_free, image_urls, status, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(100),
          supabase.auth.getUser(),
        ]);

        if (listingError) throw listingError;
        if (!active) return;

        setListings((data ?? []) as Listing[]);
        setUserId(authData.user?.id ?? null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load the marketplace."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const visibleListings = useMemo(() => {
    let result = listings.filter((item) => {
      const text = `${item.title} ${item.description} ${item.category} ${item.condition}`
        .toLowerCase();

      return (
        item.status !== "completed" &&
        (category === "All items" || item.category === category) &&
        text.includes(query.trim().toLowerCase()) &&
        (!freeOnly || item.is_free || Number(item.price) === 0)
      );
    });

    if (sort === "price-low") {
      result = [...result].sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
    } else if (sort === "price-high") {
      result = [...result].sort(
        (a, b) => Number(b.price) - Number(a.price)
      );
    } else {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [listings, category, query, sort, freeOnly]);

  const availableCount = listings.filter(
    (item) => item.status === "available"
  ).length;

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202a21]">
      {/* Announcement strip */}
      <div className="flex items-center justify-center gap-2 bg-[#233e2d] px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        <Leaf size={14} />
        <span>A better campus starts with what we reuse.</span>
        <span className="hidden text-white/50 sm:inline">·</span>
        <span className="hidden text-[#d6e5b6] sm:inline">
          Give good things another life.
        </span>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#e9e9e0] bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9]">
              <Recycle size={22} strokeWidth={2.1} />
            </div>
            <div>
              <div className="text-[20px] font-bold tracking-[-1px]">
                loop<span className="text-[#5b8550]">campus</span>
              </div>
              <div className="-mt-0.5 text-[9px] font-semibold uppercase tracking-[2.3px] text-[#888c7e]">
                Reuse. Reconnect. Repeat.
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#777d70] md:flex">
            <a href="#marketplace" className="text-[#294b35]">
              Marketplace
            </a>
            <a
              href="#impact"
              className="transition hover:text-[#294b35]"
            >
              Our impact
            </a>
            <a
              href="#how-it-works"
              className="transition hover:text-[#294b35]"
            >
              How it works
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="/auth"
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#294b35] transition hover:bg-[#edf0e7] sm:inline-flex"
            >
              Sign in
            </a>
            <a
              href="/listings/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#294b35] px-4 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1d3525] sm:px-5 sm:text-sm"
            >
              <Plus size={16} />
              <span>List an item</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#e8e9df]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full bg-[#e8edda] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[32%] h-[300px] w-[300px] rounded-full bg-[#e6eee1] opacity-60 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-12 lg:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dce4d0] bg-white/80 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#52734a]">
              <span className="h-2 w-2 rounded-full bg-[#79a363]" />
              The campus circular economy
            </div>

            <h1 className="max-w-[720px] text-[46px] font-semibold leading-[1.04] tracking-[-2.8px] sm:text-[64px] lg:text-[76px]">
              Good things
              <br />
              deserve a{" "}
              <span className="font-serif font-normal italic text-[#648957]">
                second life.
              </span>
            </h1>

            <p className="mt-6 max-w-[480px] text-[15px] leading-7 text-[#73786c] sm:text-base sm:leading-8">
              Your next semester essential might already be on campus.
              Find pre-loved books, useful gear, and little things that make
              student life better.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#marketplace"
                className="inline-flex items-center gap-3 rounded-full bg-[#294b35] px-6 py-4 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(41,75,53,0.15)] transition hover:-translate-y-0.5 hover:bg-[#1d3525]"
              >
                Explore the marketplace
                <ArrowRight size={17} />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-[#dedfd5] bg-white/70 px-5 py-4 text-sm font-semibold text-[#424c3e] transition hover:bg-white"
              >
                How it works
                <ArrowDownRight size={17} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-[#e5e6dd] pt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-[#777d70]">
                <ShieldCheck size={16} className="text-[#628358]" />
                Campus-first community
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#777d70]">
                <Recycle size={16} className="text-[#628358]" />
                Less waste, more value
              </div>
            </div>
          </div>

          {/* Editorial hero artwork, rendered entirely with CSS */}
          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="relative aspect-[0.98] overflow-hidden rounded-[34px] bg-[#e6e9db] p-5 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_25%,#f8f3df_0%,transparent_47%),linear-gradient(145deg,#dce6d0,#e9e7d8_65%,#d1deca)]" />

              <div className="absolute left-[10%] top-[10%] h-[78%] w-[70%] rotate-[-8deg] rounded-[20px] bg-[#c5d0b9] shadow-xl" />

              <div className="absolute left-[17%] top-[9%] flex h-[76%] w-[66%] rotate-[-3deg] flex-col overflow-hidden rounded-[18px] bg-[#f8f4e8] shadow-[0_20px_50px_rgba(46,59,40,0.2)]">
                <div className="flex h-8 items-center justify-between border-b border-[#d8d8c7] px-4">
                  <span className="text-[8px] font-bold uppercase tracking-[2px] text-[#829076]">
                    Field notes · 01
                  </span>
                  <Leaf size={13} className="text-[#6e875e]" />
                </div>
                <div className="flex flex-1 flex-col justify-center px-5 sm:px-8">
                  <div className="mb-3 h-1 w-9 bg-[#91a47c]" />
                  <div className="font-serif text-[34px] leading-[1.04] tracking-[-1px] text-[#2b4631] sm:text-[46px]">
                    Keep
                    <br />
                    good things
                    <br />
                    <span className="italic text-[#78916a]">going.</span>
                  </div>
                  <p className="mt-5 max-w-[180px] text-[10px] leading-5 text-[#7b806f] sm:text-xs">
                    A little less waste.
                    <br />
                    A little more possibility.
                  </p>
                  <div className="mt-6 flex h-24 items-end gap-1.5 sm:h-28">
                    <div className="h-[42%] flex-1 rounded-t-full bg-[#bdcda8]" />
                    <div className="h-[70%] flex-1 rounded-t-full bg-[#8fa87a]" />
                    <div className="h-[56%] flex-1 rounded-t-full bg-[#b0c39c]" />
                    <div className="h-[94%] flex-1 rounded-t-full bg-[#69865d]" />
                    <div className="h-[66%] flex-1 rounded-t-full bg-[#9db58a]" />
                    <div className="h-[82%] flex-1 rounded-t-full bg-[#829d70]" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[9%] right-[6%] flex rotate-[5deg] items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_10px_35px_rgba(42,58,40,0.13)] sm:p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8efdf] text-[#53754a]">
                  <Sprout size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#304332]">
                    Small swaps.
                  </div>
                  <div className="text-[10px] text-[#858a7b]">
                    A brighter tomorrow.
                  </div>
                </div>
              </div>

              <div className="absolute right-[8%] top-[9%] flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#f8f4e6]/90 text-[#67865a] shadow-sm sm:h-14 sm:w-14">
                <Sparkles size={23} />
              </div>
            </div>

            <div className="absolute -left-3 top-[35%] flex items-center gap-2 rounded-full border border-[#e5e5da] bg-white px-3.5 py-2.5 shadow-lg sm:-left-7 sm:px-4">
              <CheckCircle2 size={17} className="text-[#6e925d]" />
              <span className="text-xs font-semibold text-[#40513b]">
                Made for campus life
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section
        id="marketplace"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#779166]">
              <span className="h-px w-7 bg-[#779166]" />
              The good finds
            </div>
            <h2 className="text-3xl font-semibold tracking-[-1.5px] sm:text-[42px]">
              Find your next <span className="font-serif italic text-[#648957]">favourite.</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#808477]">
              Useful things, looking for a new home.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#858a7d]">
            <span className="flex h-2 w-2 rounded-full bg-[#82a56c]" />
            {loading
              ? "Finding campus essentials..."
              : `${availableCount} available ${
                  availableCount === 1 ? "item" : "items"
                }`}
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#e5e5db] bg-white px-4 py-3.5 transition focus-within:border-[#90a782] focus-within:ring-4 focus-within:ring-[#8ca57a]/10">
            <Search size={19} className="shrink-0 text-[#7e8977]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books, calculators, lab essentials..."
              aria-label="Search listings"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#263629] outline-none placeholder:text-[#a0a297]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded-full p-1 text-[#858a7d] hover:bg-[#f1f2eb]"
              >
                <X size={15} />
              </button>
            )}
            <kbd className="hidden rounded-lg border border-[#e7e7df] bg-[#faf9f6] px-2 py-1 text-[10px] text-[#93968b] sm:block">
              SEARCH
            </kbd>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition ${
              showFilters || freeOnly
                ? "border-[#b8c9aa] bg-[#edf2e7] text-[#365337]"
                : "border-[#e5e5db] bg-white text-[#62695c] hover:bg-[#f3f3ed]"
            }`}
          >
            <SlidersHorizontal size={17} />
            Filters
            <ChevronDown
              size={15}
              className={`transition ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          <label className="flex items-center gap-2 rounded-2xl border border-[#e5e5db] bg-white px-4 py-3.5 text-sm text-[#656b60]">
            <ArrowUpDown size={16} className="text-[#83917a]" />
            <span className="whitespace-nowrap">Sort by</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort listings"
              className="min-w-0 flex-1 cursor-pointer bg-transparent font-semibold text-[#344535] outline-none"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e5e5db] bg-white p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#525b4c]">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
                className="h-4 w-4 accent-[#456d42]"
              />
              Free items only
            </label>
            {(freeOnly || category !== "All items") && (
              <button
                onClick={() => {
                  setFreeOnly(false);
                  setCategory("All items");
                }}
                className="text-xs font-semibold text-[#638557] underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Category chips */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((name) => {
            const Icon = CATEGORY_ICONS[name];
            const selected = category === name;

            return (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  selected
                    ? "border-[#294b35] bg-[#294b35] text-white"
                    : "border-[#e5e5dc] bg-white text-[#73796c] hover:border-[#b8c9aa] hover:text-[#365337]"
                }`}
              >
                <Icon size={15} />
                {name}
              </button>
            );
          })}
        </div>

        {/* Listing grid */}
        <div className="mt-8">
          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
              <p className="font-semibold text-red-800">
                We couldn't load the marketplace.
              </p>
              <p className="mt-2 break-words text-sm text-red-700">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full bg-[#294b35] px-5 py-3 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-[#7a8673]">
              <LoaderCircle size={28} className="animate-spin" />
              <p className="text-sm">Finding good things for you...</p>
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d9ddcf] bg-white/70 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf0e3] text-[#628357]">
                <Search size={25} />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {listings.length === 0
                  ? "Your campus marketplace starts here."
                  : "Nothing found this time."}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#858a7d]">
                {listings.length === 0
                  ? "Be the first to give a useful item a second life. List something you no longer need."
                  : "Try a different search or category. Your next great find might be one filter away."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a
                  href="/listings/new"
                  className="inline-flex items-center gap-2 rounded-full bg-[#294b35] px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  List an item
                </a>
                {(query || category !== "All items" || freeOnly) && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("All items");
                      setFreeOnly(false);
                    }}
                    className="rounded-full border border-[#e2e3d9] px-5 py-3 text-sm font-semibold text-[#475443]"
                  >
                    Reset search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-[#858a7d]">
                  Showing{" "}
                  <span className="font-semibold text-[#3e4b3b]">
                    {visibleListings.length}
                  </span>{" "}
                  {visibleListings.length === 1 ? "find" : "finds"}
                </p>
                <span className="hidden items-center gap-1.5 text-xs text-[#858a7d] sm:flex">
                  <ShieldCheck size={14} />
                  Browse before you buy new
                </span>
              </div>

              <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleListings.map((item) => (
                  <article key={item.id} className="group min-w-0">
                    <a
                      href={`/listings/${item.id}`}
                      className="relative block aspect-[4/3] overflow-hidden rounded-[22px] border border-[#e8e8df] bg-[#eeeee6]"
                    >
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_35%,#f9f7ec,#e5e9dc)] text-[#83947a]">
                          <BookOpen size={37} strokeWidth={1.2} />
                          <span className="text-[10px] font-semibold uppercase tracking-[2px]">
                            Ready for a new home
                          </span>
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#4d6245] shadow-sm">
                        {item.category}
                      </span>

                      <button
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setFavorites((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id]
                          );
                        }}
                        aria-label={
                          favorites.includes(item.id)
                            ? "Remove from favourites"
                            : "Add to favourites"
                        }
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 text-[#66715e] shadow-sm transition hover:scale-105"
                      >
                        <Heart
                          size={16}
                          className={
                            favorites.includes(item.id)
                              ? "fill-[#d66b66] text-[#d66b66]"
                              : ""
                          }
                        />
                      </button>

                      {item.status === "reserved" && (
                        <span className="absolute bottom-3 left-3 rounded-full bg-[#f7e8cb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#805b22]">
                          Reserved
                        </span>
                      )}
                    </a>

                    <div className="px-1 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={`/listings/${item.id}`}
                          className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.3px] transition hover:text-[#628357]"
                        >
                          {item.title}
                        </a>
                        <span className="shrink-0 text-sm font-bold text-[#34553a]">
                          {item.is_free || Number(item.price) === 0
                            ? "Free"
                            : money(Number(item.price))}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#85897d]">
                        {item.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e8df] pt-3">
                        <span className="rounded-lg bg-[#eff0e8] px-2.5 py-1.5 text-[10px] font-semibold text-[#687360]">
                          {item.condition}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#96998e]">
                          <Clock3 size={12} />
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="/listings/new"
            className="inline-flex items-center gap-2 rounded-full border border-[#dfe2d7] bg-white px-6 py-3.5 text-sm font-semibold text-[#40533b] transition hover:border-[#b5c7a8] hover:bg-[#f1f4ec]"
          >
            Have something to pass on?
            <span className="font-bold text-[#6a8b5b]">List it free</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Sustainability message */}
      <section id="impact" className="scroll-mt-24 px-5 pb-14 sm:px-8 sm:pb-20 lg:px-12">
        <div className="mx-auto grid max-w-[1344px] overflow-hidden rounded-[30px] bg-[#294b35] text-white md:grid-cols-[1fr_0.75fr]">
          <div className="relative overflow-hidden px-7 py-10 sm:px-12 sm:py-14">
            <div className="pointer-events-none absolute -left-10 -top-16 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -left-1 top-0 h-48 w-48 rounded-full border border-white/10" />

            <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-[#c9dfae]">
              <Sprout size={16} />
              Small changes. Lasting impact.
            </div>

            <h2 className="relative mt-6 max-w-xl text-3xl font-semibold leading-tight tracking-[-1.5px] sm:text-[43px]">
              The most sustainable thing
              <br className="hidden sm:block" />
              <span className="font-serif font-normal italic text-[#c9dfae]">
                might already exist.
              </span>
            </h2>

            <p className="relative mt-5 max-w-lg text-sm leading-7 text-white/70">
              When we pass things on instead of throwing them away, we help
              useful resources go further. Start with one item. Let the
              good keep going.
            </p>

            <a
              href="/listings/new"
              className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-[#e5edcf] px-5 py-3.5 text-sm font-semibold text-[#294b35] transition hover:bg-white"
            >
              Start a little loop
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="relative flex min-h-64 flex-col justify-center border-t border-white/10 bg-white/[0.035] px-7 py-10 sm:px-12 md:border-l md:border-t-0">
            <div className="absolute right-8 top-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#c9dfae]">
              <Recycle size={24} />
            </div>

            <div className="text-[10px] font-bold uppercase tracking-[2px] text-white/55">
              Your campus, in motion
            </div>

            <div className="mt-5 text-6xl font-semibold tracking-[-3px]">
              {loading ? "—" : listings.length}
            </div>
            <div className="mt-2 text-sm text-white/65">
              listings discovered in our marketplace
            </div>

            <div className="my-6 h-px bg-white/15" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#c9dfae]">
                <Leaf size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Every item has potential.
                </div>
                <div className="mt-1 text-xs text-white/55">
                  Explore. Exchange. Extend its life.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-t border-[#e8e8df] bg-[#f4f3ed] px-5 py-14 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#78916a]">
              A better kind of campus exchange
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-1.5px] sm:text-[42px]">
              Three steps. A smaller footprint.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Find the good stuff",
                description:
                  "Discover pre-loved essentials by category, condition, and price.",
                icon: Search,
              },
              {
                number: "02",
                title: "Connect on campus",
                description:
                  "Send an exchange request and coordinate a convenient handover.",
                icon: Heart,
              },
              {
                number: "03",
                title: "Keep it in the loop",
                description:
                  "Complete the exchange and help a useful item find its next home.",
                icon: Recycle,
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="rounded-[24px] border border-[#e4e5da] bg-[#faf9f6] p-7 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-3xl italic text-[#94a58a]">
                      {step.number}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8eddf] text-[#54744a]">
                      <Icon size={21} />
                    </div>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#828679]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5db] bg-[#faf9f6]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a href="/" className="flex items-center gap-2">
            <Recycle size={19} className="text-[#628357]" />
            <span className="text-sm font-bold tracking-tight">
              loopcampus
            </span>
            <span className="ml-1 text-xs text-[#96998e]">
              · Good things go around.
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[#858a7d]">
            <a href="#marketplace" className="hover:text-[#294b35]">
              Marketplace
            </a>
            <a href="#impact" className="hover:text-[#294b35]">
              Our impact
            </a>
            <a href="#how-it-works" className="hover:text-[#294b35]">
              How it works
            </a>
          </div>

          <span className="text-[10px] text-[#9a9c92]">
            Built for a more circular campus.
          </span>
        </div>
      </footer>
    </main>
  );
}
