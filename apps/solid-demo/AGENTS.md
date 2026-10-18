# Agent Guide

This is a SolidJS 2.x project. Solid is not React: components run once (there is no re-render), reactivity is fine-grained through signals, and effects/memos have Solid-specific semantics. Do not port React patterns.

## Versioned skills (in node_modules — read on demand)

The installed packages ship agent skills that match their exact installed versions:

- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` — repair guide mapping every dev-mode diagnostic code (e.g. `REACTIVE_WRITE_IN_OWNED_SCOPE`, `STRICT_READ_UNTRACKED`) to its prescribed fix. Read it whenever a Solid diagnostic code appears in test output or the browser console.
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md` — how to capture reactive evidence (which scopes re-ran and why, wasted recomputes, cost tables) and assert budgets, in tests and against live pages.

## Reactive diagnostics — capture evidence instead of guessing

Use these whenever you are debugging reactivity (something doesn't update, updates too often, or is slow) or verifying a change didn't regress update granularity:

- **In tests:** `captureArtifact()` from `@solidjs/diagnostics` wraps a scenario and returns a serializable artifact of diagnostics + rerun attribution; matchers from `@solidjs/diagnostics/vitest` (`toHaveNoDiagnostics`, `toStayWithinRerunBudget`, `toHaveNoWaste`, …) assert on it. No browser needed.
- **Against the running dev server** (`diagnostics: true` in vite.config.ts; dev-only, no-op in builds). Requires an open page connected to the dev server (e.g. via a browser tool):
    - `GET /__solid/diagnostics` — status and connected client count
    - `POST /__solid/diagnostics` with JSON `{"method":"begin"}` then `{"method":"end"}` — capture a session into an artifact
    - `{"method":"whyDidRun","params":{"name":"<scope name>"}}` — recorded re-runs of one named scope in the open session
    - `{"method":"costs"}` — running cost tables for the open session

Name your signals/memos/effects (the `{ name: "..." }` option) — attribution reports scopes by name.

## This app

The demo's apps, routes, settings, and styling rules are in `README.md`. In short:

- Draw everything with `@pureform/solid` components; lay pages out with Panda's `css()` over the pureform preset's tokens. Never call Panda's recipe functions (`$recipes`) for pureform components: the pruning scan can't see them. A piece pureform has no component for (`src/ui/`) is styled with tokens only: no literal colors, sizes, radii, fonts, or durations.
- Multi-part ready-made components take `class`, `style`, and `slotProps` keyed by part (`class={{ root: … }}`); single-part ones (`Text`, `Avatar`, `Separator`) take them plain.
- Pass icons as `<Glyph name="…" />` (`src/ui/icons.tsx`), which makes its element when inserted. An element made directly in an icon prop warns about a hydration key miss, since ready-made components read the prop once to test it.
- A `useMutation` runs as a Solid transaction: writes made while it's in flight are held until it settles. State that must change at once (the settings) is written outside mutations.
- Adding an app: a layout route and an entry in `src/apps.ts`.
