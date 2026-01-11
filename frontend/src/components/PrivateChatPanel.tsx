import type { DirectMessage, PrivateChatState } from "../types/chat";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

type PrivateChatPanelProps = {
  privateChats: Record<string, PrivateChatState>;
  activeChat: string | null;
  activeState: PrivateChatState | null;
  typingUsers: string[];
  peerInput: string;
  messageInput: string;
  username: string;
  onPeerInputChange: (value: string) => void;
  onMessageInputChange: (value: string) => void;
  onOpenChat: (peer: string) => void;
  onSelectChat: (peer: string) => void;
  onLoadHistory: () => void;
  onStartSecure: () => void;
  onSendMessage: () => void;
  onTypingBlur: () => void;
};

const mapMessages = (messages: DirectMessage[], username: string) =>
  messages.map((message) => ({
    id: message.id,
    user: message.from === username ? "You" : message.from,
    text: message.text ?? "[Encrypted message]",
    ts: message.ts
  }));

export const PrivateChatPanel = ({
  privateChats,
  activeChat,
  activeState,
  typingUsers,
  peerInput,
  messageInput,
  username,
  onPeerInputChange,
  onMessageInputChange,
  onOpenChat,
  onSelectChat,
  onLoadHistory,
  onStartSecure,
  onSendMessage,
  onTypingBlur
}: PrivateChatPanelProps) => {
  const chatList = Object.keys(privateChats);
  const messages = activeState ? mapMessages(activeState.messages, username) : [];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Private Chat</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={peerInput}
          onChange={(event) => onPeerInputChange(event.target.value)}
          placeholder="username"
        />
        <button
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          onClick={() => {
            onOpenChat(peerInput);
            onPeerInputChange("");
          }}
        >
          Open
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chatList.length === 0 && (
          <div className="text-sm text-slate-500">No private chats yet.</div>
        )}
        {chatList.map((peer) => (
          <button
            key={peer}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              peer === activeChat
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => onSelectChat(peer)}
          >
            {peer}
          </button>
        ))}
      </div>

      {activeState && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">
              Chat with {activeState.withUser}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-200 px-3 py-1 text-sm text-slate-600"
                onClick={onLoadHistory}
              >
                Load history
              </button>
              <button
                className="rounded-xl bg-blue-600 px-3 py-1 text-sm font-semibold text-white"
                onClick={onStartSecure}
              >
                {activeState.secure ? "Secure enabled" : "Start secure"}
              </button>
            </div>
          </div>
          <MessageList items={messages} />
          <TypingIndicator users={typingUsers} />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={messageInput}
              onChange={(event) => onMessageInputChange(event.target.value)}
              onBlur={onTypingBlur}
              placeholder="Send a private message"
            />
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={onSendMessage}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
