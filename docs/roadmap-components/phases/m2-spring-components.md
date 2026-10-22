# m2: Spring components

**Depends on:** r6 and [m1](m1-springs-foundation.md).

Migrate components from tweens to m1's springs. Spatial movement (position, size, shape,
rotation) takes a `spatial*` spring; colour and opacity take an `effects*` spring or stay on
their tween. Decided 2026-10-22 ([next.md §0](../next.md)).

## In scope

- **A, spatial:** shape morphs in `shaped.ts` (the buttons', chips', icon buttons' and FAB
  menu's corners), button group, navigation, tabs, switch, slider and time picker.
- **B, overlays:** the 5 overlay motion definitions (`POPUP_MOTION`, `DIALOG_MOTION`,
  `SCRIM_MOTION`, `BOTTOM_SHEET_MOTION`, `SIDE_SHEET_MOTION`). Scale and fade each become their
  own animation, so movement can spring while the fade doesn't.
- **Extras:**
    - Swipe snap-back: the list item's `swipeOffset` (`list-item.ts`) settles on a spatial
      spring after release.
    - Sheet drag release: a sheet settles on a spring after a drag; on React Native it carries
      the release velocity.
    - Snackbar enter and stacking (`toast.ts`): movement springs, the fade stays.
    - Split button chevron (`split-button.ts`): its turn and morph spring.

- **C, containers:** accordion, tree, field label, table sort arrow, and the list's and
  select's chevrons, so every chevron turns the same way.

## Later

- **D, state fades:** `tweens`.
- **Parked:** the app bar's headline and the search view's icons (keyframes); see
  [next.md](../next.md#parked-motion).

## Staying on easings

Progress, the loading indicator, the ripple, the radio dot (Compose uses a 100ms tween) and
the carousel.

## Rule

Never replace or drive native scrolling with springs, on any platform: the browser's scroll
snapping and React Native's `ScrollView` snapping stay as they are. Only motion pureform
animates itself moves to springs.
