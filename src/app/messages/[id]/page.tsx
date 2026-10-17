
// "use client";

// import {
//   Suspense,
//   useCallback,
//   useEffect,
//   useMemo,
//   useState,
// } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Link from "next/link";
// import {
//   ArrowLeft,
//   LoaderCircle,
//   MessageSquare,
//   RefreshCw,
//   Send,
// } from "lucide-react";
// import { createClient } from "@/lib/supabase/client";

// type ChatMessage = {
//   id: string;
//   conversation_id: string;
//   sender_id: string;
//   body: string;
//   created_at: string;
// };

// type Conversation = {
//   id: string;
//   listing_id: string;
//   seller_id: string;
//   requester_id: string;
//   exchange_request_id: string;
// };

// function ConversationContent() {
//   const params = useParams<{ id: string }>();
//   const conversationId = params.id;
//   const router = useRouter();
//   const supabase = useMemo(() => createClient(), []);

//   const [userId, setUserId] = useState("");
//   const [conversation, setConversation] = useState<Conversation | null>(null);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [body, setBody] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState("");

//   const loadChat = useCallback(async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const {
//         data: { user },
//         error: authError,
//       } = await supabase.auth.getUser();

//       if (authError) throw authError;

//       if (!user) {
//         router.replace(
//           `/auth?next=${encodeURIComponent(`/messages/${conversationId}`)}`
//         );
//         return;
//       }

//       setUserId(user.id);

//       const { data: chat, error: chatError } = await supabase
//         .from("conversations")
//         .select("id, listing_id, seller_id, requester_id, exchange_request_id")
//         .eq("id", conversationId)
//         .maybeSingle();

//       if (chatError) throw chatError;

//       if (!chat) {
//         setError("Conversation not found, or you don't have access to it.");
//         setConversation(null);
//         setMessages([]);
//         return;
//       }

//       setConversation(chat as Conversation);

//       const { data: rows, error: messageError } = await supabase
//         .from("messages")
//         .select("id, conversation_id, sender_id, body, created_at")
//         .eq("conversation_id", conversationId)
//         .order("created_at", { ascending: true });

//       if (messageError) throw messageError;

//       setMessages((rows ?? []) as ChatMessage[]);
//     } catch (e) {
//       setError(
//         e instanceof Error ? e.message : "Could not load this conversation."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, [conversationId, router, supabase]);

//   useEffect(() => {
//     void loadChat();
//   }, [loadChat]);

//   async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
//     event.preventDefault();

//     const trimmed = body.trim();
//     if (!trimmed || !conversation || sending) return;

//     setSending(true);
//     setError("");

//     try {
//       const { data, error: sendError } = await supabase
//         .from("messages")
//         .insert({
//           conversation_id: conversation.id,
//           sender_id: userId,
//           body: trimmed,
//         })
//         .select("id, conversation_id, sender_id, body, created_at")
//         .single();

//       if (sendError) throw sendError;

//       setMessages((current) => [...current, data as ChatMessage]);
//       setBody("");
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Could not send your message.");
//     } finally {
//       setSending(false);
//     }
//   }

//   const panelClass =
//     "rounded-2xl border border-[#e6e5dc] bg-white p-5 shadow-sm";

//   return (
//     <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
//       <Link
//         href="/dashboard"
//         className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#686b61] hover:text-[#20231d]"
//       >
//         <ArrowLeft size={16} />
//         Back to dashboard
//       </Link>

//       <section className={panelClass}>
//         <div className="flex flex-wrap items-center justify-between gap-3">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#858779]">
//               LoopCampus
//             </p>
//             <h1 className="mt-1 text-2xl font-semibold text-[#20231d]">
//               Exchange chat
//             </h1>
//             <p className="mt-2 text-sm text-[#686b61]">
//               Coordinate pickup, exchange details, and next steps here.
//             </p>
//           </div>

//           <button
//             type="button"
//             onClick={() => void loadChat()}
//             disabled={loading}
//             className="inline-flex items-center gap-2 rounded-xl border border-[#e6e5dc] px-3 py-2 text-sm font-medium text-[#34372f] disabled:opacity-50"
//           >
//             <RefreshCw size={15} />
//             Refresh
//           </button>
//         </div>

