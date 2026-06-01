import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Send, ArrowLeft, MessageSquare, Package, ShoppingBag } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initials = (name = "?") => name.trim()[0]?.toUpperCase() || "?";

// Live (socket) messages populate `sender` as an object; REST history returns
// it as a raw id string. Normalise to an id either way.
const senderId = (m) =>
  m && typeof m.sender === "object" && m.sender ? m.sender._id : m?.sender;

// ── Chat container ─────────────────────────────────────────────────────────
const Chat = () => {
  const { id: activeId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState({}); // userId -> isOnline

  // Load my conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/conversations/v1");
      setConversations(data.data);
      // seed presence from the list
      const seed = {};
      data.data.forEach((c) => {
        if (c.otherUser) seed[c.otherUser._id] = c.otherUser.isOnline;
      });
      setPresence((p) => ({ ...seed, ...p }));
    } catch (err) {
      console.error("Failed to load conversations:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Global socket listeners: presence + sidebar previews.
  // `conversation:updated` is delivered to our personal room (always received),
  // so it drives the sidebar rather than the room-scoped `receive_message`.
  useEffect(() => {
    if (!socket) return;

    const onOnline = ({ userId }) =>
      setPresence((p) => ({ ...p, [userId]: true }));
    const onOffline = ({ userId }) =>
      setPresence((p) => ({ ...p, [userId]: false }));

    const onConversationUpdated = ({ conversationId, lastMessage, lastMessageAt, unreadCount }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === conversationId);
        if (idx === -1) {
          loadConversations(); // a brand-new conversation arrived
          return prev;
        }
        const updated = [...prev];
        const conv = {
          ...updated[idx],
          lastMessage,
          lastMessageAt,
          // viewing it = nothing unread
          unreadCount: conversationId === activeId ? 0 : unreadCount ?? updated[idx].unreadCount,
        };
        updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    socket.on("user:online", onOnline);
    socket.on("user:offline", onOffline);
    socket.on("conversation:updated", onConversationUpdated);
    return () => {
      socket.off("user:online", onOnline);
      socket.off("user:offline", onOffline);
      socket.off("conversation:updated", onConversationUpdated);
    };
  }, [socket, activeId, loadConversations]);

  const activeConv = conversations.find((c) => c._id === activeId);

  return (
    <div className="container mx-auto px-4 md:px-16 py-6">
      <div className="flex h-[calc(100vh-9rem)] border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
        {/* Sidebar */}
        <aside
          className={`w-full md:w-80 border-r border-gray-100 flex-col ${
            activeId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-xl font-black uppercase tracking-tighter">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-gray-400">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 space-y-2">
                <MessageSquare className="mx-auto" />
                <p>No conversations yet.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c._id}
                  conv={c}
                  active={c._id === activeId}
                  online={c.otherUser && presence[c.otherUser._id]}
                  onClick={() => navigate(`/chat/${c._id}`)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Conversation window */}
        <section className={`flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
          {activeId ? (
            <ChatWindow
              key={activeId}
              conversationId={activeId}
              conv={activeConv}
              online={activeConv?.otherUser && presence[activeConv.otherUser._id]}
              onBack={() => navigate("/chat")}
              onRead={() =>
                setConversations((prev) =>
                  prev.map((c) => (c._id === activeId ? { ...c, unreadCount: 0 } : c))
                )
              }
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
              <MessageSquare size={48} strokeWidth={1.5} />
              <p className="font-bold uppercase tracking-widest text-sm">
                Select a conversation
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// ── Sidebar row ───────────────────────────────────────────────────────────
const ConversationRow = ({ conv, active, online, onClick }) => {
  const other = conv.otherUser;
  const name = other?.username || "Store";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors ${
        active ? "bg-gray-50" : ""
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-black overflow-hidden">
          {other?.avatar ? (
            <img src={other.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm truncate">{name}</p>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-gray-400 shrink-0">
              {fmtTime(conv.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{conv.lastMessage || "Say hi 👋"}</p>
      </div>
      {conv.unreadCount > 0 && (
        <span className="bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
          {conv.unreadCount}
        </span>
      )}
    </button>
  );
};

// ── Chat window ───────────────────────────────────────────────────────────
const ChatWindow = ({ conversationId, conv, online, onBack, onRead }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [seen, setSeen] = useState(false); // other participant read my latest
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const other = conv?.otherUser;
  const name = other?.username || "Store";

  // Load history
  useEffect(() => {
    let active = true;
    api
      .get(`/conversations/v1/${conversationId}/messages`)
      .then(({ data }) => active && setMessages(data.data))
      .catch((err) => console.error("Failed to load messages:", err.message));
    return () => {
      active = false;
    };
  }, [conversationId]);

  // Join room, mark read, and subscribe to live events
  useEffect(() => {
    if (!socket) return;
    socket.emit("join_conversation", { conversationId });
    socket.emit("message_read", { conversationId });
    api.patch(`/conversations/v1/${conversationId}/read`).catch(() => {});
    onRead?.();

    const onMessage = (msg) => {
      if (msg.conversation !== conversationId) return;
      setMessages((prev) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
      );
      if (senderId(msg) !== user._id) {
        setSeen(false);
        socket.emit("message_read", { conversationId });
      }
    };
    const onTypingStart = ({ conversationId: cid, userId }) => {
      if (cid === conversationId && userId !== user._id) setOtherTyping(true);
    };
    const onTypingStop = ({ conversationId: cid, userId }) => {
      if (cid === conversationId && userId !== user._id) setOtherTyping(false);
    };
    const onMessagesRead = ({ conversationId: cid, userId }) => {
      // The OTHER participant read the thread → mark my messages "Seen".
      if (cid === conversationId && userId !== user._id) setSeen(true);
    };

    socket.on("receive_message", onMessage);
    socket.on("typing_start", onTypingStart);
    socket.on("typing_stop", onTypingStop);
    socket.on("messages_read", onMessagesRead);
    return () => {
      socket.off("receive_message", onMessage);
      socket.off("typing_start", onTypingStart);
      socket.off("typing_stop", onTypingStop);
      socket.off("messages_read", onMessagesRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, conversationId, user._id]);

  // Auto-scroll on new messages / typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const send = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !socket) return;
    socket.emit("send_message", { conversationId, text: body });
    socket.emit("typing_stop", { conversationId });
    setSeen(false);
    setText("");
  };

  const onChange = (e) => {
    setText(e.target.value);
    if (!socket) return;
    socket.emit("typing_start", { conversationId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(
      () => socket.emit("typing_stop", { conversationId }),
      1500
    );
  };

  // Index of my last text message — used to anchor the "Seen" indicator.
  const lastMineIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type !== "order_card" && senderId(messages[i]) === user._id) return i;
    }
    return -1;
  })();

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <button onClick={onBack} className="md:hidden text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black overflow-hidden">
            {other?.avatar ? (
              <img src={other.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div>
          <p className="font-bold text-sm">{name}</p>
          <p className="text-[11px] text-gray-400">
            {otherTyping ? "typing…" : online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Product context card */}
      {conv?.product && <ProductContextCard product={conv.product} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
        {messages.map((m, i) =>
          m.type === "order_card" ? (
            <OrderCard key={m._id} msg={m} />
          ) : (
            <MessageBubble
              key={m._id}
              msg={m}
              mine={senderId(m) === user._id}
              seen={seen && i === lastMineIdx}
            />
          )
        )}
        {otherTyping && (
          <div className="text-xs text-gray-400 italic ml-1">typing…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-3 px-5 py-3 border-t border-gray-100">
        <input
          value={text}
          onChange={onChange}
          placeholder="Type a message…"
          className="flex-1 bg-gray-100 rounded-full py-3 px-5 text-sm outline-none focus:ring-1 focus:ring-black"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/90 transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </>
  );
};

// ── Message renderers ─────────────────────────────────────────────────────
const MessageBubble = ({ msg, mine, seen }) => (
  <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
    <div
      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
        mine
          ? "bg-black text-white rounded-br-md"
          : "bg-white border border-gray-100 rounded-bl-md"
      }`}
    >
      <p className="break-words whitespace-pre-wrap">{msg.text}</p>
      <p className={`text-[10px] mt-1 ${mine ? "text-white/50" : "text-gray-400"}`}>
        {fmtTime(msg.createdAt)}
      </p>
    </div>
    {mine && seen && (
      <span className="text-[10px] text-gray-400 mt-0.5 mr-1">Seen</span>
    )}
  </div>
);

const OrderCard = ({ msg }) => (
  <div className="flex justify-center my-2">
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 max-w-sm shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
        <Package size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-green-700">
          Order update
        </p>
        <p className="text-sm text-gray-800">{msg.text}</p>
      </div>
    </div>
  </div>
);

const ProductContextCard = ({ product }) => (
  <Link
    to="/"
    className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-amber-50/60 hover:bg-amber-50 transition-colors"
  >
    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
      {product.image ? (
        <img src={product.image} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <ShoppingBag size={18} />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        Asking about
      </p>
      <p className="text-sm font-bold truncate">{product.name}</p>
    </div>
    <span className="text-sm font-black">₹{product.price}</span>
  </Link>
);

export default Chat;
