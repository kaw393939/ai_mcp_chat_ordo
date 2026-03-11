# Sprint 1 — Auth Core (inside-out: entities → ports → use cases → adapters)

> **Goal:** All auth business logic exists and is unit-testable. No routes or UI yet.  
> **Spec ref:** §3.1, §3.2, §4, §8 Phase 1 steps 1–8  
> **Prerequisite:** Sprint 0 complete

---

## Task 1.1 — Auth entities

**What:** Create the `Session` entity type and extend `User`-related types.

| Item | Detail |
|------|--------|
| **Create** | `src/core/entities/session.ts` — `Session { id, userId, expiresAt, createdAt }` |
| **Spec** | §4 new files table |
| **Tests** | Type-only file; verified by build |

---

## Task 1.2 — Auth ports

**What:** Define the port interfaces that auth interactors depend on.

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/SessionRepository.ts` — `create()`, `findByToken()`, `delete()`, `deleteExpired()` |
| **Create** | `src/core/use-cases/UserRepository.ts` — `create()`, `findByEmail()`, `findById()`, `findByRole()` |
| **Create** | `src/core/use-cases/PasswordHasher.ts` — `hash(plain): string`, `verify(plain, hash): boolean` |
| **Spec** | §2A Issue B, §4 new files table |
| **Tests** | Interface-only files; verified by build |

---

## Task 1.3 — Auth use cases

**What:** Implement the three auth interactors against the port interfaces (no concrete DB).

| Item | Detail |
|------|--------|
| **Create** | `src/core/use-cases/RegisterUserInteractor.ts` — `UseCase<RegisterRequest, AuthResult>` |
| **Create** | `src/core/use-cases/AuthenticateUserInteractor.ts` — `UseCase<LoginRequest, AuthResult>` |
| **Create** | `src/core/use-cases/ValidateSessionInteractor.ts` — `UseCase<{ token }, SessionUser>` |
| **Spec** | §3.1 registration/login flows, REG-1–9, AUTH-1–7, SESS-1–3 |
| **Key details** | RegisterUser: validate email/password/name → hash → create user → create session. Authenticate: findByEmail → verify (timing-safe dummy hash if not found) → create session. Validate: findByToken → check expiry → return user. |
| **Tests (new)** | Unit tests with stub ports: TEST-REG-01–08 scenarios, TEST-LOGIN-01–05, TEST-SESS-01–04 |
| **Verify** | `npm test -- --reporter verbose` — all new tests green |

---

## Task 1.4 — BcryptHasher adapter + install bcryptjs

**What:** Create the concrete `PasswordHasher` implementation.

| Item | Detail |
|------|--------|
| **Install** | `npm install bcryptjs && npm install -D @types/bcryptjs` |
| **Create** | `src/adapters/BcryptHasher.ts` — implements `PasswordHasher` using bcryptjs, cost from `BCRYPT_ROUNDS` env |
| **Spec** | §2A Issue B adapter #4, REG-2, NEG-SEC-1 |
| **Tests (new)** | `hash()` → `verify()` round-trip; wrong password → false |

---

## Task 1.5 — Database schema extension

**What:** Add `password_hash`, `created_at` to users table; create `sessions` table; add UNIQUE index on email.

| Item | Detail |
|------|--------|
| **Modify** | `src/lib/db/schema.ts` — add `ALTER TABLE users ADD COLUMN` (try/catch), `CREATE TABLE sessions`, `CREATE UNIQUE INDEX idx_users_email` |
| **Spec** | §3.2 full SQL |
| **Tests** | Build passes; existing seed data preserved; `ALTER TABLE` idempotent |

---

## Task 1.6 — SessionDataMapper adapter

**What:** SQLite implementation of `SessionRepository`.

| Item | Detail |
|------|--------|
| **Create** | `src/adapters/SessionDataMapper.ts` — `create()`, `findByToken()`, `delete()`, `deleteExpired()` |
| **Spec** | §2A corrected layer map |
| **Tests (new)** | Integration test: create → findByToken → delete lifecycle; expired sessions not returned |

---

## Task 1.7 — Extend UserDataMapper

**What:** Implement `UserRepository` port on existing `UserDataMapper`. Add `UserRecord` type.

| Item | Detail |
|------|--------|
| **Modify** | `src/adapters/UserDataMapper.ts` — add `create()`, `findByEmail()`, `findById()` methods; define `UserRecord` (with `passwordHash`); implement `UserRepository` interface |
| **Spec** | §2A Issue A (User vs UserRecord), NEG-ARCH-5, NEG-SEC-2 |
| **Tests (new)** | Integration: `create()` → `findByEmail()` → `findById()` chain; duplicate email → UNIQUE constraint error |

---

## Task 1.8 — Auth composition root

**What:** Refactor `src/lib/auth.ts` from grab-bag to composition root that wires interactors to adapters.

| Item | Detail |
|------|--------|
| **Modify** | `src/lib/auth.ts` — wire `RegisterUserInteractor`, `AuthenticateUserInteractor`, `ValidateSessionInteractor` to concrete adapters (`SessionDataMapper`, `UserDataMapper`, `BcryptHasher`). Export convenience functions: `register()`, `login()`, `logout()`, `validateSession()`, `getSessionUser()`. |
| **Spec** | §2A Issue B step 8, follows `book-library.ts` Facade pattern |
| **Tests** | Existing auth tests adapted; build passes |