//         <div className="my-5 border-t border-[#eeede6]" />

//         {loading ? (
//           <div className="flex items-center gap-2 py-12 text-sm text-[#686b61]">
//             <LoaderCircle size={18} className="animate-spin" />
//             Loading conversation...
//           </div>
//         ) : error && !conversation ? (
//           <div
//             role="alert"
//             className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
//           >
//             {error}
//           </div>
//         ) : (
//           <>
//             <div className="mb-4 flex items-center gap-2 text-sm text-[#686b61]">
//               <MessageSquare size={16} />
//               {messages.length}{" "}
//               {messages.length === 1 ? "message" : "messages"}
//             </div>

//             <div className="min-h-64 space-y-3 rounded-2xl bg-[#f8f8f3] p-4">
//               {messages.length === 0 ? (
//                 <div className="flex min-h-56 flex-col items-center justify-center text-center">
//                   <MessageSquare size={28} className="text-[#9a9d92]" />
//                   <p className="mt-3 font-medium text-[#34372f]">
//                     Start the conversation
//                   </p>
//                   <p className="mt-1 text-sm text-[#777a70]">
//                     Send a message to coordinate your exchange.
//                   </p>
//                 </div>
//               ) : (
//                 messages.map((message) => {
//                   const mine = message.sender_id === userId;

//                   return (
//                     <div
//                       key={message.id}
//                       className={`flex ${
//                         mine ? "justify-end" : "justify-start"
//                       }`}
//                     >
//                       <div
//                         className={`max-w-[85%] rounded-2xl px-4 py-3 ${
//                           mine
//                             ? "rounded-br-sm bg-[#315b42] text-white"
//                             : "rounded-bl-sm border border-[#e6e5dc] bg-white text-[#20231d]"
//                         }`}
//                       >
//                         <p className="whitespace-pre-wrap break-words text-sm">
//                           {message.body}
//                         </p>
//                         <p
//                           className={`mt-2 text-[10px] ${
//                             mine ? "text-white/70" : "text-[#858779]"
//                           }`}
//                         >
//                           {new Date(message.created_at).toLocaleString()}
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>

//             {error && (
//               <p role="alert" className="mt-3 text-sm text-red-600">
//                 {error}
//               </p>
//             )}

//             <form onSubmit={sendMessage} className="mt-4 flex items-end gap-3">
//               <textarea
//                 value={body}
//                 onChange={(event) => setBody(event.target.value)}
//                 placeholder="Write a message..."
//                 maxLength={2000}
//                 rows={2}
//                 className="min-h-12 flex-1 resize-y rounded-xl border border-[#deded3] bg-white px-4 py-3 text-sm text-[#20231d] outline-none focus:border-[#719477]"
//               />
//               <button
//                 type="submit"
//                 disabled={sending || !body.trim() || !conversation}
//                 className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#315b42] px-4 py-3 text-sm font-semibold text-white hover:bg-[#244731] disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 {sending ? (
//                   <LoaderCircle size={17} className="animate-spin" />
//                 ) : (
//                   <Send size={17} />
//                 )}
//                 Send
//               </button>
//             </form>

//             <p className="mt-2 text-xs text-[#858779]">
//               Keep messages relevant to the exchange. Maximum 2,000 characters.
//             </p>
//           </>
//         )}
//       </section>
//     </main>
//   );
// }

