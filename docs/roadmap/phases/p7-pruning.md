# p7: Usage-based pruning

**Depends on:** p4c, p5a  
**Runs in parallel with:** p8

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §7.
- Output contexts: p4c, p5a.

## Goal

Ship only the components and variants an app uses.

## Scope

- Collect imported components from the module graph, and static variant props through a
  light JSX scan; a dynamic value keeps all of a variant.
- Regenerate the registry and CSS for those; Panda narrows `staticCss`, Tailwind
  `@source inline`, Metro the precomputed tables.
- Keep everything and warn when the scan fails or sees a dynamic `useClassFactory` name.

## Done when

- A fixture app's build ships only what it uses; sizes recorded.

## Output context (required)

When done, write `docs/roadmap/context/p7.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- What pruning sees and misses, and the escape hatches.
