
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Conversation = {
  id: string;
  listing_id: string;
  seller_id: string;
  requester_id: string;
  exchange_request_id: string;
};

function ConversationContent() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadChat = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace(
          `/auth?next=${encodeURIComponent(`/messages/${conversationId}`)}`
        );
        return;
      }

      setUserId(user.id);

      const { data: chat, error: chatError } = await supabase
        .from("conversations")
        .select("id, listing_id, seller_id, requester_id, exchange_request_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (chatError) throw chatError;

      if (!chat) {
        setError("Conversation not found, or you don't have access to it.");
        setConversation(null);
        setMessages([]);
        return;
      }

      setConversation(chat as Conversation);

      const { data: rows, error: messageError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      setMessages((rows ?? []) as ChatMessage[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load this conversation."
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, router, supabase]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed || !conversation || sending) return;

    setSending(true);
    setError("");

    try {
      const { data, error: sendError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          body: trimmed,
        })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();

      if (sendError) throw sendError;

      setMessages((current) => [...current, data as ChatMessage]);
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  const panelClass =
    "rounded-2xl border border-[#e6e5dc] bg-white p-5 shadow-sm";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#686b61] hover:text-[#20231d]"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#858779]">
              LoopCampus
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#20231d]">
              Exchange chat
            </h1>
            <p className="mt-2 text-sm text-[#686b61]">
              Coordinate pickup, exchange details, and next steps here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadChat()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6e5dc] px-3 py-2 text-sm font-medium text-[#34372f] disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="my-5 border-t border-[#eeede6]" />

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-[#686b61]">
            <LoaderCircle size={18} className="animate-spin" />
            Loading conversation...
          </div>
        ) : error && !conversation ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 text-sm text-[#686b61]">
              <MessageSquare size={16} />
              {messages.length}{" "}
              {messages.length === 1 ? "message" : "messages"}
            </div>

            <div className="min-h-64 space-y-3 rounded-2xl bg-[#f8f8f3] p-4">
              {messages.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                  <MessageSquare size={28} className="text-[#9a9d92]" />
                  <p className="mt-3 font-medium text-[#34372f]">
                    Start the conversation
                  </p>
                  <p className="mt-1 text-sm text-[#777a70]">
                    Send a message to coordinate your exchange.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.sender_id === userId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          mine
                            ? "rounded-br-sm bg-[#315b42] text-white"
                            : "rounded-bl-sm border border-[#e6e5dc] bg-white text-[#20231d]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.body}
                        </p>
                        <p
                          className={`mt-2 text-[10px] ${
                            mine ? "text-white/70" : "text-[#858779]"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <form onSubmit={sendMessage} className="mt-4 flex items-end gap-3">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a message..."
                maxLength={2000}
                rows={2}
                className="min-h-12 flex-1 resize-y rounded-xl border border-[#deded3] bg-white px-4 py-3 text-sm text-[#20231d] outline-none focus:border-[#719477]"
              />
              <button
                type="submit"
                disabled={sending || !body.trim() || !conversation}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#315b42] px-4 py-3 text-sm font-semibold text-white hover:bg-[#244731] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}
                Send
              </button>
            </form>

            <p className="mt-2 text-xs text-[#858779]">
              Keep messages relevant to the exchange. Maximum 2,000 characters.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-[#686b61]">Loading conversation...</p>
        </main>
      }
    >
      <ConversationContent />
    </Suspense>
  );
}
