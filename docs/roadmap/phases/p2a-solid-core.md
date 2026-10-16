# p2a: Solid binding core

**Depends on:** p1a, p1e, p1f, p1g (p1b for `motion`)  
**Runs in parallel with:** p2b, p2c

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §5.1, §5.3, §5.6 to §5.9, §6 (registry wiring), §9.1 to §9.6.
- Output contexts: p1a, p1b, p1e, p1f, p1g, and the Zag port in `packages/solid/src/internal/zag` (design doc §8).

## Goal

Give `@pureform/solid` everything a component needs, so p3a only wires anatomy to machine to registry.

## Scope

- `PureformProvider`: `registry`, `dir` (written on its element, passed to Zag), `motion`
  (`data-pf-motion`), `defaults`, `slotProps`, and `theme`/`overrides`/`hydrate` as stubs
  for p5b.
- `useClasses`, `useClassFactory`, `useLazyClassFactory`, following §5.3's static and lazy
  paths.
- Part helpers: spreading machine props, `data-pf-part`, the `data-pf-*` state attributes
  from p1a, class merging (registry first), `style` merging, slot-keyed
  `class`/`style`/`testId`/`slotProps`, `as`, `unstyled`.
- Controllable props mapped onto Zag (`checked`/`defaultChecked`/`onCheckedChange`, …),
  with the development warning when switching between controlled and uncontrolled.
- The form reset and fieldset helpers from p1g, wired per §9.5.
- `useReducedMotion()`, `useIconStyle()`.
- The development warning when the runtime `@pureform/styling` differs from the glue's
  recorded version (§11) can be a stub until p4a records it.

## Done when

- Browser-mode tests for each hook and helper with a fake registry.
- Build and unit tests pass.

## Output context (required)

When done, write `docs/roadmap/context/p2a.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Every export with its signature, and a short example of a component built on them.
- How state attributes are set, and from where.
- Stubs left for p5b (themes) and p4a (version check).
