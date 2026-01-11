import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ConnectionStatus = "idle" | "connected" | "disconnected" | "error";

type UseSocketResult = {
  socket: Socket | null;
  connected: boolean;
  status: ConnectionStatus;
  statusMessage: string;
  connect: () => void;
  disconnect: () => void;
};

export const useSocket = (serverUrl: string): UseSocketResult => {
  const socketRef = useRef<Socket | null>(null);
  const socketUrlRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Ready");

  const resetSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    socketRef.current = null;
    socketUrlRef.current = null;
    setSocket(null);
    setConnected(false);
    setStatus("idle");
  }, []);

  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const next = io(serverUrl, { autoConnect: false });
    socketUrlRef.current = serverUrl;
    next.on("connect", () => {
      setConnected(true);
      setStatus("connected");
      setStatusMessage("Connected");
    });
    next.on("disconnect", () => {
      setConnected(false);
      setStatus("disconnected");
      setStatusMessage("Disconnected");
    });
    next.on("connect_error", () => {
      setConnected(false);
      setStatus("error");
      setStatusMessage("Connection error");
    });
    socketRef.current = next;
    setSocket(next);
    return next;
  }, [serverUrl]);

  const connect = useCallback(() => {
    const next = ensureSocket();
    if (!next.connected) {
      next.connect();
    }
  }, [ensureSocket]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    if (socketUrlRef.current !== serverUrl) {
      resetSocket();
    }
  }, [resetSocket, serverUrl]);

  useEffect(() => () => resetSocket(), [resetSocket]);

  return useMemo(
    () => ({ socket, connected, status, statusMessage, connect, disconnect }),
    [socket, connected, status, statusMessage, connect, disconnect]
  );
};
