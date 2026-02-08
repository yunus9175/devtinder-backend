# Frontend: Chat implementation — what to manage and API URLs

This doc lists **everything the frontend must manage** and the **exact API URLs** to use. All requests must send auth (cookies with `credentials: 'include'` or your auth header).

---

## Base URLs (set in your FE env)

| Env / Config | Example | Use |
|--------------|---------|-----|
| **API base** | `http://localhost:8080` | REST API root (no path) |
| **API base path** | `` or `/api` | If backend uses a prefix (see backend `.env`: `API_BASE_PATH` or derived from `API_BASE_URL`) |
| **Full API root** | `http://localhost:8080` or `http://localhost:8080/api` | Base for all REST URLs below |
| **Socket URL** | Same as API base (e.g. `http://localhost:8080`) | Socket.IO connect URL |
| **Socket path** | `/socket.io` or `/api/socket.io` | Socket path when base path is used |

**Example:** If backend runs on `http://localhost:8080` with `API_BASE_PATH=/api`:

- API root = `http://localhost:8080/api`
- Socket = connect to `http://localhost:8080` with option `path: '/api/socket.io'`

Define in your app (e.g. `.env` or config):

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_API_BASE_PATH=/api
```

Then:

- `API_ROOT = VITE_API_BASE_URL + (VITE_API_BASE_PATH || '')`  → `http://localhost:8080/api`
- Socket: `io(VITE_API_BASE_URL, { path: (VITE_API_BASE_PATH || '') + '/socket.io' })`

---

## 1. REST API — URLs and usage

Use `API_ROOT` as the base for every URL. Send cookies (e.g. `fetch(..., { credentials: 'include' })`).

### 1.1 Get or create direct conversation (do this when user opens a chat)

**When:** User taps/clicks to open chat with another user (e.g. from matches list).

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **URL** | `${API_ROOT}/conversations/direct?withUserId=${otherUserId}` |
| **Example** | `GET http://localhost:8080/api/conversations/direct?withUserId=674a1b2c3d4e5f6789abcdef` |
| **Query** | `withUserId` (required) — the other user’s `_id` |
| **Response 200** | `{ conversation: { _id, type, participants, name, createdAt } }` |

**What to do:** Store `response.conversation._id` as the **conversationId** for this chat screen (state/context). Use it for loading messages, joining socket room, and sending messages.

---

### 1.2 Load message history (when chat screen opens or “load more”)

**When:** After you have `conversationId` (from 1.1), load the latest messages; optionally use `before` for “load more” (older messages).

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **URL (by conversation)** | `${API_ROOT}/messages?conversationId=${conversationId}&limit=20` |
| **URL (optional “load more”)** | `${API_ROOT}/messages?conversationId=${conversationId}&limit=20&before=${oldestMessageId}` |
| **Example** | `GET http://localhost:8080/api/messages?conversationId=674a1b2c3d4e5f6789abcdef&limit=20` |
| **Query** | `conversationId` (recommended) or `withUserId` (other user id). `limit` (default 20, max 100). `before` (optional) = message `_id` for pagination. |
| **Response 200** | `{ messages: [ { _id, conversationId, senderId, content, readBy, createdAt }, ... ] }` |

**What to do:** Keep a **messages array** in state. First load: set messages = `response.messages` (oldest first; append new ones at bottom). “Load more”: prepend older messages from `response.messages` to the list.

---

### 1.3 Mark a message as read (when user sees the message)

**When:** When the current user views a message (e.g. when it appears in the viewport or when opening the chat).

| Item | Value |
|------|--------|
| **Method** | `PATCH` |
| **URL** | `${API_ROOT}/messages/${messageId}/read` |
| **Example** | `PATCH http://localhost:8080/api/messages/674a1b2c3d4e5f6789abcdef/read` |
| **Body** | None |
| **Response 200** | `{ message: "Marked as read", readBy: [ { userId, readAt }, ... ] }` |

**What to do:** Call this for messages that are “in view” and not yet in `readBy` for current user. Optionally update local message’s `readBy` from the response.

---

## 2. Socket.IO — connection and events

**When:** Connect when the user is logged in (e.g. after login or on app load). Use the same origin/credentials as your API.

**Connect:**

```js
import { io } from 'socket.io-client';

const socket = io(API_BASE_URL, {
  path: (API_BASE_PATH || '') + '/socket.io',
  withCredentials: true,  // if you use cookies
});
```

**What to manage:**

- One **socket instance** (e.g. in context or store).
- After connect: emit **registerPresence** once with current user id.
- When opening a chat: **joinChat** with `conversationId`.
- When leaving chat or switching conversation: **leaveChat** with `conversationId`.
- Keep **messages** in state and update from both API (history) and socket (`receiveMessage`).

---

### 2.1 Register presence (once after connect)

**When:** Right after socket connects (and you have the current user).

```js
socket.emit('registerPresence', { userId: currentUser._id });
```

No response. Backend broadcasts `userOnline` / `userOffline` to others.

---

### 2.2 Join chat room (when user opens a conversation)

