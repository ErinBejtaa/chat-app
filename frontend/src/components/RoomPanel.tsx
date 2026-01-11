import type { ChatMessage } from "../types/chat";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

type RoomPanelProps = {
  room: string;
  roomJoined: boolean;
  messages: ChatMessage[];
  typingUsers: string[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onLoadOlder: () => void;
};

export const RoomPanel = ({
  room,
  roomJoined,
  messages,
  typingUsers,
  input,
  onInputChange,
  onSendMessage,
  onLoadOlder
}: RoomPanelProps) => {
  const items = messages.map((message) => ({
    id: message.id,
    user: message.user,
    text: message.text ?? "[Encrypted message]",
    ts: message.ts
  }));

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Room: {room}</h2>
        <button
          className="rounded-xl border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-50"
          onClick={onLoadOlder}
          disabled={!roomJoined}
        >
          Load older
        </button>
      </div>
      <div className="mt-4">
        <MessageList items={items} />
      </div>
      <TypingIndicator users={typingUsers} />
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Message the room"
          disabled={!roomJoined}
        />
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSendMessage}
          disabled={!roomJoined}
        >
          Send
        </button>
      </div>
    </section>
  );
};
