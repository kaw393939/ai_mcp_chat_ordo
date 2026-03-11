# Sprint 5 — Polish & Hardening

> **Goal:** Production-ready quality. Error handling, loading states, observability.  
> **Spec ref:** §8 Phase 4  
> **Prerequisite:** Sprint 4 complete

---

## Task 5.1 — Session cleanup

**What:** Expired session pruning.

| Item | Detail |
|------|--------|
| **Modify** | Session cleanup logic — opportunistic (delete on read if expired) + startup prune via `SessionRepository.deleteExpired()` |
| **Spec** | AUTH-7 |
| **Tests** | Integration: create expired session → prune → verify deleted |

---

## Task 5.2 — Conversation auto-title

**What:** Auto-generate conversation titles from first user message.

| Item | Detail |
|------|--------|
| **Modify** | `ConversationInteractor.create()` — auto-title from first user message, truncated to 80 chars |
| **Spec** | CHAT-3, TEST-CHAT-01 |
| **Tests** | Unit: long message → truncated to 80 chars |

---

## Task 5.3 — Client error handling

**What:** Proper handling of 401/403 responses in the client.

| Item | Detail |
|------|--------|
| **Modify** | Client-side fetch wrappers / hooks — redirect to login on 401; show "access denied" on 403 |
| **Spec** | TEST-EDGE-01, TEST-EDGE-04 |
| **Tests** | Manual verification |

---

## Task 5.4 — Loading states

**What:** Add loading indicators for auth and conversation operations.

| Item | Detail |
|------|--------|
| **Modify** | Login/register forms — loading spinner during submission |
| **Modify** | Conversation sidebar — loading state during list fetch and conversation switch |
| **Spec** | UI polish (Phase 4 items 4–5) |
| **Tests** | Manual verification |

---

## Task 5.5 — LoggingDecorator for new interactors

**What:** Wrap all new use cases with the existing `LoggingDecorator` for observability.

| Item | Detail |
|------|--------|
| **Modify** | `src/lib/auth.ts` — wrap `RegisterUserInteractor`, `AuthenticateUserInteractor`, `ValidateSessionInteractor` with `LoggingDecorator` |
| **Modify** | Conversation composition root — wrap `ConversationInteractor` with `LoggingDecorator` |
| **Spec** | §2A Design Pattern Summary (Decorator row), Phase 4 item 6 |
| **Tests** | Build + existing tests pass; verify log output manually |
