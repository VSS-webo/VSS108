
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
} from "lucide-react";

type Exchange = {
  id: string;
  listing_id: string;
  requester_id: string;
  status: string;
  title: string;
  owner_id: string;
};

type Meetup = {
  id: string;
  exchange_request_id: string;
  proposed_by: string;
  proposed_at: string;
  location: string;
  notes: string | null;
  status: string;
  confirmed_at: string | null;
};

export default function MeetupScheduler() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [exchangeId, setExchangeId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
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
        setExchanges([]);
        setMeetups([]);
        setExchangeId("");
        return;
      }

      setUserId(user.id);

      // Accepted exchanges initiated by this user.
      const { data: sent, error: sentError } = await supabase
        .from("exchange_requests")
        .select("id, listing_id, requester_id, status")
        .eq("requester_id", user.id)
        .eq("status", "accepted");

      if (sentError) throw sentError;

      // Accepted requests for listings owned by this user.
      const { data: ownedListings, error: ownedError } = await supabase
        .from("listings")
        .select("id, owner_id, title")
        .eq("owner_id", user.id);

      if (ownedError) throw ownedError;

      const owned = ownedListings ?? [];
      let incoming: typeof sent = [];

      if (owned.length > 0) {
        const { data, error: incomingError } = await supabase
          .from("exchange_requests")
          .select("id, listing_id, requester_id, status")
          .in(
            "listing_id",
            owned.map((item) => item.id)
          )
          .eq("status", "accepted");

        if (incomingError) throw incomingError;
        incoming = data ?? [];
      }

      const all = [...(sent ?? []), ...incoming];

      const unique = Array.from(
        new Map(all.map((item) => [item.id, item])).values()
      );

      const listingIds = [
        ...new Set(unique.map((item) => item.listing_id)),
      ];

      let listingRows: {
        id: string;
        owner_id: string;
        title: string;
      }[] = [];

      if (listingIds.length > 0) {
        const { data, error: listingError } = await supabase
          .from("listings")
          .select("id, owner_id, title")
          .in("id", listingIds);

        if (listingError) throw listingError;
        listingRows = data ?? [];
      }

      const listingMap = new Map(
        listingRows.map((item) => [item.id, item])
      );

      const hydrated: Exchange[] = unique.flatMap((item) => {
        const listing = listingMap.get(item.listing_id);

        if (!listing) return [];

        return [
          {
            ...item,
            title: listing.title,
            owner_id: listing.owner_id,
          },
        ];
      });

      setExchanges(hydrated);

      // Clear the selected exchange if it is no longer available
      // for the requester to propose a meetup.
      const requesterExchanges = hydrated.filter(
        (item) => item.requester_id === user.id
      );

      if (
        exchangeId &&
        !requesterExchanges.some((item) => item.id === exchangeId)
      ) {
        setExchangeId("");
      }

      if (hydrated.length === 0) {
        setMeetups([]);
        return;
      }

      const { data: meetupRows, error: meetupError } = await supabase
        .from("meetups")
        .select(
          "id, exchange_request_id, proposed_by, proposed_at, location, notes, status, confirmed_at"
        )
        .in(
          "exchange_request_id",
          hydrated.map((item) => item.id)
        )
        .order("proposed_at", { ascending: true });

      if (meetupError) throw meetupError;

      setMeetups((meetupRows ?? []) as Meetup[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load meetups."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, exchangeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requesterExchanges = exchanges.filter(
    (exchange) => exchange.requester_id === userId
  );

  async function proposeMeetup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!userId) {
      setError("Please sign in before proposing a meetup.");
      return;
    }

    const selectedExchange = requesterExchanges.find(
      (exchange) => exchange.id === exchangeId
    );

    if (!selectedExchange || !dateTime || !location.trim()) {
      setError(
        "Choose an exchange you requested, a date/time, and a location."
      );
      return;
    }

    const proposedAt = new Date(dateTime);

    if (
      Number.isNaN(proposedAt.getTime()) ||
      proposedAt <= new Date()
    ) {
      setError("Choose a future date and time.");
      return;
    }

    setBusyId(exchangeId);

    try {
      const { data, error: insertError } = await supabase
        .from("meetups")
        .insert({
          exchange_request_id: exchangeId,
          proposed_by: userId,
          proposed_at: proposedAt.toISOString(),
          location: location.trim(),
          notes: notes.trim() || null,
          status: "proposed",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error("The meetup proposal was not created.");
      }

      setDateTime("");
      setLocation("");
      setNotes("");
      setExchangeId("");
      setNotice("Meetup proposal sent to the listing owner.");

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not propose meetup."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runRpc(
    meetup: Meetup,
    action:
      | "owner_confirm_meetup"
      | "accept_meetup_reschedule"
  ) {
    setBusyId(meetup.id);
    setError("");
    setNotice("");

    try {
      const { data, error: rpcError } = await supabase.rpc(action, {
        p_meetup_id: meetup.id,
      });

      if (rpcError) throw rpcError;

      if (data && typeof data === "object" && "error" in data) {
        throw new Error(String(data.error));
      }

      setNotice(
        action === "owner_confirm_meetup"
          ? "Meetup confirmed."
          : "Rescheduled meetup accepted."
      );

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "That action failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function rescheduleMeetup(
    event: React.FormEvent<HTMLFormElement>,
    meetup: Meetup
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    const time = new Date(newDateTime);

    if (
      !newDateTime ||
      Number.isNaN(time.getTime()) ||
      time <= new Date() ||
      !newLocation.trim()
    ) {
      setError("Choose a future time and enter a location.");
      return;
    }

    setBusyId(meetup.id);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "owner_reschedule_meetup",
        {
          p_meetup_id: meetup.id,
          p_new_time: time.toISOString(),
          p_new_location: newLocation.trim(),
        }
      );

      if (rpcError) throw rpcError;

      if (data && typeof data === "object" && "error" in data) {
        throw new Error(String(data.error));
      }

      setRescheduleId(null);
      setNewDateTime("");
      setNewLocation("");
      setNotice(
        "New meetup time sent to the requester for approval."
      );

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reschedule meetup."
      );
    } finally {
      setBusyId(null);
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  const activeMeetups = meetups.filter(
    (meetup) =>
      meetup.status !== "cancelled" &&
      meetup.status !== "completed"
  );

  return (
    <section
        id="campus-meetups"
        className="scroll-mt-24 space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-6"
        >   
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold">Campus Meetups</h2>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Coordinate a safe, convenient place and time for your exchange.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-900"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
        >
          {notice}
        </p>
      )}

      {!userId && !loading && (
        <p className="text-sm text-gray-500">
          Sign in to manage campus meetups.
        </p>
      )}

      {/* Only the requester can propose a meetup. */}
      {userId && (
        <form
          onSubmit={proposeMeetup}
          className="rounded-2xl border border-[#e5e7de] bg-white p-5 shadow-sm dark:border-[#354339] dark:bg-[#1d2820]"
        >
          <h3 className="text-lg font-semibold text-[#294b35] dark:text-[#e5efc9]">Propose a meetup</h3>

          {requesterExchanges.length === 0 ? (
            <p className="text-sm text-[#687264] dark:text-[#c2cbbd]">
              Only the student who requested an item can propose a meetup.
              You need an accepted exchange that you requested.
            </p>
          ) : (
            <>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Accepted exchange</span>

                <select
                  required
                  value={exchangeId}
                  onChange={(e) => setExchangeId(e.target.value)}
                  className="w-full rounded-lg border bg-white p-2.5 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Choose a listing</option>

                  {requesterExchanges.map((exchange) => (
                    <option key={exchange.id} value={exchange.id}>
                      {exchange.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Date and time</span>

                  <input
                    type="datetime-local"
                    required
                    min={new Date(Date.now() + 60_000)
                      .toISOString()
                      .slice(0, 16)}
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full rounded-lg border bg-white p-2.5 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Campus location</span>

                  <input
                    required
                    maxLength={200}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Main library entrance"
                    className="w-full rounded-lg border bg-white p-2.5 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                <span className="font-medium">Notes (optional)</span>

                <textarea
                  maxLength={500}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details the other person should know"
                  className="w-full rounded-lg border bg-white p-2.5 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>

              <button
                type="submit"
                disabled={!!busyId || !exchangeId || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busyId === exchangeId ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                Send proposal
              </button>
            </>
          )}
        </form>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold">Your meetup agenda</h3>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading meetups…
          </div>
        ) : activeMeetups.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
            No meetups yet. Propose a time for one of your accepted exchanges.
          </p>
        ) : (
          activeMeetups.map((meetup) => {
            const exchange = exchanges.find(
              (item) => item.id === meetup.exchange_request_id
            );

            const isOwner = exchange?.owner_id === userId;
            const isRequester = exchange?.requester_id === userId;
            const isBusy = busyId === meetup.id;

            return (
              <article
                key={meetup.id}
                className="rounded-xl border p-4 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">
                      {exchange?.title ?? "Campus exchange"}
                    </h4>

                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock3 className="h-4 w-4 shrink-0" />
                      {formatDate(meetup.proposed_at)}
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {meetup.location}
                    </p>

                    {meetup.notes && (
                      <p className="mt-2 text-sm text-gray-500">
                        {meetup.notes}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize dark:bg-gray-800">
                    {meetup.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {isOwner && meetup.status === "proposed" && (
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() =>
                        void runRpc(meetup, "owner_confirm_meetup")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isBusy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Confirm
                    </button>
                  )}

                  {isOwner &&
                    (meetup.status === "proposed" ||
                      meetup.status === "confirmed") && (
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleId(
                            rescheduleId === meetup.id ? null : meetup.id
                          );
                          setNewDateTime("");
                          setNewLocation(meetup.location);
                        }}
                        className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        Reschedule
                      </button>
                    )}

                  {isRequester &&
                    meetup.status === "reschedule_requested" && (
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() =>
                          void runRpc(meetup, "accept_meetup_reschedule")
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isBusy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Accept new time
                      </button>
                    )}
                </div>

                {isOwner && rescheduleId === meetup.id && (
                  <form
                    onSubmit={(event) => void rescheduleMeetup(event, meetup)}
                    className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900 sm:grid-cols-2"
                  >
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">New date and time</span>

                      <input
                        type="datetime-local"
                        required
                        min={new Date(Date.now() + 60_000)
                          .toISOString()
                          .slice(0, 16)}
                        value={newDateTime}
                        onChange={(e) => setNewDateTime(e.target.value)}
                        className="w-full rounded-lg border bg-white p-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium">New location</span>

                      <input
                        required
                        maxLength={200}
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className="w-full rounded-lg border bg-white p-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={!!busyId}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
                    >
                      Send reschedule request
                    </button>
                  </form>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
