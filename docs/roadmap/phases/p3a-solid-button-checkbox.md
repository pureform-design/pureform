# p3a: Solid button and checkbox

**Depends on:** p2a, p2c  
**Runs in parallel with:** p3b

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §9.1 to §9.6, §8.
- Output contexts: p2a, p2c, p1f, p1g.

## Goal

Build the first two components end to end in Solid: compound parts and ready-made forms.

## Scope

- `@pureform/solid/button`: `Button.Root`, `Button.Icon`, `Button.Label`, and the
  ready-made `Button`, on p1g's button machine (with the toggle `selected` props).
- `@pureform/solid/checkbox`: compound parts and the ready-made `Checkbox`, on Zag's
  checkbox through the port, with the native `input` slot (§9.5).
- Slot-keyed overrides, test ids, controlled and uncontrolled props, forms.
- One subpath export per component, `sideEffects: false`.

## Done when

- Component tests in browser mode: rendering, keyboard, controlled and uncontrolled, test
  ids, `unstyled`, slot overrides.

## Output context (required)

When done, write `docs/roadmap/context/p3a.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The component file layout, so p6 copies it.
- Anything p2a's helpers lacked and how it was solved.
