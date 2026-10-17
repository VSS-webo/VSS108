
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  XCircle,
  UserRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthButton from "@/components/AuthButton";

type Listing = {
  id: string;
  owner_id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  is_free: boolean;
  image_urls: string[] | null;
  status: string;
  created_at: string;
};

type ExchangeRequest = {
  id: string;
  listing_id: string;
  requester_id: string;
  message: string;
  status: string;
  created_at: string;
  seller_completed_at: string | null;
  requester_completed_at: string | null;
};

type Tab = "overview" | "listings" | "incoming" | "sent";

const labels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
  available: "Available",
  reserved: "Reserved",
};

function formatPrice(listing: Listing) {
  if (listing.is_free || Number(listing.price) === 0) return "Free";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(listing.price));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [incoming, setIncoming] = useState<ExchangeRequest[]>([]);
  const [sent, setSent] = useState<ExchangeRequest[]>([]);
  const [allListings, setAllListings] = useState<Record<string, Listing>>({});
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setUserId(null);
        setListings([]);
        setIncoming([]);
        setSent([]);
        setAllListings({});
        return;
      }

      setUserId(user.id);

      const { data: owned, error: listingError } = await supabase
        .from("listings")
        .select(
          "id, owner_id, title, category, condition, price, is_free, image_urls, status, created_at"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (listingError) throw listingError;

      const myListings = (owned ?? []) as Listing[];
      setListings(myListings);

      const { data: outgoingData, error: outgoingError } = await supabase
        .from("exchange_requests")
        .select(
          "id, listing_id, requester_id, message, status, created_at, seller_completed_at, requester_completed_at"
        )
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (outgoingError) throw outgoingError;

      const mySent = (outgoingData ?? []) as ExchangeRequest[];
      setSent(mySent);

      let myIncoming: ExchangeRequest[] = [];

      if (myListings.length > 0) {
        const { data: incomingData, error: incomingError } = await supabase
          .from("exchange_requests")
          .select(
            "id, listing_id, requester_id, message, status, created_at, seller_completed_at, requester_completed_at"
          )
          .in("listing_id", myListings.map((item) => item.id))
          .order("created_at", { ascending: false });

        if (incomingError) throw incomingError;

        myIncoming = (incomingData ?? []) as ExchangeRequest[];
      }

      setIncoming(myIncoming);

      const ids = [
        ...new Set([
          ...myListings.map((item) => item.id),
          ...mySent.map((item) => item.listing_id),
        ]),
      ];

      let listingMap: Record<string, Listing> = {};

      if (ids.length > 0) {
        const { data: related, error: relatedError } = await supabase
          .from("listings")
          .select(
            "id, owner_id, title, category, condition, price, is_free, image_urls, status, created_at"
          )
          .in("id", ids);

        if (relatedError) throw relatedError;

        for (const item of (related ?? []) as Listing[]) {
          listingMap[item.id] = item;
        }
      }

      setAllListings(listingMap);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);



  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(
    request: ExchangeRequest,
    action:
      | "accept_exchange_request"
      | "decline_exchange_request"
      | "confirm_exchange_completion"
  ) {
    setBusyId(request.id);
    setError("");
    setNotice("");

    try {
      const { data, error: rpcError } = await supabase.rpc(action, {
        p_request_id: request.id,
      });

      if (rpcError) throw rpcError;

      if (data && typeof data === "object" && "error" in data) {
        throw new Error(String(data.error));
      }

      setNotice(
        action === "accept_exchange_request"
          ? "Request accepted and listing reserved."
          : action === "decline_exchange_request"
            ? "Request declined."
            : "Your confirmation has been recorded."
      );

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete that action."
      );
    } finally {
      setBusyId(null);
    }
  }

  const pendingIncoming = incoming.filter((r) => r.status === "pending").length;
  const activeSent = sent.filter(
    (r) => r.status === "pending" || r.status === "accepted"
  ).length;
  const completed = [...incoming, ...sent].filter(
    (r) => r.status === "completed"
  ).length;

  const button =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#294b35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#365e42] disabled:opacity-50";
  const outlineButton =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e1e4d9] bg-white px-4 py-2 text-sm font-semibold text-[#43513f] transition hover:bg-[#f5f6f0] disabled:opacity-50";

  function renderRequest(request: ExchangeRequest, isIncoming: boolean) {
    const listing = allListings[request.listing_id];

    return (
      <article
        key={request.id}
        className="rounded-2xl border border-[#e4e5db] bg-white p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#f0f2e9] sm:w-28">
            {listing?.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.image_urls[0]}
                alt={listing.title}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[#78916b]">
                <Package size={30} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eff2e8] px-3 py-1 text-xs font-semibold text-[#46643c]">
                {labels[request.status] ?? request.status}
              </span>
              <span className="text-xs text-[#858a7d]">
                {formatDate(request.created_at)}
              </span>
            </div>

            <h3 className="mt-2 break-words font-semibold text-[#294b35]">
              {listing?.title ?? "Listing unavailable"}
            </h3>

            {listing && (
              <p className="mt-1 text-sm text-[#73796d]">
                {formatPrice(listing)}
                {" · "}
                {listing.category}
              </p>
            )}

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#73796d]">
              {request.message}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {listing && (
                <Link
                  href={`/listings/${listing.id}`}
                  className={outlineButton}
                >
                  View item <ArrowRight size={15} />
                </Link>
              )}

              {isIncoming &&
                request.status === "pending" &&
                listing?.status === "available" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() =>
                        void runAction(request, "accept_exchange_request")
                      }
                      className={button}
                    >
                      {busyId === request.id ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() =>
                        void runAction(request, "decline_exchange_request")
                      }
                      className={outlineButton}
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </>
                )}

              {request.status === "accepted" &&
                (isIncoming
                  ? !request.seller_completed_at
                  : !request.requester_completed_at) && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() =>
                      void runAction(request, "confirm_exchange_completion")
                    }
                    className={button}
                  >
                    {busyId === request.id ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    {isIncoming
                      ? "Confirm handover"
                      : "Confirm item received"}
                  </button>
                )}

              {request.status === "accepted" &&
                (isIncoming
                  ? request.seller_completed_at
                  : request.requester_completed_at) && (
                  <span className="inline-flex items-center gap-2 text-sm text-[#56754b]">
                    <CheckCircle2 size={16} />
                    Your confirmation is recorded
                  </span>
                )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  function renderListing(listing: Listing) {
    return (
      <article
        key={listing.id}
        className="overflow-hidden rounded-2xl border border-[#e4e5db] bg-white"
      >
        <Link href={`/listings/${listing.id}`} className="block">
          <div className="flex h-44 items-center justify-center bg-[#f0f2e9]">
            {listing.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.image_urls[0]}
                alt={listing.title}
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <Package size={42} className="text-[#78916b]" />
            )}
          </div>
          <div className="p-4">
            <span className="text-xs text-[#7d8873]">{listing.category}</span>
            <h3 className="mt-1 line-clamp-2 font-semibold text-[#294b35]">
              {listing.title}
            </h3>
            <p className="mt-2 text-lg font-semibold text-[#294b35]">
              {formatPrice(listing)}
            </p>
            <span className="mt-3 inline-flex rounded-full bg-[#eff2e8] px-3 py-1 text-xs font-semibold text-[#46643c]">
              {labels[listing.status] ?? listing.status}
            </span>
          </div>
        </Link>
      </article>
    );
  }

  function emptyState(title: string, description: string) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dfe2d7] bg-white px-5 py-12 text-center">
        <Package size={35} className="mx-auto text-[#91a286]" />
        <h3 className="mt-4 font-semibold text-[#294b35]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#73796d]">
          {description}
        </p>
        <Link href="/" className={`${button} mt-5`}>
          Explore marketplace <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] text-[#294b35]">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle size={21} className="animate-spin" />
          Loading your LoopCampus dashboard…
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-5">
        <section className="w-full max-w-md rounded-3xl border border-[#e4e5db] bg-white p-8 text-center">
          <ShoppingBag size={38} className="mx-auto text-[#648957]" />
          <h1 className="mt-4 text-2xl font-semibold text-[#294b35]">
            Your campus, your circle
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#73796d]">
            Sign in to manage your listings and track your exchanges.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/dashboard")}`}
            className={`${button} mt-6 w-full`}
          >
            Sign in <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "overview", label: "Overview", count: 0 },
    { id: "listings", label: "My listings", count: listings.length },
    { id: "incoming", label: "Incoming", count: incoming.length },
    { id: "sent", label: "Sent requests", count: sent.length },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202a21]">
      {/* <header className="border-b border-[#e8e8df] bg-white/80">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-[#294b35]">
            loop<span className="text-[#648957]">campus</span>
          </Link>
          <Link href="/" className={outlineButton}>
            <ShoppingBag size={16} /> Marketplace
          </Link>
        </div>
      </header> */}

      {/* <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[#648957]">
              YOUR LOOPCAMPUS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#294b35] sm:text-4xl">
              My dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#73796d]">
              Keep track of your items, connect with fellow students, and give
              useful things another life.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <AuthButton />
            <Link href="/listings/new">
            <Plus size={17} className="inline mr-2" />
            List an item
            </Link>
        </div>
        </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className={outlineButton}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <Link href="/listings/new" className={button}>
              <Plus size={16} /> List an item
            </Link>
          </div>
        </div> */}

        
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[#648957]">
              YOUR LOOPCAMPUS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#294b35] sm:text-4xl">
              My dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#73796d]">
              Keep track of your items, connect with fellow students, and give
              useful things another life.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AuthButton />
            <Link href="/profile" className={outlineButton}>
                <UserRound size={16} />
                My profile
            </Link>
            <Link href="/listings/new" className={button}>
              <Plus size={17} /> List an item
            </Link>
          </div>

          
        </div>



        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className={outlineButton}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <Link href="/" className={outlineButton}>
            <ShoppingBag size={16} /> Marketplace
          </Link>
        </div>


        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="mt-6 rounded-xl bg-[#edf4e8] p-4 text-sm text-[#365337]">
            {notice}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "My listings",
              value: listings.length,
              icon: Package,
            },
            {
              label: "Requests to review",
              value: pendingIncoming,
              icon: Inbox,
            },
            {
              label: "Active requests",
              value: activeSent,
              icon: Send,
            },
            {
              label: "Completed exchanges",
              value: completed,
              icon: CheckCircle2,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#e4e5db] bg-white p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs leading-5 text-[#858a7d] sm:text-sm">
                    {stat.label}
                  </span>
                  <Icon size={19} className="shrink-0 text-[#648957]" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#294b35]">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-[#e4e5db] pb-3">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === item.id
                  ? "bg-[#294b35] text-white"
                  : "text-[#6f7968] hover:bg-[#eff2e8]"
              }`}
            >
              {item.label}
              {item.id !== "overview" && (
                <span className="ml-2 opacity-75">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        <section className="mt-6">
          {tab === "overview" && (
            <div className="space-y-9">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#294b35]">
                    Requests that need attention
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab("incoming")}
                    className="text-sm font-semibold text-[#648957]"
                  >
                    View all
                  </button>
                </div>
                {incoming.filter((r) => r.status === "pending").length > 0 ? (
                  <div className="space-y-4">
                    {incoming
                      .filter((r) => r.status === "pending")
                      .slice(0, 3)
                      .map((r) => renderRequest(r, true))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e4e5db] bg-white p-5 text-sm text-[#73796d]">
                    No pending incoming requests. New requests for your items
                    will show up here.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#294b35]">
                    Recently listed by you
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab("listings")}
                    className="text-sm font-semibold text-[#648957]"
                  >
                    View all
                  </button>
                </div>
                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.slice(0, 3).map(renderListing)}
                  </div>
                ) : (
                  emptyState(
                    "Your first listing starts here",
                    "List a book, device, or useful campus item and help another student find what they need."
                  )
                )}
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold text-[#294b35]">
                  Your recent requests
                </h2>
                {sent.length > 0 ? (
                  <div className="space-y-4">
                    {sent.slice(0, 3).map((r) => renderRequest(r, false))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e4e5db] bg-white p-5 text-sm text-[#73796d]">
                    You haven’t requested an item yet. Browse the marketplace
                    to find something useful.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "listings" &&
            (listings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map(renderListing)}
              </div>
            ) : (
              emptyState(
                "Nothing listed yet",
                "Give a useful item a second life by creating your first listing."
              )
            ))}

          {tab === "incoming" &&
            (incoming.length > 0 ? (
              <div className="space-y-4">
                {incoming.map((r) => renderRequest(r, true))}
              </div>
            ) : (
              emptyState(
                "Your inbox is clear",
                "When another student requests one of your items, the request will appear here."
              )
            ))}

          {tab === "sent" &&
            (sent.length > 0 ? (
              <div className="space-y-4">
                {sent.map((r) => renderRequest(r, false))}
              </div>
            ) : (
              emptyState(
                "No requests sent yet",
                "Browse items shared by other students and send a request when you find something you need."
              )
            ))}
        </section>

        <footer className="mt-12 flex items-start gap-3 border-t border-[#e4e5db] pt-6 text-xs leading-6 text-[#858a7d]">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#648957]" />
          <p>
            For a safe exchange, arrange handovers in a public campus location.
            Confirm completion only after the item has actually changed hands.
          </p>
        </footer>
      </div>
    </main>
  );
}
