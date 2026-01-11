export type EncryptedPayload = {
  ciphertext: string;
  nonce?: string;
  algorithm: string;
};

export type ChatMessage = {
  id: string;
  room: string;
  user: string;
  text: string | null;
  encrypted: EncryptedPayload | null;
  ts: number;
};

export type DirectMessage = {
  id: string;
  from: string;
  to: string;
  text: string | null;
  encrypted: EncryptedPayload | null;
  ts: number;
};

export type TypingEvent = {
  room: string;
  user: string;
  isTyping: boolean;
  ts: number;
};

export type PrivateTypingEvent = {
  from: string;
  to: string;
  isTyping: boolean;
  ts: number;
};

export type KeyExchangeEvent = {
  from: string;
  to: string;
  publicKey: string;
  algorithm: string;
  ts: number;
};

export type PrivateChatState = {
  withUser: string;
  messages: DirectMessage[];
  typingUsers: Set<string>;
  secure: boolean;
  historyOffset: number;
};

export type SecureSession = {
  key: CryptoKey | null;
  enabled: boolean;
};
