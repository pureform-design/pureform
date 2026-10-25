# r7: Refactor after m1, m2 and f1

**Depends on:** f1. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

Covers everything since r6: m1 (springs foundation), m2 (spring components) and f1 (fixes).
Read `/tmp/opencode/m1.md`, `m2.md` and `f1*.md` (their refactoring hints and declined refactors).

## Expected duplication to look for

- **Spring maths:** core's `sampleSpring`, rn-adapter's `settle()` and f1e's `springProgress`
  (closed-form progress and velocity), and m2c's release-velocity path for the swipe; m2
  declined `settle()` against m2c's on units alone, so recheck with f1e's code in place.
- **Spring tokens on the web:** m1's `springTokenEntries`, `springTokenGroups` and `springVars`
  against f1f's `springTokenVars` and `springVarNames`, across the css, panda and tailwind
  adapters.
- **Spring transitions in the preset:** `springTweens`, the corner transitions,
  `chevronTransition`, the split button chevron, the overlays' `overlayShrinkOut` and popup
  motion, and the sheets' settle; recheck the declined split button chevron.
- **Rotating indicators:** the chevrons' `expanded` turn and f1d's `descending` sort arrow (one
  "turned" pattern, or two concepts).
- **Grouping:** `selectItemGroups` (now generic), f1a's `navigationSections`, Select's groups
  and the menu's groups.
- **Drag and release:** the sheet's drag (web and React Native), the list item's swipe in f1a's
  `frame`, and the slider's drag; the click suppression after a drag (f1a's Solid fix).
- **Measuring from layout:** f1b's `readSliderInsetIcon` against other layout reads in
  binding-core's `/dom` (tabs' FLIP, carousel).

## Docs

- `component-architecture.md` §5.8 (motion) and the token sections match the code after m2 and
  f1f; the preset, css-lowering and rn-adapter READMEs list the current spring APIs.

## Done when

As for r1, with `/tmp/opencode/r7.md` for m3's authors.
