# fix-storybook

User-reported Storybook issues (`apps/storybook-web`), fixed on branch `fix-storybook`.

## 1. Ripple and Scrim stories showed nothing

- **Cause:** the story, not the components. Both act on their surroundings (the ripple grows from
  a press on its parent surface, the scrim fills its positioned container and dims what is behind
  it), and the generated stories drew them alone in an empty canvas. The ripple's default surface
  is the layer's parent, which in Solid is the provider's `display: contents` element and never
  gets a press of its own.
- **Fix:** `src/stages/stage.ts` builds a positioned frame around the story's element with content
  before it. `src/stages/ripple.ts` makes the frame a pressable surface and gives the ripple a
  `getSurfaceEl` arg that returns it; `src/stages/scrim.ts` puts page text behind the scrim. They
  are component hook modules in `stories.config.ts`. Each adds a play test (the layer fills the
  frame and is its press surface; the scrim covers the content). The cases in `component-cases`
  are unchanged (they are plain data shared with the suites).
- **Spec:** Material 3 ripple/scrim are layers over a surface/content (M3 "state layers" and
  "scrim"; MDC-Android `RippleDrawable` is bounded by its view); no spec value changed.

## 2. `STRICT_READ_UNTRACKED` "mount.current" in `<ReadyMade>`

- **Cause:** the Solid adapter's args proxy (`apps/storybook-web/src/solid/adapter.ts`; the
  signal is named `mount.current` by the dev transform) read the signal in its `has`, `ownKeys` and
  `getOwnPropertyDescriptor` traps. Every ready-made calls `omit(props, ...)` in its body, which
  asks `key in props`, outside tracking. `packages/solid` itself is fine: with compiled props those
  checks read no signal (reproduced with a temporary spec; no store or signal patterns of this
  kind exist in `packages/solid`).
- **Fix:** those traps read a snapshot (`untrack`); the values stay reactive through `get`. Since
  the key set can then no longer be followed, the adapter remounts when an update changes the
  set of args' keys.
- **Test:** `src/stories/SolidAdapter.stories.ts` (Solid project) mounts a Button through the
  adapter, changes variants and the theme, and fails with the old adapter.

## 3. `IMMUTABLE_UPDATE_IN_STORE` for `store.theme` and `store.globals`

- **Cause:** `update` replaced both with spread copies.
- **Fix:** `assignLeaves` writes only the differing leaves (and deletes dropped keys). Covered by
  the same story.

## Open questions

- The remount on a changed key set loses uncontrolled state when a control adds or removes an
  arg; the alternative is signal-per-key props. Not needed for any current story.
- No screenshot suite covers the Storybook, so nothing was re-recorded.
