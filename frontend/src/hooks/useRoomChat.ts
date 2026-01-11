import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ChatMessage, TypingEvent } from "../types/chat";

type JoinResponse = { ok: boolean };

export type UseRoomChatOptions = {
  socket: Socket | null;
  username: string;
  defaultRoom: string;
};

export const useRoomChat = ({
  socket,
  username,
  defaultRoom,
}: UseRoomChatOptions) => {
  const [room, setRoomValue] = useState<string>(defaultRoom);
  const [roomJoined, setRoomJoined] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyOffset, setHistoryOffset] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<number | null>(null);

  const setRoom = useCallback((value: string) => {
    setRoomValue(value);
    setRoomJoined(false);
    setMessages([]);
    setHistoryOffset(0);
    setTypingUsers(new Set());
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleHistory = (payload: {
      room: string;
      messages: ChatMessage[];
    }) => {
      setMessages(payload.messages);
      setHistoryOffset(payload.messages.length);
    };

    const handleMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = (event: TypingEvent) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (event.isTyping) {
          next.add(event.user);
        } else {
          next.delete(event.user);
        }
        return next;
      });
    };

    const handleDisconnect = () => {
      setRoomJoined(false);
    };

    socket.on("room_history", handleHistory);
    socket.on("message", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("room_history", handleHistory);
      socket.off("message", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  const joinRoom = useCallback(() => {
    if (!socket) return Promise.resolve(false);
    if (!username || !room) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      socket.emit("join_room", { username, room }, (response: JoinResponse) => {
        setRoomJoined(response.ok);
        resolve(response.ok);
      });
    });
  }, [room, socket, username]);

  const loadOlderMessages = useCallback(() => {
    if (!socket || !roomJoined) return;
    socket.emit(
      "load_history",
      { room, offset: historyOffset, limit: 10 },
      (response: {
        ok: boolean;
        messages?: ChatMessage[];
        nextOffset?: number;
      }) => {
        if (!response.ok || !response.messages) return;
        setMessages((prev) => [...(response.messages as any), ...prev]);
        setHistoryOffset(response.nextOffset ?? historyOffset);
      }
    );
  }, [historyOffset, room, roomJoined, socket]);

  const sendMessage = useCallback(() => {
    if (!socket || !roomJoined) return;
    const text = input.trim();
    if (!text) return;
    socket.emit("send_message", { text }, (response: { ok: boolean }) => {
      if (response.ok) {
        setInput("");
      }
    });
  }, [input, roomJoined, socket]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !roomJoined) return;
      socket.emit(isTyping ? "typing_start" : "typing_stop", { room });
    },
    [room, roomJoined, socket]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (!roomJoined) return;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        sendTyping(false);
      }, 1200);
    },
    [roomJoined, sendTyping]
  );

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    },
    []
  );

  const typingList = useMemo(
    () => Array.from(typingUsers).filter((user) => user !== username),
    [typingUsers, username]
  );

  return {
    room,
    setRoom,
    roomJoined,
    messages,
    typingUsers: typingList,
    input,
    setInput,
    joinRoom,
    loadOlderMessages,
    sendMessage,
    handleInputChange,
  };
};
