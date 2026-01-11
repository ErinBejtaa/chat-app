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

export type UserEvent =
  | { type: "private_message"; payload: DirectMessage }
  | { type: "private_typing"; payload: PrivateTypingEvent }
  | { type: "key_exchange"; payload: KeyExchangeEvent };