// export default function ConversationPage() {
//   return (
//     <Suspense
//       fallback={
//         <main className="flex min-h-screen items-center justify-center">
//           <p className="text-sm text-[#686b61]">Loading conversation...</p>
//         </main>
//       }
//     >
//       <ConversationContent />
//     </Suspense>
//   );
// }



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

  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-8 text-[#202a21] transition-colors dark:bg-[#171e19] dark:text-[#edf1e9] sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#687264] transition hover:text-[#294b35] dark:text-[#b0bbad] dark:hover:text-[#d5e7bb]"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-[#e5e5db] bg-white shadow-sm dark:border-[#354339] dark:bg-[#202a23]">
          {/* Chat header */}
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#648957] dark:text-[#a6c596]">
                  LoopCampus · Private exchange
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#202a21] dark:text-[#edf1e9]">
                  Exchange chat
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[#73796d] dark:text-[#b0bbad]">
                  Coordinate pickup, exchange details, and next steps here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadChat()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e0e3d9] bg-[#faf9f6] px-4 py-2.5 text-sm font-semibold text-[#354535] transition hover:bg-[#eff2e8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#435447] dark:bg-[#27342b] dark:text-[#e0e9dc] dark:hover:bg-[#314235]"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="border-t border-[#e8e8df] dark:border-[#354339]" />

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm text-[#73796d] dark:text-[#b0bbad]">
              <LoaderCircle size={20} className="animate-spin" />
              Loading conversation...
            </div>
          ) : error && !conversation ? (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 sm:m-7">
              {error}
            </div>
          ) : (
            <div className="p-4 sm:p-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[#687264] dark:text-[#b0bbad]">
                  <MessageSquare size={17} />
                  {messages.length}{" "}
                  {messages.length === 1 ? "message" : "messages"}
                </div>
                <span className="text-xs text-[#858a7d] dark:text-[#94a091]">
                  Private conversation
                </span>
              </div>

              {/* Message history */}
              <div className="min-h-64 space-y-4 rounded-2xl border border-[#e9e9e0] bg-[#f5f5ef] p-3 sm:p-5 dark:border-[#354339] dark:bg-[#19221c]">
                {messages.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e0e5d8] bg-white text-[#648957] dark:border-[#435447] dark:bg-[#253329] dark:text-[#a6c596]">
                      <MessageSquare size={22} />
                    </div>
                    <p className="mt-4 font-semibold text-[#354535] dark:text-[#e0e9dc]">
                      Start the conversation
                    </p>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-[#73796d] dark:text-[#aeb9aa]">
                      Say hello and coordinate a convenient time and safe place
                      for your campus exchange.
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
                          className={`max-w-[88%] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                            mine
                              ? "rounded-br-md bg-[#315b42] text-white dark:bg-[#426b4c] dark:text-[#f4f8ef]"
                              : "rounded-bl-md border border-[#e3e5dc] bg-white text-[#283329] dark:border-[#3c4b3f] dark:bg-[#27332b] dark:text-[#e4ebe0]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {message.body}
                          </p>
                          <p
                            className={`mt-2 text-[11px] ${
                              mine
                                ? "text-white/75 dark:text-[#dce9d4]"
                                : "text-[#7b8174] dark:text-[#b0bbad]"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </p>
              )}

              {/* Message composer */}
              <form onSubmit={sendMessage} className="mt-5">
                <div className="flex items-end gap-2 rounded-2xl border border-[#deded3] bg-white p-2 shadow-sm transition focus-within:border-[#8aa17b] focus-within:ring-4 focus-within:ring-[#8aa17b]/10 dark:border-[#435447] dark:bg-[#202a23] dark:focus-within:border-[#7f9c6c]">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write a message..."
                    maxLength={2000}
                    rows={2}
                    className="min-h-12 min-w-0 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-6 text-[#202a21] outline-none placeholder:text-[#9a9d92] dark:text-[#edf1e9] dark:placeholder:text-[#94a091]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !body.trim() || !conversation}
                    className="mb-1 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#294b35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3525] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#547b58] dark:text-white dark:hover:bg-[#638c67]"
                  >
                    {sending ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}
                    <span className="hidden sm:inline">
                      {sending ? "Sending..." : "Send"}
                    </span>
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-xs leading-5 text-[#858a7d] dark:text-[#a5b0a0]">
                    Keep messages relevant to your exchange.
                  </p>
                  <p className="text-xs text-[#858a7d] dark:text-[#a5b0a0]">
                    {body.length}/2000
                  </p>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] text-[#686b61] dark:bg-[#171e19] dark:text-[#b0bbad]">
          <p className="text-sm">Loading conversation...</p>
        </main>
      }
    >
      <ConversationContent />
    </Suspense>
  );
}