**When:** User opens a chat screen (you already have `conversationId` from API 1.1).

```js
socket.emit('joinChat', { conversationId: conversationId });
```

Alternative (if you don’t have conversationId yet):

```js
socket.emit('joinChat', { userId: currentUser._id, targetUserId: otherUser._id });
```

**What to do:** Always join with `conversationId` after fetching it from 1.1 so the room matches the backend (same id used for sending and receiving).

---

### 2.3 Send message (saved in DB; backend broadcasts the saved message)

**When:** User sends a message from the chat UI.

```js
socket.emit('sendMessage', {
  conversationId: conversationId,
  senderId: currentUser._id,
  content: 'Hello',
});
```

Backend saves the message and emits **receiveMessage** to everyone in the room (including sender) with the **saved** message object.

**What to do:** On **receiveMessage**, add or update the message in your list by `_id` (so you don’t duplicate and you show the same data as the API). You can do optimistic UI and then replace/merge by `_id` when `receiveMessage` arrives.

---

### 2.4 Receive message (from backend after save)

**When:** Listen on the socket.

```js
socket.on('receiveMessage', (message) => {
  // message = { _id, conversationId, senderId, content, readBy, createdAt }
  setMessages(prev => {
    const exists = prev.some(m => m._id === message._id);
    if (exists) return prev.map(m => m._id === message._id ? message : m);
    return [...prev, message];
  });
});
```

**What to do:** Treat this as the single source of truth for the message (with `_id` and `createdAt`). Use one list for both history (from API 1.2) and live messages (from this event).

---

### 2.5 Typing indicators

**Emit when user types / stops typing:**

```js
socket.emit('typing', { conversationId });
socket.emit('stopTyping', { conversationId });
```

**Listen:**

```js
socket.on('userTyping', ({ userId }) => { /* show typing for userId */ });
socket.on('userStoppedTyping', ({ userId }) => { /* hide typing for userId */ });
```

---

### 2.6 Leave chat room (when closing chat or switching conversation)

**When:** User closes the chat or opens another conversation.

```js
socket.emit('leaveChat', { conversationId });
```

---

## 3. End-to-end flow (what to manage on FE)

| Step | Action | What you manage |
|------|--------|------------------|
| 1 | User opens chat with **otherUser** | `otherUser._id` |
| 2 | **GET** `${API_ROOT}/conversations/direct?withUserId=${otherUser._id}` | Store `conversationId = response.conversation._id` |
| 3 | **GET** `${API_ROOT}/messages?conversationId=${conversationId}&limit=20` | Set `messages = response.messages` (oldest first) |
| 4 | Socket: `joinChat({ conversationId })` | Same `conversationId` |
| 5 | User sends text | `sendMessage({ conversationId, senderId: currentUser._id, content })` |
| 6 | Socket: `receiveMessage` | Append/update message in `messages` by `_id` |
| 7 | User leaves chat | `leaveChat({ conversationId })` |

**State to keep:**

- **conversationId** — for the currently open chat (from API 1.1).
- **messages** — array of message objects (from API 1.2 + socket `receiveMessage`).
- **socket** — one shared instance; register presence once, join/leave by `conversationId`.

---

## 4. Message object shape (same from API and Socket)

Use this type for each item in your `messages` array:

```ts
{
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readBy: Array<{ userId: string; readAt: string }>;
  createdAt: string;  // ISO date
}
```

- **GET /messages** returns `{ messages: Message[] }`.
- **receiveMessage** sends one `Message` object.

Deduplicate and sort by `createdAt` (oldest first) so history and new messages stay in one list.

---

## 5. Quick reference — API URLs (replace placeholders)

Assume `API_ROOT = http://localhost:8080/api`.

| Purpose | Method | URL |
|--------|--------|-----|
| Get/create direct conversation | GET | `http://localhost:8080/api/conversations/direct?withUserId=OTHER_USER_ID` |
| Get message history | GET | `http://localhost:8080/api/messages?conversationId=CONVERSATION_ID&limit=20` |
| Load older messages | GET | `http://localhost:8080/api/messages?conversationId=CONVERSATION_ID&limit=20&before=OLDEST_MESSAGE_ID` |
| Mark as read | PATCH | `http://localhost:8080/api/messages/MESSAGE_ID/read` |

**Socket:** Connect to `http://localhost:8080` with `path: '/api/socket.io'` (if your backend uses `API_BASE_PATH=/api`). If no base path, use `path: '/socket.io'`.

---

## 6. Optional: list of conversations (for “chat list” screen)

Currently the backend does **not** expose a “list my conversations” endpoint. For a chat list you can:

- Either use your existing “matches” or “connections” list and treat each as the “other user” for a direct chat (then use 1.1 + 1.2 per conversation when they open a chat), or
- Later add a backend endpoint like `GET /conversations` returning the user’s conversations (with last message / unread count). The frontend would then call that to build the list and use the same `conversationId` and APIs above for each row.

For now, you only need the **other user id** (e.g. from matches) → get conversation (1.1) → load messages (1.2) → join room and send/receive via socket.
