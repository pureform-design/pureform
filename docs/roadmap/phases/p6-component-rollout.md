# p6: Component rollout

**Depends on:** p3c (layout and suites); p5a for non-Panda targets  
**Runs in parallel with:** subphases p6a to p6e, in parallel

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §8 (behavior per component), §9.
- Output contexts: p3a, p3b, p3c, p1g.

## Goal

Build every preset component in Solid and React, following p3's layout and adding each to the shared suites.

## Scope

Parallel subphases, each with its own output context:

- **p6a toggles:** switch and radio group (Zag), chip, icon button (with toggle), FAB.
- **p6b text inputs:** text field and text area (own machine in `@pureform/machines`),
  select (Zag, with `HiddenSelect`).
- **p6c overlays:** menu, dialog, tooltip (Zag), snackbar.
- **p6d navigation and lists:** tabs (Zag), navigation bar and rail, list, list item.
- **p6e display:** linear and circular progress, slider (own, over the native range
  input), card, and the remaining static components.

## Done when

- Each component passes the shared suites in both bindings.

## Output context (required)

When done, write `docs/roadmap/context/p6<letter>.md`, one per subphase (`p6a` to `p6e`), in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Per subphase: components built, machines added, deviations.
