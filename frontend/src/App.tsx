import { useCallback, useMemo, useState } from "react";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { PrivateChatPanel } from "./components/PrivateChatPanel";
import { RoomPanel } from "./components/RoomPanel";
import { usePrivateChat } from "./hooks/usePrivateChat";
import { useRoomChat } from "./hooks/useRoomChat";
import { useSocket } from "./hooks/useSocket";
import { PrivateChatState } from "./types/chat";

export const App = () => {
  const [serverUrl, setServerUrl] = useState("http://localhost:3000");
  const [username, setUsername] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { socket, connected, statusMessage, connect, disconnect } =
    useSocket(serverUrl);

  const {
    room,
    setRoom,
    roomJoined,
    messages: roomMessages,
    typingUsers: roomTypingUsers,
    input: roomInput,
    handleInputChange: handleRoomInputChange,
    sendMessage: sendRoomMessage,
    loadOlderMessages,
    joinRoom
  } = useRoomChat({ socket, username, defaultRoom: "general" });

  const {
    privateChats,
    activeChat,
    activeState,
    typingList: privateTypingUsers,
    peerInput,
    messageInput,
    setPeerInput,
    setActiveChat,
    openChat,
    sendMessage: sendPrivateMessage,
    loadHistory: loadPrivateHistory,
    handleMessageInputChange: handlePrivateInputChange,
    startSecureChat,
    sendTyping
  } = usePrivateChat({ socket, username });

  const statusLine = useMemo(() => notice ?? statusMessage, [notice, statusMessage]);

  const handleJoinRoom = useCallback(async () => {
    if (!connected) {
      connect();
    }
    const ok = await joinRoom();
    setNotice(ok ? `Joined ${room}` : "Failed to join room");
  }, [connect, connected, joinRoom, room]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Chat App</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
            {statusLine}
          </div>
        </header>

        <ConnectionPanel
          serverUrl={serverUrl}
          username={username}
          room={room}
          connected={connected}
          statusMessage={statusLine}
          onServerUrlChange={setServerUrl}
          onUsernameChange={setUsername}
          onRoomChange={setRoom}
          onConnect={connect}
          onDisconnect={disconnect}
          onJoinRoom={handleJoinRoom}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <RoomPanel
            room={room}
            roomJoined={roomJoined}
            messages={roomMessages}
            typingUsers={roomTypingUsers}
            input={roomInput}
            onInputChange={handleRoomInputChange}
            onSendMessage={sendRoomMessage}
            onLoadOlder={loadOlderMessages}
          />

          <PrivateChatPanel
            privateChats={privateChats}
            activeChat={activeChat}
            activeState={activeState as PrivateChatState}
            typingUsers={privateTypingUsers}
            peerInput={peerInput}
            messageInput={messageInput}
            username={username}
            onPeerInputChange={setPeerInput}
            onMessageInputChange={handlePrivateInputChange}
            onOpenChat={openChat}
            onSelectChat={setActiveChat}
            onLoadHistory={loadPrivateHistory}
            onStartSecure={startSecureChat}
            onSendMessage={sendPrivateMessage}
            onTypingBlur={() => sendTyping(false)}
          />
        </div>
      </div>
    </div>
  );
};
