This is a real-time chat app built with Node.js, Socket.io, and Redis.
It supports rooms, DMs, message history, and horizontal scaling.

Everything runs in Docker. To start simply run:

```bash
docker compose up --build
```

That starts:

- Node.js API + Socket.io in port 3000
- Redis in port 6379
- Frontend in port 5173

## What this application does

- WebSocket chat via Socket.io
- Message history stored in Redis
- Pub/Sub for multi-instance scaling
- Simple username-based identity
- Optional end-to-end encrypted messages

## High-level flow

1. Server starts, loads env vars, connects to Redis
2. Socket.io starts
3. Clients connect and send join_room event
4. Messages go:
   Socket → Redis → Pub/Sub → all servers → all clients

Redis is used both as:

- a database (in-memtory message history)
- and a message bus

## Redis usage

Two Redis connections:

- redis – normal commands (LPUSH, LRANGE, etc)
- redisSub – Pub/Sub only

Redis doesn’t allow mixing Pub/Sub and normal commands on the same connection, so they must be separate.

## Message storage

Messages are stored in Redis lists.

room:<room>:messages  
 dm:<userA>:<userB>:messages

We use lists because:

- LPUSH is fast
- LRANGE works well for pagination
- LTRIM makes it easy to limit history

Newest messages are always at the front of the list.

## Pub/Sub

Used so we can run multiple app instances and stay in sync.

Channels:

- room:<room>:messages
- room:<room>:typing
- user:<username> (for DMs + private typing)

When a message is sent:

1. It’s saved to Redis
2. It’s published
3. Every server broadcasts it to connected clients

## Socket logic

Everything lives in src/sockets/handlers.ts.

Events:

- join_room
- send_message
- typing_start / typing_stop
- private_message
- load_history
- load_private_history

Users only identify by username.
When you join a room, the server:

- validates your name + room
- subscribes to Redis channels
- sends you recent history

## Encryption

The server never decrypts anything.

Clients can do a key_exchange, then send messages like:

{
"encrypted": {
"ciphertext": "...",
"nonce": "...",
"algorithm": "ECDH-AES-GCM"
}
}

The backend only stores and forwards it.

## Validation

All incoming socket payloads are validated with Zod:

- usernames
- rooms
- messages
- encrypted payloads etc.

## Shutdown

On SIGINT / SIGTERM:

- Socket.io closes
- Redis connections close
