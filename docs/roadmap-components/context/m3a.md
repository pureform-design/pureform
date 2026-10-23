# m3a: Fade through (output context)

Branch `m3a`, from main `a94bbe0b`. Commits (`git log a94bbe0b..m3a`):

| Commit     | What                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `8b91dbea` | feat(preset): `fadeThrough` (`root`, `page`), `FADE_THROUGH_*`, `MotionTiming.delay`          |
| `5850f06b` | feat(binding-core): the contract, `showPage`/`dropPage`/`pageStateProps`, `whenAnimationsEnd` |
| `0f53f7ca` | feat(react,solid): `FadeThrough`                                                              |
| `cb8af82a` | feat(react-native): `FadeThrough`; presence steps take a `delay` (rn-adapter, both engines)   |
| `a2358e7e` | test(component-suites): the case and `fade-through.e2e.test.ts`                               |
| `a82058be` | docs: READMEs and gap analysis                                                                |

This file is the last commit. The README isn't ticked (the merge does).

## What was built

- **Source:** Compose's `MaterialTransitions.FadeThrough` (androidx-main 62637abaa5): outgoing
  `fadeOut(tween 90ms, linear) + scaleOut(1.05)`, incoming `fadeIn(tween 210ms, delay 90ms,
linear) + scaleIn(0.8)`, scales on Compose's default spring.
- **Preset** (`components/fade-through.ts`): `fadeThrough`, slots `root` (`position: relative`)
  and `page`, structure `root → page`, no tokens or variants (0 compounds). The page runs
  `overlayMotion(FADE_THROUGH_MOTION)` on `data-state`: `open` grows `fadeThroughGrowIn`
  (0.8→1, `scale`) on `spatialDefault` and fades `overlayFadeIn` over `short4` after `short2`;
  `closed` grows `fadeThroughGrowOut` (1→1.05) on `spatialDefault`, fades `overlayFadeOut` over
  `short2`, and is `position: absolute` (top/left/right 0), `pointer-events: none`. Reduced
  motion: the fades alone (the existing `when("reducedMotion", …)` rule). Component count 64→65.
- **`MotionTiming.delay`** (preset `overlay.ts`): an optional duration role; `timedAnimation`
  emits `delay` and fills `backwards` (or `both` with `forwards`). No existing output changed.
- **binding-core**: `FADE_THROUGH_ROOT_PROPS`, `fadeThroughSelection`, `FadeThroughValue`
  (`string | number`), `showPage(pages, value, content)` (same value keeps its page; a new value
  closes the shown page and opens one; a still-leaving page with that value gives way),
  `dropPage`, `pageStateProps` (`data-state`; closed adds `aria-hidden`, `inert`); `/dom`
  `whenAnimationsEnd(element, done)` (done once the element's running animations settle, at once
  with none; returns a canceller). Usage entry `"fade-through"`.
- **React / Solid**: `@pureform/<b>/fade-through`, `<FadeThrough value>` with content or
  `(value) => content`. The first page has no state (no animation); a closed page goes after
  `whenAnimationsEnd` (at once unstyled). Solid captures each page's content untracked when its
  value comes in; content reading the signal that sets `value` must use the function form (a
  plain `{value()}` would update the leaving page too; documented).
- **React Native**: `FadeThrough` (`value`, children or function, `style`, `testId`); each page
  runs `useOverlayPresence(state === undefined ? undefined : state === "open", "fadeThrough")`;
  the closed page is `absoluteFill`, `pointerEvents="none"`, hidden from accessibility.
  `OVERLAY_KEYFRAMES`/`OVERLAY_MOTIONS` gain the fade through's (checked against the preset by
  `presence.spec.tsx`'s "are the preset's", via `testing/commands.ts`). rn-adapter's
  `PresenceTiming.delay`: Animated already honoured `delay` through `animate()`; Reanimated adds
  `animationDelay` (and `both` fill on a delayed exit) only when a step is delayed.
- **Navigation bar/rail** (user's choice): no API change; READMEs say to wrap the page content
  in a `FadeThrough` given the same `value`.
- **Deprecated options:** none touched had an equivalent to remove.

## Tests

- `omni run build test -p` preset, anatomy, binding-core, rn-adapter, react, solid,
  react-native: pass. The first run had `machines` `presence.spec.ts` "stays until the last of an
  exit's animations ends" and 29 react-native overlay specs fail under load (snackbar hover, toast,
  tooltip, dialogs: the known flakes, none touching this code); `-f failed` passed all.
- New specs: preset `fade-through.spec.ts`; binding-core `fade-through.spec.ts`, `dom.spec.ts`
  (`whenAnimationsEnd`); React/Solid `fade-through.spec.tsx`; React Native
  `fade-through.spec.tsx` (motion from tokens, both engines, reduced motion).
- `tests/component-suites` (after `omni run generate prepare -p @pureform/panda-fixture`):
  `fade-through.e2e.test.ts` on react/css, solid/panda, solid/tailwind: 9/9. accessibility,
  direction, server-rendering, themes, keyboard with `-t FadeThrough` on react/css and
  solid/panda: 46 passed.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, binding-core, rn-adapter, react, solid,
  react-native, component-cases, component-suites. No conflict markers.

## Refactoring hints

- **Helpers that look generic:** `whenAnimationsEnd` (binding-core `dom.ts`) is what any web
  "keep until the exit ends" without Zag presence needs; m3b's shared axis will want it, and
  `showPage`/`dropPage` too (its pages are the same, plus a direction).
- **Code that looks like a sibling's:** React's and React Native's `FadeThrough` share the
  derived-state + per-value content map logic verbatim; m3b (shared axis) will very likely write
  the same component with a different motion. Suggested: one `useSwitchedPages(value, children)`
  hook per React binding (or the motion name as a parameter of one component).
- **Duplicated constants:** RN `presence.ts` restates `FADE_THROUGH_MOTION`/keyframes, as it does
  every overlay motion; the "are the preset's" spec keeps them equal.
- **What must not change:** preset snapshots (no existing one changed), `fade-through.e2e.test.ts`,
  `presence.spec.tsx`, the overlay specs.

## Open questions

- **Timings:** the fades use theme roles (`short2` 100ms out, `short4` 200ms in after `short2`)
  rather than Compose's literal 90/210ms, so themes can tune them; the scale uses
  `spatialDefault` (700, ζ 0.9) for Compose's default spring (≈400, ζ 1). Say if literal values or
  another role are preferred.
- **Screenshots:** no visual-suite section was added; at rest the fade through is just its page,
  so a screenshot shows nothing of the motion (covered by the e2e on each target instead).
- **Predictive back** left out, as next.md §0 says for m3.
- The leaving page is positioned over the root's top (no `bottom`), so a taller old page can
  overflow a shorter new one while it fades; the root doesn't clip (an app can set `overflow`).
