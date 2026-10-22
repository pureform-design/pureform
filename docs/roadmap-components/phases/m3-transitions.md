# m3: Material transitions

**Depends on:** f1 and m2. **Subphases:** m3a to m3c, parallel.
**Source:** [next.md §1 #5](../next.md#1-spec-recheck-2026-10-22).

Compose's `MaterialTransitions` (androidx-main 62637abaa5, 9b25d27e14): motion between pages and
tab contents, on m1's springs. New motion patterns rather than components; each follows the
conventions and the [native scrolling](../conventions.md#native-scrolling) rule, in React,
Solid and React Native, on the css, panda and tailwind targets. Reduced motion drops the
movement and keeps a short fade.

## m3a: Fade through

- `FadeThrough`: the outgoing content fades out, then the incoming fades and scales in, for
  content that isn't spatially related (switching navigation destinations).
- A transition the app wraps around content that changes (`key` or `value`), and an option on
  the navigation bar and rail's content.

## m3b: Shared axis

- `HorizontalSharedAxis`: content slides and fades along the x axis, direction from the order of
  the pages, for spatially related content (tabs, steps, onboarding). Follows `dir` for
  right-to-left.
- Includes Compose's luminance-based scrim colour between pages; an option on tabs' content and
  the stepper.
- Predictive back stays out ([next.md §0](../next.md#0-decisions-2026-10-22)).

## m3c: FAB menu items

- Compose's `FloatingActionButtonMenu` staggers its items: each scales and fades in from the
  button in turn, and they leave in reverse. Ours moves the list as one popup (m2 merge).
