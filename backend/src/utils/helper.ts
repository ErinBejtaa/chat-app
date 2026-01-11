export const roomListKey = (room: string) => `room:${room}:messages`;

export const roomTypingChannel = (room: string) => `room:${room}:typing`;

export const userChannel = (user: string) => `user:${user}`;

export const directListKey = (userA: string, userB: string) => {
  const [left, right] = [userA, userB].sort();
  return `dm:${left}:${right}:messages`;
};

export const parseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const parseList = <T>(items: string[]) =>
  items
    .map(parseJson<T>)
    .filter((msg): msg is T => msg !== null)
    .reverse();
