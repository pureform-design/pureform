# c0: Foundations

**Depends on:** nothing. **Subphases:** c0a to c0d, all independent. **Gap analysis:** §0.1, §5.1,
§5.3.

Guards and fixes the later phases rely on. Small, so each is quick, but later subphases
assume they exist.

## Read first

Guidelines §5 and §6, `component-architecture.md` §9.8 (indication) and §5.5, the gap
analysis §0.1 and §5.

## c0a: Navigation label colour

Compose 1.5 sets the selected label of **horizontal** nav items to the icon's colour (for
contrast in high-contrast themes). Vertical items keep `secondary`.

- Own files: `packages/preset/src/components/navigation.ts`, `navigation-bar.ts`,
  `navigation-rail.ts` and their specs.
- Add an `activeLabelColor` per item layout. Today there is one, for both. The horizontal
  layout itself arrives in c1e; here only the token split and its colours, so c1e just
  selects between them.
- Update the fixtures and screenshots that change, after reading the diff.
- Done when: both layouts have a colour token, vertical output is unchanged, and the contrast
  spec (`packages/preset/src/contrast.ts`) covers the horizontal label.

## c0b: Machine-anatomy drift test

The machines' `*.anatomy.ts` have fewer parts than the preset's (slider 2 vs 6, text field 4
vs 7, navigation 4 vs 6, button 3 vs 4).

- Own files: `packages/machines/src/**/*.anatomy.ts`, a new spec next to them (or in
  `packages/anatomy`).
- Derive each machine anatomy from `@pureform/anatomy`, or test it against it, so a part
  added to the preset fails the test until the machine has it. Fix the four known drifts now.
  The slider's machine is replaced in c1g; its test may start as `todo` for that part.
- Done when: the test fails if you delete a part from any machine anatomy.

## c0c: Shape exceptions

The shape rule has no allow-list yet (guidelines §5.1).

- Own files: `packages/preset/src/radii.spec.ts`.
- Add an explicit allow-list: a map from component and token to a reason. Each entry must have
  a non-empty reason, and the test fails on an entry that no longer matches anything. Empty
  to start; the circular progress (c1b) and loading indicator (c4a) will use it.
- Document the rule's wording in the spec comment and the guidelines if it needs refining.
- Done when: the allow-list works with a test fixture, and the existing suite still passes.

## c0d: Inset focus ring

Compose 1.5 offers an inset focus ring, drawn inside the component, as an alternative to the
outer ring and the opacity layer (gap analysis §0.1 row 7).

- Own files: the indication model in `packages/preset/src/state-layer.ts` and the files it
  uses, `packages/binding-core` where the indication is passed through, and the indication
  specs and fixtures.
- Add a theme-level choice, `focusRing: "outer" | "inset"` (default `outer`, so nothing
  changes), that every component's focus style follows through its indication tokens. Don't
  add a per-component variant.
- Check each component's focus style still draws, in both modes, on the web and React Native,
  and with the interaction source forwarded.
- Done when: the default output is byte-identical, a theme can switch to `inset`, and the
  indication suites cover both.

## Shared files

`packages/preset/src/index.ts` is not needed here. c0a and c0d both touch the preset's
indication-related specs and fixtures; merge in the order c0a, c0b, c0c, c0d.

## Handoff notes

`/tmp/opencode/c0a.md` to `/tmp/opencode/c0d.md`. Hints: anything generic you wrote in the state-layer or
shared helpers.
