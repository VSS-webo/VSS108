
"use client";

// import { useCallback, useEffect, useState } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

type Props = {
  listingId: string;
  ownerId: string;
  listingStatus: string;
};

const statusLabel: Record<string, string> = {
  pending: "Awaiting seller response",
  accepted: "Request accepted",
  declined: "Request declined",
  cancelled: "Request cancelled",
  completed: "Exchange completed",
};

export default function ExchangeActions({
  listingId,
  ownerId,
  listingStatus,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [ownRequest, setOwnRequest] = useState<ExchangeRequest | null>(null);
  const [sellerRequests, setSellerRequests] = useState<ExchangeRequest[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isOwner = userId === ownerId;
  const isAvailable = listingStatus.toLowerCase() === "available";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      setUserId(user?.id ?? null);
      setOwnRequest(null);
      setSellerRequests([]);

      if (!user) return;

      if (user.id !== ownerId) {
        const { data, error: requestError } = await supabase
        .from("exchange_requests")
        .select(
            "id, listing_id, requester_id, message, status, created_at, seller_completed_at, requester_completed_at"
        )
        .eq("listing_id", listingId)
        .eq("requester_id", user.id)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

        if (requestError) throw requestError;

        setOwnRequest(data as ExchangeRequest | null);
      } else {
        const { data, error: requestsError } = await supabase
          .from("exchange_requests")
          .select(
            "id, listing_id, requester_id, message, status, created_at, seller_completed_at, requester_completed_at"
          )
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false });

        if (requestsError) throw requestsError;
        setSellerRequests((data ?? []) as ExchangeRequest[]);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load exchange requests."
      );
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerId, supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitRequest() {
    setError("");
    setNotice("");

    if (!userId) {
      window.location.href = `/auth?next=${encodeURIComponent(
        `/listings/${listingId}`
      )}`;
      return;
    }

    const trimmed = message.trim();

    if (trimmed.length < 5 || trimmed.length > 500) {
      setError("Your message must be between 5 and 500 characters.");
      return;
    }

    setBusyId("new-request");

    try {
      const { error: insertError } = await supabase
        .from("exchange_requests")
        .insert({
          listing_id: listingId,
          requester_id: userId,
          message: trimmed,
          status: "pending",
        });

      if (insertError) throw insertError;

      setMessage("");
      setNotice("Your request has been sent to the seller.");
      await refresh();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not send your request.";

      setError(
        message.toLowerCase().includes("duplicate") ||
          message.toLowerCase().includes("unique")
          ? "You have already sent a request for this item."
          : message
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(
    requestId: string,
    action: "accept_exchange_request" | "decline_exchange_request" | "confirm_exchange_completion"
  ) {
    setError("");
    setNotice("");
    setBusyId(requestId);

    try {
      const { data, error: rpcError } = await supabase.rpc(action, {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;

      // The functions return JSON containing a success/status result.
      if (data && typeof data === "object" && "error" in data) {
        throw new Error(String(data.error));
      }

      setNotice(
        action === "accept_exchange_request"
          ? "Request accepted. The item is now reserved."
          : action === "decline_exchange_request"
            ? "Request declined."
            : "Your confirmation was recorded."
      );

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "That action could not be completed."
      );
    } finally {
      setBusyId(null);
    }
  }


  
    async function cancelRequest(request: ExchangeRequest) {
    setError("");
    setNotice("");
    setBusyId(request.id);

    try {
        const { error: rpcError } = await supabase.rpc(
        "cancel_exchange_request",
        { p_request_id: request.id }
        );

        if (rpcError) throw rpcError;

        setNotice("Exchange request cancelled successfully.");
        await refresh();
    } catch (e) {
        setError(
        e instanceof Error ? e.message : "Could not cancel this exchange."
        );
    } finally {
        setBusyId(null);
    }
    }


  async function openConversation(request: ExchangeRequest) {
        setError("");
        setNotice("");
        setBusyId(request.id);

        try {
            const { data, error: rpcError } = await supabase.rpc(
            "get_or_create_conversation",
            {
                p_exchange_request_id: request.id,
            }
            );

            if (rpcError) throw rpcError;

            if (typeof data !== "string" || !data) {
            throw new Error("Could not open this conversation.");
            }

            router.push(`/messages/${data}`);
        } catch (e) {
            setError(
            e instanceof Error
                ? e.message
                : "Could not open the conversation."
            );
        } finally {
            setBusyId(null);
        }
    }

    function messageButton(
        request: ExchangeRequest,
        label: string
        ) {
        return (
            <button
            key={`message-${request.id}`}
            type="button"
            disabled={busyId !== null}
            onClick={() => void openConversation(request)}
            className={secondaryButtonClass}
            >
            {busyId === request.id ? (
                <LoaderCircle size={16} className="animate-spin" />
            ) : (
                <MessageSquare size={16} />
            )}
            {label}
            </button>
        );
    }

  const panelClass =
    "mt-6 rounded-2xl border border-[#e4e5db] bg-white p-5 sm:p-6";
  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#365e42] disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e4e5db] bg-white px-4 py-2.5 text-sm font-semibold text-[#43513f] transition hover:bg-[#f5f6f0] disabled:cursor-not-allowed disabled:opacity-50";

  function actionButton(
    request: ExchangeRequest,
    action: "accept_exchange_request" | "decline_exchange_request" | "confirm_exchange_completion",
    label: string,
    secondary = false
  ) {
    return (
      <button
        key={action}
        type="button"
        disabled={busyId !== null}
        onClick={() => void runAction(request.id, action)}
        className={secondary ? secondaryButtonClass : buttonClass}
      >
        {busyId === request.id ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : action === "accept_exchange_request" ? (
          <CheckCircle2 size={16} />
        ) : action === "decline_exchange_request" ? (
          <XCircle size={16} />
        ) : (
          <ShieldCheck size={16} />
        )}
        {label}
      </button>
    );
  }

  return (
    <section className={panelClass} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0e3] text-[#46643c]">
          <MessageSquare size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-[#294b35]">
            {isOwner ? "Manage exchange requests" : "Interested in this item?"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#73796d]">
            {isOwner
              ? "Review messages from students and decide how to proceed."
              : "Send the seller a short message to request this item."}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-[#edf4e8] p-3 text-sm text-[#365337]">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-[#73796d]">
          <LoaderCircle size={17} className="animate-spin" />
          Loading exchange details…
        </div>
      ) : !userId ? (
        <div className="mt-5">
          <p className="text-sm leading-6 text-[#73796d]">
            Sign in to contact the seller and manage your exchange requests.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`}
            className={`${buttonClass} mt-3`}
          >
            Sign in to continue
          </Link>
        </div>
      ) : isOwner ? (
        sellerRequests.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#f7f7f2] p-4 text-sm text-[#73796d]">
            No requests yet. New student requests will appear here.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {sellerRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-[#e8e8df] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#858a7d]">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(request.created_at))}
                  </span>
                  <span className="rounded-full bg-[#eff2e8] px-3 py-1 text-xs font-semibold text-[#46643c]">
                    {statusLabel[request.status] ?? request.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#4c5548]">
                  {request.message}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="break-all text-xs text-[#9a9d92]">
                    Student request
                </p>

                {["pending", "accepted", "completed"].includes(request.status) &&
                    messageButton(request, "Message student")}
                </div>

                {request.status === "pending" && isAvailable && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {actionButton(
                      request,
                      "accept_exchange_request",
                      "Accept request"
                    )}
                    {actionButton(
                      request,
                      "decline_exchange_request",
                      "Decline",
                      true
                    )}
                  </div>
                )}

                
                {request.status === "accepted" && (
                <div className="mt-4">
                    <p className="mb-3 text-xs leading-5 text-[#73796d]">
                    {request.seller_completed_at
                        ? "You have confirmed the handover. Waiting for the requester."
                        : "After the item has actually been handed over, confirm the exchange."}
                    </p>

                    {!request.seller_completed_at &&
                    !request.requester_completed_at &&
                    actionButton(
                        request,
                        "confirm_exchange_completion",
                        "Confirm handover"
                    )}

                    {!request.seller_completed_at &&
                    !request.requester_completed_at && (
                        <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void cancelRequest(request)}
                        className={`${secondaryButtonClass} mt-2`}
                        >
                        {busyId === request.id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                            <XCircle size={16} />
                        )}
                        Cancel exchange
                        </button>
                    )}
                </div>
                )}

              </article>
            ))}
          </div>
        )
      ) : ownRequest ? (
        <div className="mt-5 rounded-xl bg-[#f7f7f2] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#365337]">
            <Clock3 size={17} />
            {statusLabel[ownRequest.status] ?? ownRequest.status}
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#73796d]">
            {ownRequest.message}
          </p>
          {["pending", "accepted", "completed"].includes(ownRequest.status) && (
            <div className="mt-4">
                {messageButton(ownRequest, "Message seller")}
            </div>
            )}

          {ownRequest.status === "accepted" && (
            <div className="mt-4">
              <p className="mb-3 text-sm leading-6 text-[#73796d]">
                Arrange a safe campus handover with the seller. Confirm only
                after the exchange has actually taken place.
              </p>
              {ownRequest.requester_completed_at ? (
                <p className="text-sm font-medium text-[#46643c]">
                  Your confirmation is recorded. Waiting for the seller.
                </p>
              ) : (
                actionButton(
                  ownRequest,
                  "confirm_exchange_completion",
                  "Confirm item received"
                )
              )}
            </div>

            
          )}
        
        
        
        {(ownRequest.status === "pending" ||
        ownRequest.status === "accepted") &&
        !ownRequest.seller_completed_at &&
        !ownRequest.requester_completed_at && (
            <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void cancelRequest(ownRequest)}
            className={`${secondaryButtonClass} mt-3`}
            >
            {busyId === ownRequest.id ? (
                <LoaderCircle size={16} className="animate-spin" />
            ) : (
                <XCircle size={16} />
            )}
            Cancel exchange
            </button>
        )}


        </div>

        
      ) : !isAvailable ? (
        <p className="mt-5 rounded-xl bg-[#f7f7f2] p-4 text-sm text-[#73796d]">
          This item is no longer available for new requests.
        </p>
      ) : (
        <div className="mt-5">
          <label
            htmlFor="exchange-message"
            className="mb-2 block text-sm font-medium text-[#43513f]"
          >
            Message to the seller
          </label>
          <textarea
            id="exchange-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={5}
            maxLength={500}
            rows={4}
            placeholder="Hi! I'm interested in this item. Is it available for pickup on campus?"
            className="w-full resize-y rounded-xl border border-[#dfe2d7] bg-[#fdfdfb] p-3 text-sm leading-6 outline-none transition placeholder:text-[#a0a397] focus:border-[#648957] focus:ring-2 focus:ring-[#648957]/15"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[#858a7d]">
              {message.trim().length}/500 characters · Minimum 5
            </span>
            <button
              type="button"
              onClick={() => void submitRequest()}
              disabled={busyId !== null || message.trim().length < 5}
              className={buttonClass}
            >
              {busyId === "new-request" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send request
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
