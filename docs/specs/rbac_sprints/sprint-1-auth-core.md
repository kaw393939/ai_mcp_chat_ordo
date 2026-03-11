# Sprint 1 — Auth Core (inside-out: entities → ports → use cases → adapters)

> **Goal:** All auth business logic exists and is unit-testable. No routes or UI yet.  
> **Spec ref:** §3.1, §3.2, §4, §8 Phase 1 steps 1–8  
> **Prerequisite:** Sprint 0 complete  
> **Sprint 0 outcomes:** Clean layer boundaries established — BookRepository DI, calculator in core, BookMeta in adapter, single canonical ChatMessage. The `book-library.ts` facade pattern (composition root exposing convenience functions) is the model for `auth.ts`.

---

## Task 1.1 — Auth entities

**What:** Create the `Session` entity type. The `User` entity at `src/core/entities/user.ts` already exists with the correct shape (`id`, `email`, `name`, `roles: RoleName[]`).

| Item | Detail |
|------|--------|
| **Create** | `src/core/entities/session.ts` — `Session { id: string, userId: string, expiresAt: string, createdAt: string }` (dates as ISO 8601 strings, matching SQLite TEXT storage) |
| **Existing** | `src/core/entities/user.ts` — already exports `User` and `RoleName`; no changes needed |
| **Spec** | §4 new files table |
| **Tests** | Type-only file; verified by build |

---

## Task 1.2 — Auth ports

**What:** Define the port interfaces that auth interactors depend on.

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/SessionRepository.ts` — `create(session: Session): Promise<void>`, `findByToken(id: string): Promise<Session \| null>`, `delete(id: string): Promise<void>`, `deleteExpired(): Promise<void>` |
| **Create** | `src/core/use-cases/UserRepository.ts` — `create(user): Promise<User>`, `findByEmail(email: string): Promise<UserRecord \| null>`, `findById(id: string): Promise<User \| null>` |
| **Create** | `src/core/use-cases/PasswordHasher.ts` — `hash(plain: string): Promise<string>`, `verify(plain: string, hash: string): Promise<boolean>` |
| **Spec** | §2A Issue B, §4 new files table |
| **Tests** | Interface-only files; verified by build |

**Note:** `UserRepository` does NOT include `findByRole()`. No core interactor needs it. The existing `UserDataMapper.findByActiveRole()` remains as an adapter-specific method (used by mock auth until Sprint 2 replaces it).

---

## Task 1.3 — Auth use cases

**What:** Implement the three auth interactors against the port interfaces (no concrete DB). All implement the established `UseCase<TRequest, TResponse>` interface from `src/core/common/UseCase.ts`.

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/RegisterUserInteractor.ts` — `UseCase<RegisterRequest, AuthResult>` |
| **Create** | `src/core/use-cases/AuthenticateUserInteractor.ts` — `UseCase<LoginRequest, AuthResult>` |
| **Create** | `src/core/use-cases/ValidateSessionInteractor.ts` — `UseCase<{ token: string }, User>` |
| **Spec** | §3.1 registration/login flows, REG-1–9, AUTH-1–7, SESS-1–3 |
| **Key details** | See below |
| **Tests (new)** | Co-located unit tests with stub ports (matching existing pattern — e.g. `LibrarySearchInteractor.test.ts`): `RegisterUserInteractor.test.ts` (TEST-REG-01–08), `AuthenticateUserInteractor.test.ts` (TEST-LOGIN-01–05), `ValidateSessionInteractor.test.ts` (TEST-SESS-01–04) |
| **Verify** | `npm test -- --reporter verbose` — all new tests green |

**Interactor details:**

- **RegisterUserInteractor:** Constructor takes `UserRepository`, `PasswordHasher`, `SessionRepository`. Flow: validate email/password/name → check email uniqueness via `UserRepository.findByEmail()` → hash password via `PasswordHasher.hash()` → create user via `UserRepository.create()` with role AUTHENTICATED → create session via `SessionRepository.create()` → return `AuthResult { user, sessionToken }`.
- **AuthenticateUserInteractor:** Constructor takes `UserRepository`, `PasswordHasher`, `SessionRepository`. Flow: `findByEmail()` → `verify(password, storedHash)` → create session → return `AuthResult`. **Timing safety:** when email not found, MUST still call `PasswordHasher.verify()` against a dummy hash before returning error (prevents timing-based email enumeration — see TEST-LOGIN-03).
- **ValidateSessionInteractor:** Constructor takes `SessionRepository`, `UserRepository`. Flow: `findByToken()` → check expiry → `findById(session.userId)` → return `User`.

