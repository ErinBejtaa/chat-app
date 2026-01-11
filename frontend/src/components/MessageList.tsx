export type MessageItem = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

type MessageListProps = {
  items: MessageItem[];
};

export const MessageList = ({ items }: MessageListProps) => {
  return (
    <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
      {items.map((message) => (
        <div
          key={message.id}
          className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 py-2 text-sm"
        >
          <span className="font-semibold text-blue-700">{message.user}</span>
          <span className="break-words text-slate-800">{message.text}</span>
          <span className="text-xs text-slate-400">
            {new Date(message.ts).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
};
