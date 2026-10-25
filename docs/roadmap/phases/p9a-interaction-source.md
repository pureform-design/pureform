# p9a: Interaction source and the indication interface

**Depends on:** p8 (every component exists in each binding)  
**Runs in parallel with:** p9b

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.8 (all of it), §5.1, §5.7, §8.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p1g, p2a, p2b, p6a, p6c, p6d, p6e, p8.

## Goal

Give every interactive component one framework-free interaction source, fed by its machine,
and commit the `Indication` interface that p9c and p9d implement.

## Scope

- `@pureform/binding-core/interaction`: `InteractionKinds` (pureform's kinds, open to
  augmentation), `Interaction` (the union over it), `PointerKind`, `InteractionState`,
  `InteractionSource`, `MutableInteractionSource`, and `createInteractionSource()`, with the
  state reducer (a press ends with its release or cancel; touch never hovers; drag start and
  stop; kinds it doesn't know pass to subscribers and leave the state alone).
- The contract stays neutral on when things are created: a source is always a value (no
  `null` in any type), a late subscriber sees ordinary events, and the doc comments promise
  neither eager nor lazy creation. Components create their source eagerly on the client and
  not on the server.
- `@pureform/binding-core/indication`: the types only (`Indication`, `IndicationTokens`,
  `IndicationTarget`, `IndicationContext`, `NativeIndicationProps`) and `defineIndication`.
  Make the interface its own early commit; p9c and p9d build on it in parallel.
- `@pureform/machines`: the button, checkbox, switch, radio group, slider, menu, select,
  tabs, and navigation machines emit to a source passed in their props (press with origin and
  pointer kind, a keyboard press from the center, hover, focus with visibility, drag on the
  slider, a highlighted item as hover). A machine that becomes disabled ends what's in
  progress. The innermost machine claims a press, so nested pressables emit it once.
- Drop the button machine's Zag-style `data-hover`, `data-active`, and `data-focus-visible`;
  the API's `pressed`, `hovered`, and `focusVisible` read the source.
- No binding wiring yet beyond keeping today's behavior: the bindings create a source per
  component and pass it in.

## Notes

The machines' unmatched attributes go, so no CSS output changes; prove it with the
before-and-after equivalence check in Chromium.

## Done when

- Unit tests cover the reducer and each machine's emitted sequence (pointer, touch, keyboard,
  disabled mid-press, nested pressables), and a type test shows an augmented app kind
  narrowing in a `switch` beside pureform's.
- The shared suites still pass in both bindings on all six projects, and React Native's tests
  pass.

## Output context (required)

When done, write `/tmp/opencode/p9a.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The interface commit's hash, and the exact types p9c and p9d implement.
- What each machine emits, and how a binding passes a source in.
