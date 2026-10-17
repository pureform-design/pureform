# p9d: Indication on React Native

**Depends on:** p9a, p9b  
**Runs in parallel with:** p9c

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.8, §5.8, §5.9.
- Output contexts: p9a, p9b, p8, p4b-rn, p1b.

## Goal

Move `@pureform/react-native` from `usePress` and `useInk` onto the interaction source and the
`Indication` interface, with the same provider default and component prop as the web.

## Scope

- `Pressable`'s callbacks feed the component's machine, which emits to its source; the
  source's state goes into the selection, replacing `usePress`'s tracking.
- `materialIndication({ ripple })` and `noIndication` for React Native: the `native` half
  renders in the anatomy's surface over the motion engine's `useRipple`, driven by the source's
  presses rather than its own press handlers; the tokens join the selection's overrides
  (theme-level from the provider, instance tokens from a prop).
- `focusVisible` holds only for focus that doesn't follow a press, so the focus indicator
  (`focusRing()` lowered to `outline*`) shows for a hardware keyboard or TV remote and not for
  touch.
- The provider's `indication`, each interactive component's `indication` and
  `interactionSource` props, `useInteractionSource()`, `useInteractionState(source)`, and
  `useIndication(source, { centered })`.
- Components that have no ripple today (card, checkbox, switch, radio, snackbar actions, search
  bar) gain one from the anatomy entry; remove `useInk` and `withInk` once nothing uses them.

## Notes

The default indication must draw what the components draw today: prove it with the
before-and-after equivalence check in `rn-web-demo` for every mode, except the components that
gain a ripple, which are checked against fixtures.

## Done when

- Unit specs cover the source from `Pressable`, the provider default, the prop, a shared
  source, and keyboard-only `focusVisible`.
- `rn-web-demo`'s e2e tests and `tests/browser-e2e-tests` pass.

## Output context (required)

When done, write `docs/roadmap/context/p9d.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The React Native API, and where it differs from the web's.
- The focus-visible heuristic and its limits.