**Important:** Interactors return `AuthResult { user: User, sessionToken: string }` — they do NOT set cookies. Cookie handling is a route handler concern (Sprint 2).

---

## Task 1.4 — BcryptHasher adapter + install bcryptjs

**What:** Create the concrete `PasswordHasher` implementation.

| Item | Detail |
|------|--------|
| **Install** | `npm install bcryptjs && npm install -D @types/bcryptjs` |
| **Create** | `src/adapters/BcryptHasher.ts` — implements `PasswordHasher` from `@/core/use-cases/PasswordHasher` using bcryptjs, cost from `BCRYPT_ROUNDS` env (default 12) |
| **Spec** | §2A Issue B adapter #4, REG-2, NEG-SEC-1 |
| **Tests (new)** | Co-located `src/adapters/BcryptHasher.test.ts`: `hash()` → `verify()` round-trip; wrong password → false |

---

## Task 1.5 — Database schema extension

**What:** Add `password_hash`, `created_at` to users table; create `sessions` table.

| Item | Detail |
|------|--------|
| **Modify** | `src/lib/db/schema.ts` — add `ALTER TABLE users ADD COLUMN password_hash TEXT` and `ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))` (each wrapped in try/catch for idempotency — SQLite throws if column already exists); add `CREATE TABLE IF NOT EXISTS sessions`; add indexes `idx_sessions_user`, `idx_sessions_expires` |
| **Spec** | §3.2 (users + sessions SQL only — conversations/messages tables are Sprint 4 scope) |
| **Tests** | Build passes; existing seed data preserved (4 mock users get NULL `password_hash` — they cannot log in via normal flow, which is correct per §3.2) |

**Note:** The existing DDL already has `email TEXT NOT NULL UNIQUE` on the users table. An explicit `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email` is optional for query optimization but the constraint is already enforced.

---

## Task 1.6 — SessionDataMapper adapter

**What:** SQLite implementation of `SessionRepository`.

| Item | Detail |
|------|--------|
| **Create** | `src/adapters/SessionDataMapper.ts` — implements `SessionRepository` from `@/core/use-cases/SessionRepository`; constructor takes `Database` (better-sqlite3); methods: `create()`, `findByToken()`, `delete()`, `deleteExpired()` |
| **Spec** | §2A corrected layer map |
| **Tests (new)** | Co-located `src/adapters/SessionDataMapper.test.ts`: create → findByToken → delete lifecycle; expired sessions not returned by `findByToken()` |

---

## Task 1.7 — Extend UserDataMapper

**What:** Implement `UserRepository` port on existing `UserDataMapper`. Add `UserRecord` type.

| Item | Detail |
|------|--------|
| **Modify** | `src/adapters/UserDataMapper.ts` — implement `UserRepository` interface; add `create()`, `findByEmail()`, `findById()` methods; define adapter-local `UserRecord` type (includes `passwordHash` — separates storage-aware type from public `User` entity per §2A Issue A) |
| **Preserve** | `findByActiveRole()` — this existing method is NOT part of the `UserRepository` port but remains on the class for mock auth compatibility (used by `auth.ts` until Sprint 2 replaces mock flow) |
| **Spec** | §2A Issue A (User vs UserRecord), NEG-ARCH-5, NEG-SEC-2 |
| **Tests (new)** | Extend existing `src/adapters/UserDataMapper.test.ts`: add `create()` → `findByEmail()` → `findById()` chain; duplicate email → UNIQUE constraint error |

---

## Task 1.8 — Auth composition root

**What:** Refactor `src/lib/auth.ts` from grab-bag helper functions into a composition root that wires interactors to adapters (following the `book-library.ts` facade pattern established in Sprint 0).

| Item | Detail |
|------|--------|
| **Modify** | `src/lib/auth.ts` — wire `RegisterUserInteractor`, `AuthenticateUserInteractor`, `ValidateSessionInteractor` to concrete adapters (`SessionDataMapper`, `UserDataMapper`, `BcryptHasher`). Export new convenience functions: `register()`, `login()`, `logout()`, `validateSession()`. |
| **Preserve** | `setMockSession()`, `getSessionUser()`, `requireRole()`, and type exports `RoleName`, `SessionUser` — these are used by existing code (`AccountMenu.tsx`, `useMockAuth.ts`, route handlers) and will be replaced in Sprint 2 |
| **Spec** | §2A Issue B step 8, follows `book-library.ts` Facade pattern |
| **Tests** | Existing auth consumers still work; build passes; mock auth flow unbroken |
