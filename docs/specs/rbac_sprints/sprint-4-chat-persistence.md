# Sprint 4 — Chat Persistence

> **Goal:** Authenticated users get persistent conversation history.  
> **Spec ref:** §3.5, §7, §8 Phase 3  
> **Prerequisite:** Sprint 3 complete

---

## Task 4.1 — Chat entities + schema

**What:** Create conversation/message entity types and DB tables.

| Item | Detail |
|------|--------|
| **Create** | `src/core/entities/conversation.ts` — `Conversation`, `ConversationSummary`, `Message`, `NewMessage` |
| **Modify** | `src/lib/db/schema.ts` — add `conversations` and `messages` tables per §3.2 SQL |
| **Spec** | §3.2 (conversations + messages SQL), §4 |
| **Tests** | Build passes; schema migration idempotent |

---

## Task 4.2 — Chat ports

**What:** Define persistence contracts for conversations and messages.

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/ConversationRepository.ts` — `create()`, `listByUser()`, `findById()`, `delete()`, `updateTitle()` |
| **Create** | `src/core/use-cases/MessageRepository.ts` — `create()`, `listByConversation()`, `countByConversation()` |
| **Spec** | §2A Issue C, §3.5 port interfaces |
| **Tests** | Interface-only; verified by build |

---

## Task 4.3 — ConversationInteractor (use case)

**What:** CRUD orchestration with ownership enforcement and limit checks.

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/ConversationInteractor.ts` — create, get, list, delete with `userId` ownership checks; message count validation (100 hard limit); conversation count check (50 soft limit, auto-delete oldest) |
| **Spec** | §2A Issue C, CHAT-1–10, NEG-DATA-1–4, NEG-ARCH-2 |
| **Key details** | Ownership: `conversation.user_id !== currentUser.id` → 404 (not 403, NEG-SEC-6). Message limit: count ≥ 100 → 400. Conversation limit: count ≥ 50 → delete oldest. |
| **Tests (new)** | Ownership enforcement (TEST-CHAT-03); message limit (TEST-CHAT-09); conversation count limit (TEST-CHAT-10) |

---

## Task 4.4 — Chat data mappers (adapters)

**What:** SQLite implementations of conversation and message repositories.

| Item | Detail |
|------|--------|
| **Create** | `src/adapters/ConversationDataMapper.ts` — implements `ConversationRepository` |
| **Create** | `src/adapters/MessageDataMapper.ts` — implements `MessageRepository` |
| **Spec** | §2A Issue C adapters |
| **Tests (new)** | Integration: create → listByUser → findById → delete (CASCADE). Messages: create → listByConversation (ordered). Parts JSON round-trip. |

---

## Task 4.5 — Conversation API routes

**What:** REST endpoints for conversation CRUD.

| Item | Detail |
|------|--------|
| **Create** | `src/app/api/conversations/route.ts` — GET (list) + POST (create) |
| **Create** | `src/app/api/conversations/[id]/route.ts` — GET (with messages) + DELETE |
| **Spec** | §12 Conversations API reference, CHAT-5–8, NEG-SEC-6 |
| **Key details** | All routes require valid session (middleware enforces cookie, handler validates). Ownership violations → 404 (not 403). |
| **Tests (new)** | TEST-RBAC-05 (ANONYMOUS → 401); TEST-CHAT-06 (list ordered by updated_at); TEST-CHAT-05 (delete cascades) |

---

## Task 4.6 — Chat stream persistence integration

**What:** Update `/api/chat/stream` to persist messages for authenticated users.

| Item | Detail |
|------|--------|
| **Modify** | `src/app/api/chat/stream/route.ts` — full 9-step flow from §3.5: accept `conversationId`, create conversation if needed, persist user message before Anthropic call, persist assistant message after stream completes, return `conversationId` in first SSE event |
| **Spec** | §3.5 flow (9 steps), CHAT-1–4, CHAT-6, CHAT-9, NEG-DATA-2 |
| **Key details** | ANONYMOUS → skip all persistence (no conversationId in response). Authenticated → full persistence. Agent-loop → single assistant row with complete parts array. |
| **Tests (new)** | TEST-CHAT-01 (first message creates conv), TEST-CHAT-02 (appends), TEST-CHAT-08 (ANONYMOUS not persisted) |

---

## Task 4.7 — Client-side conversation state

**What:** Extend `useGlobalChat` to track conversations and integrate with server.

| Item | Detail |
|------|--------|
| **Modify** | `src/hooks/useGlobalChat.tsx` — add `conversationId` to state; add `conversations` list; add `LOAD_CONVERSATION`, `NEW_CONVERSATION`, `SET_CONVERSATIONS` actions; include `conversationId` in POST body; parse from first SSE event |
| **Spec** | §3.5 client-side, CHAT-4, CHAT-10, UI-6–7 |
| **Tests** | Build passes; manual verification of conversation switching |

---

## Task 4.8 — Conversation UI

**What:** Add conversation sidebar/selector and "New Chat" button.

| Item | Detail |
|------|--------|
| **Create/Modify** | Conversation sidebar or dropdown component; "New Chat" button; conversation title in header; delete conversation option |
| **Spec** | §3.5 UI additions, UI-6, UI-7, TEST-CHAT-07, TEST-PAGE-02 |
| **Tests** | Manual verification; build passes |
