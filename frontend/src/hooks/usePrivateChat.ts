import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  DirectMessage,
  KeyExchangeEvent,
  PrivateChatState,
  PrivateTypingEvent,
  SecureSession,
} from "../types/chat";
import {
  decryptPayload,
  deriveSharedKey,
  encryptPayload,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from "../utils/crypto";

export type UsePrivateChatOptions = {
  socket: Socket | null;
  username: string;
};

export const usePrivateChat = ({ socket, username }: UsePrivateChatOptions) => {
  const [privateChats, setPrivateChats] = useState<
    Record<string, PrivateChatState>
  >({});
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [peerInput, setPeerInput] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");
  const typingTimeoutRef = useRef<number | null>(null);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const secureSessionsRef = useRef<Record<string, SecureSession>>({});

  const ensureKeyPair = useCallback(async () => {
    if (!keyPairRef.current) {
      keyPairRef.current = await generateKeyPair();
    }
    return keyPairRef.current;
  }, []);

  const ensureChat = useCallback((peer: string) => {
    setPrivateChats((prev) => {
      if (prev[peer]) return prev;
      return {
        ...prev,
        [peer]: {
          withUser: peer,
          messages: [],
          typingUsers: new Set(),
          secure: false,
          historyOffset: 0,
        },
      };
    });
  }, []);

  const updateChat = useCallback(
    (peer: string, updater: (state: PrivateChatState) => PrivateChatState) => {
      setPrivateChats((prev) => {
        const existing = prev[peer];
        if (!existing) return prev;
        return { ...prev, [peer]: updater(existing) };
      });
    },
    []
  );

  const setSecure = useCallback(
    (peer: string, secure: boolean) => {
      updateChat(peer, (state) => ({ ...state, secure }));
    },
    [updateChat]
  );

  const addMessage = useCallback(
    async (peer: string, message: DirectMessage) => {
      const session = secureSessionsRef.current[peer];
      let hydrated = message;
      if (message.encrypted && session?.key) {
        try {
          const text = await decryptPayload(session.key, message.encrypted);
          hydrated = { ...message, text: text ?? "[Encrypted message]" };
        } catch {
          hydrated = { ...message, text: "[Encrypted message]" };
        }
      }
      updateChat(peer, (state) => ({
        ...state,
        messages: [...state.messages, hydrated],
      }));
    },
    [updateChat]
  );

  useEffect(() => {
    if (!socket) return;

    const handlePrivateMessage = (message: DirectMessage) => {
      const peer = message.from === username ? message.to : message.from;
      ensureChat(peer);
      void addMessage(peer, message);
    };

    const handlePrivateTyping = (event: PrivateTypingEvent) => {
      const peer = event.from;
      ensureChat(peer);
      updateChat(peer, (state) => {
        const nextTyping = new Set(state.typingUsers);
        if (event.isTyping) {
          nextTyping.add(event.from);
        } else {
          nextTyping.delete(event.from);
        }
        return { ...state, typingUsers: nextTyping };
      });
    };

    const handleKeyExchange = async (event: KeyExchangeEvent) => {
      if (event.to !== username) return;
      ensureChat(event.from);
      const keyPair = await ensureKeyPair();
      const peerPublicKey = await importPublicKey(event.publicKey);
      const sharedKey = await deriveSharedKey(
        keyPair.privateKey,
        peerPublicKey
      );
      secureSessionsRef.current[event.from] = { key: sharedKey, enabled: true };
      setSecure(event.from, true);

      const publicKey = await exportPublicKey(keyPair.publicKey);
      socket.emit("key_exchange", {
        to: event.from,
        publicKey,
        algorithm: "ECDH-AES-GCM",
      });
    };

    socket.on("private_message", handlePrivateMessage);
    socket.on("private_typing", handlePrivateTyping);
    socket.on("key_exchange", handleKeyExchange);

    return () => {
      socket.off("private_message", handlePrivateMessage);
      socket.off("private_typing", handlePrivateTyping);
      socket.off("key_exchange", handleKeyExchange);
    };
  }, [
    addMessage,
    ensureChat,
    ensureKeyPair,
    setSecure,
    socket,
    updateChat,
    username,
  ]);

  const openChat = useCallback(
    (peer: string) => {
      const normalized = peer.trim();
      if (!normalized) return;
      ensureChat(normalized);
      setActiveChat(normalized);
    },
    [ensureChat]
  );

  const sendMessage = useCallback(async () => {
    if (!socket || !activeChat) return;
    const text = messageInput.trim();
    if (!text) return;

    const session = secureSessionsRef.current[activeChat];
    if (session?.enabled && session.key) {
      const encrypted = await encryptPayload(session.key, text);
      socket.emit("private_message", { to: activeChat, encrypted });
    } else {
      socket.emit("private_message", { to: activeChat, text });
    }

    setMessageInput("");
  }, [activeChat, messageInput, socket]);

  const loadHistory = useCallback(() => {
    if (!socket || !activeChat) return;
    const state = privateChats[activeChat];
    const offset = state?.historyOffset ?? 0;

    socket.emit(
      "load_private_history",
      { with: activeChat, offset, limit: 20 },
      (response: {
        ok: boolean;
        messages?: DirectMessage[];
        nextOffset?: number;
      }) => {
        if (!response.ok || !response.messages) return;
        const session = secureSessionsRef.current[activeChat];
        void (async () => {
          const hydrated = await Promise.all(
            (response.messages ?? []).map(async (message) => {
              if (!message.encrypted || !session?.key) return message;
              try {
                const text = await decryptPayload(
                  session.key,
                  message.encrypted
                );
                return { ...message, text: text ?? "[Encrypted message]" };
              } catch {
                return { ...message, text: "[Encrypted message]" };
              }
            })
          );
          updateChat(activeChat, (existing) => ({
            ...existing,
            messages: hydrated,
            historyOffset: response.nextOffset ?? offset,
          }));
        })();
      }
    );
  }, [activeChat, privateChats, socket, updateChat]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !activeChat) return;
      socket.emit(isTyping ? "private_typing_start" : "private_typing_stop", {
        to: activeChat,
      });
    },
    [activeChat, socket]
  );

  const handleMessageInputChange = useCallback(
    (value: string) => {
      setMessageInput(value);
      if (!activeChat) return;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        sendTyping(false);
      }, 1200);
    },
    [activeChat, sendTyping]
  );

  const startSecureChat = useCallback(async () => {
    if (!socket || !activeChat) return;
    const keyPair = await ensureKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    socket.emit("key_exchange", {
      to: activeChat,
      publicKey,
      algorithm: "ECDH-AES-GCM",
    });
    secureSessionsRef.current[activeChat] = {
      key: null,
      enabled: true,
    };
    setSecure(activeChat, true);
  }, [activeChat, ensureKeyPair, setSecure, socket]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    },
    []
  );

  const activeState = activeChat ? privateChats[activeChat] : null;

  const typingList = useMemo(() => {
    if (!activeState) return [];
    return Array.from(activeState.typingUsers).filter(
      (user) => user !== username
    );
  }, [activeState, username]);

  return {
    privateChats,
    activeChat,
    activeState,
    peerInput,
    messageInput,
    typingList,
    setPeerInput,
    setMessageInput,
    setActiveChat,
    openChat,
    sendMessage,
    loadHistory,
    handleMessageInputChange,
    startSecureChat,
    sendTyping,
  };
};
