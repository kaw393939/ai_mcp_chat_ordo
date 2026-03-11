# Sprint 0 — Dependency Violation Fixes

> **Goal:** Establish clean architecture before adding new features.  
> **Spec ref:** §2A Violations 1–4, §4 Pre-work table, §8 Phase 0  
> **Prerequisite:** None

---

## Task 0.1 — BookTools dependency inversion (Violation 1)

**What:** BookTools commands currently import `@/lib/book-library` (infrastructure). Inject `BookRepository` port via constructor instead.

| Item | Detail |
|------|--------|
| **Modify** | `src/core/use-cases/tools/BookTools.ts` — add `BookRepository` constructor param to each command; remove `@/lib/book-library` import |
| **Modify** | `src/lib/chat/tools.ts` — wire `FileSystemBookRepository` into each command constructor |
| **Spec** | §2A Violation 1, NEG-ARCH-1 |
| **Tests** | Existing BookTools tests still pass; `BookTools.ts` has zero imports from `src/lib/` |
| **Verify** | `grep -r "@/lib/book-library" src/core/` returns nothing |

---

## Task 0.2 — Calculator move to core (Violation 2)

**What:** `CalculatorTool.ts` imports from `@/lib/calculator`. Move pure `calculate()` function into core entity layer.

| Item | Detail |
|------|--------|
| **Create** | `src/core/entities/calculator.ts` — pure `calculate()` function (copy from `lib/calculator.ts`) |
| **Modify** | `src/core/use-cases/tools/CalculatorTool.ts` — import from `@/core/entities/calculator` |
| **Modify** | `src/lib/calculator.ts` — re-export from `@/core/entities/calculator` (backward compat) |
| **Spec** | §2A Violation 2, NEG-ARCH-1 |
| **Tests** | Existing calculator tests pass; `CalculatorTool.ts` has zero imports from `src/lib/` |
| **Verify** | `grep -r "@/lib/calculator" src/core/` returns nothing |

---

## Task 0.3 — BookMeta to adapter layer (Violation 3)

**What:** `BookMeta` interface and `BOOKS` constant are in `src/core/entities/library.ts` but contain file-system paths. Move to adapter layer.

| Item | Detail |
|------|--------|
| **Modify** | `src/core/entities/library.ts` — remove `BookMeta` interface and `BOOKS` constant |
| **Modify** | `src/adapters/FileSystemBookRepository.ts` — absorb `BookMeta` + `BOOKS`; update imports |
| **Spec** | §2A Violation 3, NEG-ARCH-1 |
| **Tests** | Existing book tests pass; `src/core/entities/library.ts` exports only pure `Book`/`Chapter` types |
| **Verify** | `grep -r "chaptersDir" src/core/` returns nothing |

---

## Task 0.4 — ChatMessage unification (Violation 4)

**What:** Two competing `ChatMessage` types exist. Unify to single source in `chat-message.ts`.

| Item | Detail |
|------|--------|
| **Modify** | `src/core/entities/MessageFactory.ts` — delete duplicate `ChatMessage` interface; import from `chat-message.ts` |
| **Modify** | `src/core/entities/chat-message.ts` — ensure canonical type has `id`, `role`, `content`, `timestamp`, `parts` |
| **Spec** | §2A Violation 4 |
| **Tests** | All existing tests pass; only one `ChatMessage` export exists in `src/core/entities/` |
| **Verify** | `grep -rn "interface ChatMessage" src/core/entities/` returns exactly 1 result |
