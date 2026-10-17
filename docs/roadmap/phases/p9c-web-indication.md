# p9c: Indication on the web (Solid and React)

**Depends on:** p9a, p9b  
**Runs in parallel with:** p9d

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.8, §5.1, §5.7, §5.8, §7.
- Output contexts: p9a, p9b, p2a, p2b, p5b, p7, p6e.

## Goal

Wire indication into every interactive Solid and React component, with the provider default,
the component prop, hoistable sources, and the ripple on by default.

## Scope

- `@pureform/binding-core/indication`: the web halves of `materialIndication({ ripple })`
  (over the `ripple` machine) and `noIndication`; turning an indication's tokens into CSS vars
  (theme-level for the provider, component-level for a prop); the development warning when a
  custom indication drops the focus indicator.
- Both bindings:
    - the provider's `indication`, inherited and overridable;
    - every interactive component's `indication` and `interactionSource` props, on Root and
      the ready-made component;
    - the layer part inside the anatomy's surface when the indication has `layer: true`,
      rendered on the server too;
    - the `web` effect attached after mount, with the context (`centered`,
      `reducedMotion()`, `dir()`, the registry);
    - `data-pf-hover` and `data-pf-active` written on a trigger for a hover or press
      forwarded from another origin, after mount only; focus never forwarded;
    - `createInteractionSource()` (Solid), `useInteractionSource()` (React),
      `useInteractionState(source)`, and `useIndication(source, { centered })` for app
      surfaces.
- Pruning: the usage table counts the `ripple` entry for every component with an indication
  entry, unless the scan sees `noIndication` or a custom indication with no layer.
- The demos' pressables ripple with no app code.

## Done when

- Unit specs per binding cover the provider default, the prop, a shared source, and
  `useIndication`.
- The shared suites, including server rendering, pass in both bindings on all six projects.

## Output context (required)

When done, write `docs/roadmap/context/p9c.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The public API per binding, with an example of a custom indication.
- How p9e's suite should find each component's trigger, surface, and layer.
