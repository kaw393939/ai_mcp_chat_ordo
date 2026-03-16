# Browser UI Test Suite

This directory is the discovery entry point for the browser-focused regression suite introduced during browser UI hardening.

## Coverage Map

### Shell and layout invariants

- `tests/browser-support.test.ts`
  - shared browser support helpers
  - viewport and safe-area helper behavior
  - motion and blur capability checks

### Overlays and popovers

- `tests/browser-overlays.test.tsx`
  - command palette open/close behavior
  - account menu pointer dismissal
  - mentions menu listbox semantics and selection

### Motion and reduced-motion

- `tests/browser-motion.test.tsx`
  - reduced-motion branching in theme updates
  - additive view-transition behavior in chat shell
  - blur-independent shell layering checks

### Browser API fallbacks

- `tests/browser-api-fallbacks.test.ts`
  - color-scheme fallback behavior
  - stream-reader and intersection-observer guards
  - audio constructor fallback
  - requestAnimationFrame and scroll helper fallbacks

- `src/components/AudioPlayer.test.tsx`
  - stream-reader fallback path
  - manual-play versus auto-play distinction
  - observer absence safety
  - fetch and playback failure handling

## Verification Commands

- `npm run browser:verify`
  - runs the focused browser regression suite
- `npm run browser:verify:quality`
  - runs browser-focused tests, a production build, and Lighthouse CI guidance
- `npm run lhci`
  - runs Lighthouse CI against the configured production target

## Notes

- These tests are intentionally focused. They protect browser-sensitive behavior without duplicating broader application tests.
- Manual evidence and per-browser acceptance criteria live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md`.
- Baseline comparison notes live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md`.
