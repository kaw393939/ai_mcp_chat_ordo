This is strong. It reads like a real implementation spec, not a brainstorm.

My take: **good enough to build from, but not quite “locked” yet**.
I’d call it about **8/10**.

What’s very good:

* Clear problem framing
* Clean metaphor boundary: **Publisher → Librarian → Search**
* Good scope discipline
* Good incremental path
* Security and test sections are present
* Sprint 0 / Sprint 1 split is sensible
* You’re designing for future ingestion without overbuilding the publisher now

What I think still needs tightening before implementation:

### 1. It needs requirement IDs

Your new process guide is stricter than this spec. This spec should have things like:

* `LIBRARIAN-10` auto-discovery from `_corpus/`
* `LIBRARIAN-20` manifest validation
* `LIBRARIAN-30` admin-only tool access
* `LIBRARIAN-40` zip import safety
* `LIBRARIAN-50` cache invalidation
* `LIBRARIAN-60` orphan embedding cleanup

Right now it is readable, but not fully traceable.

### 2. Directory naming is a little inconsistent

You say:

* folder may be `software-engineering-book/`
* manifest slug is `software-engineering`
* tool creates `_corpus/{slug}-book/`

That works, but it creates unnecessary dual identity: **directory name** vs **book slug**.

I would strongly prefer one of these:

* **Option A:** directory name must equal slug

  * `_corpus/software-engineering/`
* **Option B:** directory name is opaque, but slug is canonical and uniqueness is enforced

I’d choose **A**. Simpler, less error-prone.

### 3. `number.localeCompare()` is dangerous

If `number` can be Roman numerals or digits, lexical sort is not a real ordering rule.

Examples:

* `"X"` vs `"V"`
* `"10"` vs `"2"`

You should define one of these explicitly:

* `number` is display-only, and directory order / explicit `order` field controls sort
* or add `sortOrder: number` to `book.json`

Best answer: add **`sortOrder: number`** and keep `number` purely decorative.

### 4. `librarian_list` bypassing the repository is a design smell

You say it reads manifests directly because `BookMeta` does not expose `domain`/`tags`.

That is a warning sign. It means you are creating **two truth paths**:

* repository path
* direct filesystem path

That often rots.

Better options:

* enrich `BookMeta`
* or introduce a dedicated `CorpusCatalog` abstraction and let both repository and tools use it

I would prefer a **small `CorpusCatalog` / manifest reader** abstraction.

### 5. Security path check should be stronger

This pattern is not quite sufficient:

```ts
resolved.startsWith(path.resolve(corpusDir))
```

Because sibling-prefix issues can happen.

Safer pattern is based on `path.relative()`:

```ts
const rel = path.relative(corpusRoot, resolved);
if (rel.startsWith("..") || path.isAbsolute(rel)) {
  throw new Error("Path traversal detected");
}
```

That should be the spec, not just a likely implementation detail.

### 6. Zip import needs stronger operational constraints

Good start, but I’d tighten it:

* require UTF-8 filenames
* reject duplicate entries
* reject duplicate chapter slugs after normalization
* reject nested directories under `chapters/`
* define overwrite behavior explicitly: probably **never overwrite**
* define temp extraction strategy: validate first, then write atomically
* define partial failure behavior: rollback on any failed write

Right now the spec says what to accept, but not clearly enough what happens on partial failure.

### 7. Cache invalidation is underspecified

You mention:

* `CachedBookRepository.clearCache()`
* `FileSystemBookRepository.clearDiscoveryCache()`

Good. But the spec should explicitly say:

* **all librarian mutations must call cache invalidation after successful filesystem mutation**
* cache invalidation happens **before returning success**
* if mutation fails halfway, no success response is returned

Also: if build/search runtime shares instances, make sure the cache policy is actually correct for long-lived processes.

### 8. The RBAC sentence is slightly muddled

This sentence is the weak part:

> MCP embedding server runs as a privileged process (admin-level), so RBAC is enforced at the tool registration level, not at the transport level.

Running as an admin-capable process is not the same as user authorization.

Better framing:

* the process may be privileged
* **authorization still depends on the request/user/tool-call context**
* tool registration declares `ADMIN` requirement
* middleware enforces it per invocation

That distinction matters.

### 9. Some behaviors need exact acceptance rules

A few important edge cases need explicit answers:

* What if `book.json.slug` and directory slug disagree?
* What if two manifests use the same slug?
* What if chapter file has no first `# Heading`?
* What if `domain` contains invalid values?
* Are slugs lowercase kebab-case only?
* Can `tags` contain spaces?
* Can a book exist with zero chapters?
* Is `librarian_add_chapter` allowed to overwrite an existing chapter?

These should not be left to the implementing agent.

### 10. The sprint sizing is a little aggressive

Sprint 1 includes:

* six tools
* zip mode
* safety validation
* vector cleanup
* tests

That is a lot.

I’d probably split Sprint 1 into:

* **Sprint 1:** list / get / add manual / add chapter / remove chapter / remove book
* **Sprint 2:** zip import + zip safety + failure rollback + extra tests

That reduces risk a lot.

---

## My strongest recommendations

If this were mine, I would fix these before implementation:

1. Add **requirement IDs**
2. Add **`sortOrder: number`**
3. Make **directory name = slug**
4. Replace direct manifest reads with a **shared catalog abstraction**
5. Strengthen **zip atomicity / rollback**
6. Clarify **overwrite and duplicate behavior**
7. Split zip mode into its own sprint

---

## Overall verdict

This is a **very solid spec**. It has a real architectural center and good product sense.
It is not vague. It is not fluffy. It is close.

The main thing missing is not vision — it is **precision at the seams**:

* identity
* ordering
* authorization wording
* rollback behavior
* traceability

With those tightened, it becomes implementation-grade.

If you want, I can rewrite this into a **sharpened v2.1 spec** that matches the stricter process guide exactly.
