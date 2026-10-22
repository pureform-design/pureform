# f2a: Lists (output context)

Branch `f2a-lists` from main `fdbae596`. Source: [f2](../phases/f2-fixes.md#f2a-lists),
[f1 "Answers"](f1.md#answers). React, Solid and React Native; css, panda and tailwind targets.

| Commit     | What                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| `9e6a7380` | feat(preset): the swipeable list item's frame isolates its stacking (`isolation` keyword) |
| `845c5f6e` | feat(rn-adapter): `isolation` reaches React Native, which has it                          |
| `e2afe82f` | feat(react-native): a swipeable list item takes `onPress` on a tap; no `swipeable` prop   |
| `8407c755` | docs(gap-analysis): the list item's stacking, `onPress` and removed `swipeable` prop      |
| `53f013b6` | style: format f2a                                                                         |

## What was built

- **Stacking.** The preset's `frame` slot is now `position: relative; overflow: hidden;
isolation: isolate`, so the row's `zIndex: 1` stacks only against its action. No theme
  stacking role. To say it, core's style AST gained `isolation?: Keyword<IsolationKeyword>`
  (`"auto" | "isolate"`, `nodes.ts`, `style.ts`) and an `isolate` keyword
  (`ast/helpers/keyword/isolation.ts`). The web targets lower it generically (Panda snapshot in
  `new-components.spec.ts.snap` gains `isolation: "isolate"` on `listItem.frame`).
- **rn-adapter.** `isolation` moved from `DROPPED` to `SAME` in `props.ts`: React Native 0.88 has
  `isolation: 'isolate'` (and react-native-web passes it through), so the frame isolates there too.
  Any other style using `isolation` will now reach React Native (only the list item uses it).
- **React Native `swipeable` prop removed.** `ListItemProps` extends
  `Omit<ListItemVariantProps, "swipeable">`; the item is swipeable exactly when it has a
  `swipeAction`, and still sets the variant for its styles. No compatibility path:
  `swipeAction` covers it. README updated.
- **React Native `onPress` on a swipeable item.** `interactive` is now `expandable || onPress`,
  swipeable or not; a swipeable interactive row is the `Pressable` inside the frame (the
  non-expandable branch now frames it too). The frame's `onMoveShouldSetPanResponderCapture`
  takes the touch past the slop, which terminates the Pressable's responder, so a drag never
  presses it and a tap does. The web's equivalent is `swallowNextClick`; React Native needs no
  helper because responder termination already drops the press.
- Gap analysis (list swipe row) and `next.md` updated.

r7's helpers: none of `springState`, `springTo`, `springFieldNodes`, `turnedOver`,
`shapeTransition` apply here (no motion or shape changed); `swallowNextClick` is DOM-only and the
web bindings already use it.

## Tests

- New React Native spec (`components.spec.tsx`, "presses a swipeable item on a tap, not a drag,
  and isolates its frame"): role `button`, the frame's computed `isolation: isolate`, a click
  fires `onPress`, a mouse drag reveals the action without firing it.
- `omni run build test -p @pureform/core -p @pureform/preset`: pass (snapshot updated).
- `omni run build test -p @pureform/rn-adapter`: two load timeouts (factory "gives what selection
  gives", geometry drop shadows; load average ~33); the factory test passes alone through Vitest.
- `omni run build test -p @pureform/react-native`: one timing failure in
  `tab-indicator.spec.tsx` ("slides when a controlled value changes"), unrelated; passes alone.
  The swipe specs pass (`-t swipe`, 47 tests).
- React and Solid `list-item.spec.tsx` through Vitest: pass.
- `tests/component-suites`: `themes` and `accessibility` e2e, `react/css` and `solid/tailwind`,
  `-t "ListItem|List"`: 230 passed.
- `tsc --noEmit` clean in core, preset, rn-adapter and react-native.

## Refactoring hints

- **Helpers that look generic:** the `isolate` keyword and `isolation` style key are now shared
  vocabulary; tabs and switch also stack siblings with a raw `unitless(1)` z-index and could
  isolate their containers the same way (f1 merge's hint about a named "above a sibling" helper
  still stands).
- **Code that looks like a sibling's:** none new.
- **Suggested home:** a `stackAbove()`/`isolated` pair in `packages/preset/src/components/shared.ts`.
- **What must not change:** `new-components.spec.ts.snap` (listItem frame), the React Native
  swipe specs, React/Solid list item specs, rn-parity.

## Open questions

- `isolation` now passes to React Native rather than being dropped; on the old architecture it is
  ignored, which is harmless.
- Only a swipeable item without `onPress` or a `region` takes the `pressed` look while dragged
  (as before); one with `onPress` now follows its Pressable's state, like the expandable one,
  so the drag ends its pressed look once the frame takes the touch.
