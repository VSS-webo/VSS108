
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";


type Conversation = {
  id: string;
  listing_id: string;
  seller_id: string;
  requester_id: string;
  created_at: string;
  exchange_request: {
  id: string;
  status: string;
  message: string;
  created_at: string;
}[] | null;
};


type Listing = {
  id: string;
  title: string;
  image_urls: string[] | null;
};

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
const loadInbox = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      router.replace("/auth?next=%2Fmessages");
      return;
    }

    setUserId(user.id);

    const { data, error: queryError } = await supabase
      .from("conversations")
      .select(`
        id,
        listing_id,
        seller_id,
        requester_id,
        created_at,
        exchange_request:exchange_requests!conversations_exchange_request_id_fkey (
          id,
          status,
          message,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;

    const rows = (data ?? []) as Conversation[];
    setConversations(rows);

    const listingIds = [
      ...new Set(rows.map((row) => row.listing_id)),
    ];

    if (listingIds.length === 0) {
      setListings({});
      return;
    }

    const { data: listingRows, error: listingError } =
      await supabase
        .from("listings")
        .select("id, title, image_urls")
        .in("id", listingIds);

    if (listingError) throw listingError;

    const mapped: Record<string, Listing> = {};

    for (const listing of (listingRows ?? []) as Listing[]) {
      mapped[listing.id] = listing;
    }

    setListings(mapped);
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "Could not load your conversations."
    );
  } finally {
    setLoading(false);
  }
}, [router, supabase]);


  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#686b61] hover:text-[#20231d]"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <section className="rounded-2xl border border-[#e6e5dc] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#858779]">
              LoopCampus
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#20231d]">
              Messages
            </h1>
            <p className="mt-2 text-sm text-[#686b61]">
              Your conversations about campus exchanges.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadInbox()}
            disabled={loading}
            aria-label="Refresh messages"
            className="rounded-xl border border-[#e6e5dc] p-3 text-[#34372f] disabled:opacity-50"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="my-6 border-t border-[#eeede6]" />

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-[#686b61]">
            <LoaderCircle size={18} className="animate-spin" />
            Loading your conversations...
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : conversations.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto text-[#858779]" size={32} />
            <h2 className="mt-4 font-semibold text-[#20231d]">
              No conversations yet
            </h2>
            <p className="mt-2 text-sm text-[#686b61]">
              Request an item to start talking with its owner.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-xl bg-[#315b42] px-5 py-3 text-sm font-semibold text-white"
            >
              Explore listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const listing = listings[conversation.listing_id];
              const otherStudent =
                conversation.seller_id === userId
                  ? "Item requester"
                  : "Item seller";

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-4 rounded-xl border border-[#e6e5dc] p-4 transition hover:border-[#a9bba8] hover:bg-[#fafaf6]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0f1e9]">
                    {listing?.image_urls?.[0] ? (
                      <img
                        src={listing.image_urls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MessageSquare className="text-[#52745b]" size={21} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-[#20231d]">
                      {listing?.title ?? "Campus exchange"}
                    </h2>
                    <p className="mt-1 text-sm text-[#686b61]">
                      {otherStudent}
                    </p>

                    
                    <p className="mt-1 text-xs font-medium text-[#52745b]">
                    Exchange:{" "}
                    {conversation.exchange_request?.[0]?.status
                        ? conversation.exchange_request[0].status.charAt(0).toUpperCase() +
                        conversation.exchange_request[0].status.slice(1)
                        : "Status unavailable"}
                    </p>

                    <p className="mt-1 text-xs text-[#858779]">
                      Started{" "}
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <MessageSquare
                    size={18}
                    className="shrink-0 text-[#52745b]"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
