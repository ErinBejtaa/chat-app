import type { ChangeEvent } from "react";

type ConnectionPanelProps = {
  serverUrl: string;
  username: string;
  room: string;
  connected: boolean;
  statusMessage: string;
  onServerUrlChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onJoinRoom: () => void;
};

export const ConnectionPanel = ({
  serverUrl,
  username,
  room,
  connected,
  statusMessage,
  onServerUrlChange,
  onUsernameChange,
  onRoomChange,
  onConnect,
  onDisconnect,
  onJoinRoom
}: ConnectionPanelProps) => {
  const handleServerChange = (event: ChangeEvent<HTMLInputElement>) => {
    onServerUrlChange(event.target.value);
  };

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUsernameChange(event.target.value);
  };

  const handleRoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    onRoomChange(event.target.value);
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <h2 className="text-lg font-semibold text-slate-900">Connection</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Server URL
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={serverUrl}
            onChange={handleServerChange}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Username
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={username}
            onChange={handleUsernameChange}
            placeholder="erin"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Room
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={room}
            onChange={handleRoomChange}
            placeholder="general"
          />
        </label>
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onJoinRoom}
          disabled={!connected || !username}
        >
          Join Room
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={connected ? onDisconnect : onConnect}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {statusMessage}
        </span>
      </div>
    </section>
  );
};
