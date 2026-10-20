# c2e: Button group (output context)

Commits: see `git log 8dc8065..c2e-button-group`.

## Built

- **Preset** (`packages/preset/src/components/button-group.ts`, registered in `index.ts` and
  `pureform.ts` as `buttonGroup`):
    - `buttonGroup`: one slot, `root` (a flex row). Tokens `gap` (each `size` sets it:
      `BUTTON_GROUP_GAPS`, 18px, 12, then 8 from medium up), `connectedGap` (2px), and the flag
      `connected`; the gap is `blend(gap, connectedGap, connected)`. Variants `size`
      (`xsmall`–`xlarge`, default `small`) and `connected` (`false`/`true`). No compounds.
    - Helpers: `groupCorners(ref)` (a grouped button's corners by `position` along the **inline**
      axis: the run's outside corners are the button's own `cornerRadius` morph; the inside ones
      `innerRadius`, `pressedInnerRadius` while pressed, the round `radius` once a toggle is on),
      `GROUP_INNER_RADII` (per button size: xsmall `extraSmall`/`extraSmall × 0.5`, small and
      medium `small`/`extraSmall`, large `large`/`medium`, xlarge `large + extraSmall`/`large`,
      compact as small), `GROUP_GROWTH` (`spacing("3")`), `GROUP_TRANSITION` (state tweens plus
      corners, inline padding and width on `medium1` emphasized, through `motionTransition`),
      `GroupCornerToken`.
- **Button and icon button** (`button.ts`, `icon-button.ts`): a new variant group `position`
  (`none` default, `first`, `middle`, `last`, `single`, from `POSITIONS` in `tiles.ts`). Tokens
  `innerRadius`, `pressedInnerRadius` (each size sets them from `GROUP_INNER_RADII`) and
  `pressedGrowth` (default 0). `single` sets `pressedGrowth` and `GROUP_TRANSITION`; the size
  variant's inline padding (button) or width (icon button) adds it while pressed (`when(pressed)`).
  `first`/`middle`/`last` set the four logical corners from `groupCorners` (icon button: on
  `root`, `container` and `outline`). No compounds added (button 5, icon button 5, as before).
  Output of every existing button changed only by the new tokens and the pressed padding/width
  expression (snapshots updated; screenshots unchanged).
- **Anatomy**: `buttonGroupAnatomy` (generated; test id `pf-button-group-root`).
- **Machine** (`packages/machines/src/button-group.ts`, subpath `@pureform/machines/button-group`,
  `buttonGroup` at the root): Zag's `toggle-group` (new dependency `@zag-js/toggle-group`, in the
  root catalog), with `connect` making the root a plain `group` and every item a toggle button
  with `aria-pressed` (Zag's single mode would make radios with `aria-checked`, which the button's
  `selected` state doesn't match), and the arrow keys following `dir` (Zag reads them
  physically). Drift test pair added. Spec: `button-group.spec.ts`.
- **binding-core** (`components/button-group.ts`): `ButtonGroupVariantProps` (`size`,
  `connected`, `groupTokens`), `ButtonGroupButtonVariantProps` (`color`, `variant`, `corner`,
  `density` for every button), `ButtonGroupBehaviorProps` (`selectable: "single" | "multiple"`,
  `deselectable` (default true), `disabled`, `id`, controllable `value: string[]`),
  `ButtonGroupRootOwnProps`, `BUTTON_GROUP_ROOT_PROPS`, `ButtonGroupItem` (`value`, `label`,
  `icon`, `aria-label`, `disabled`, `width`, `onClick`, `testId`, `interactionSource`),
  `BUTTON_GROUP_CONTENT_PROPS`, `buttonGroupSelection`, `buttonGroupPosition(index, count,
connected)` (`single`, else `tilePosition`), `buttonGroupMachineProps`,
  `buttonGroupRootProps`, `buttonGroupItemProps`, `groupedButtonVariants`, `ButtonGroupPosition`.
  `position` added to `ButtonVariantProps`/`IconButtonVariantProps`, their root prop lists and
  selections. `usage.ts`: `"button-group"` entry. Spec: `components/button-group.spec.ts`.
- **Bindings**: Solid and React `@pureform/<b>/button-group`: `ButtonGroup` (ready-made, `items`:
  a `Button` per labelled item, an `IconButton` per icon-only one, `position` from the index),
  `ButtonGroup.Root` (`div role="group"`, Zag's root props when `selectable`),
  `ButtonGroup.Button`, `ButtonGroup.IconButton` (the group's variants under their own; with a
  `value` in a selectable group, Zag's item props, its id and `selected`, as a toggle). A button's
  `text` fill maps to the icon button's `standard`. React Native `@pureform/react-native/button-group`:
  ready-made only, selection by hand; RN `Button` gained a controlled `selected` (toggle colours,
  `aria-checked`). Registry fixtures gained `buttonGroupRegistry`. Specs in each binding.
- **Suites**: `tests/component-suites/src/components/button-group.ts` (examples, `value` state,
  keyboard, indication through `itemSources(buttonAnatomy, …)`), `ButtonGroup` in the scenes,
  `toggle-group` in the e2e config's optimized deps. Browser suite: `button-groups` section and
  screenshot in the Panda fixture page, a measured test (gap, connected corners, pressed padding),
  `buttonGroup` in `RN_COMPONENTS`.
- Docs: gap analysis rows (§1.1 button group and segmented button, §3 toggle-group, §4.0 split,
  variant and draft-anatomy rows, §5 containers, §7 new "Button group" row); READMEs of preset,
  machines, binding-core, solid, react, react-native.

## Deviations from the design

- The phase's "parts: `root`" holds: the corners and width change live on the **buttons**, as a
  `position` variant on `button` and `iconButton`, since a group can't style its children (no
  descendant selectors, and React Native has none). So `button.ts`, `icon-button.ts` and their
  binding-core contracts were edited outside the subphase's own files (additively).
- Selection is toggle buttons (`aria-pressed`) in both modes, not radios, so the button's
  `selected` styles apply and the markup is the same for single and multiple.
- Composed groups take each button's `position` from the app (`buttonGroupPosition`); only the
  ready-mades place buttons by index.
- Deprecated options: none touched. The segmented button was never built; the connected group
  replaces it (gap analysis).

## Stubs and gaps

- The width change widens only the pressed button (by `pressedGrowth`, 12px); M3 also narrows its
  neighbours so the group keeps its width (Compose `animateWidth`, about 15%). Not done.
- No vertical orientation.
- §1.8 totals of the gap analysis (component count, missing list, zag machines wrapped) were left
  for the orchestrator, since every c2 sibling changes them.

## How to verify

- `bunx vitest run` in `packages/preset` (all 386 + new spec), machines `src/button-group.spec.ts`
  and `anatomy-drift.spec.ts`, binding-core `components/button-group.spec.ts` and `usage.spec.ts`,
  Solid/React `src/button-group`, React Native `src/button-group.spec.tsx` (each with
  `-c vitest.config.unit.ts`).
- `tests/component-suites`: `bunx vitest run -c vitest.config.e2e.ts -t ButtonGroup` (solid and
  react, every target: 246 + 246 passed, including direction, indication, keyboard,
  controllable, server rendering, themes).
- `tests/browser-e2e-tests`: `bunx vitest run -c vitest.config.e2e.ts` (611 passed) after
  `omni run prepare -p @pureform/panda-fixture`.
- `omni run build test -b 8dc8065 -w -o continue`: 99 succeeded, 2 failed: rn-adapter's
  `factory.spec.ts` and `codegen.spec.ts` sweeps timed out under load (60s/120s); alone they
  pass in 36s and 68s. The replayed rn-web-demo "Failed to resolve entry" log was a stale cache hit.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, anatomy, machines, binding-core, solid,
  react, react-native, component-suites, browser-e2e-tests, panda-fixture.

## Notes for the next phases

- c2f (split button): `groupCorners` gives inline-run corners with the morph; the split button's
  halves are a two-button connected run (`first`, `last`).
- The rn-adapter sweeps grew with `position` (×5 on button and icon button); they are within
  their timeouts alone but close under load (see the open question).

## Refactoring hints

- **Helpers that look generic:** `groupCorners` (`button-group.ts`) is `positionCorners`
  (`tiles.ts`) along the inline axis with a morph for the inner corners; a single
  `positionCorners(outer, inner, axis)` in `tiles.ts` could serve both (lists and menus are
  block runs, button groups and split buttons inline). `GROUP_INNER_RADII` and the
  `innerRadius`/`pressedInnerRadius`/`pressedGrowth` tokens are repeated in `button.ts` and
  `icon-button.ts`, like the corner-morph tokens r1 extracted: a `groupTokens()`/
  `groupPositionVariant()` pair in `shared.ts` or `button-group.ts` would remove it.
- **Code that looks like a sibling's:** the Solid and React `useGrouped` (group variants under the
  button's own) is the same pattern as the radio group's `radioSelection` and the list's
  `listItemVariants`; c2f's split button and FAB menu probably write another. The ready-made
  "items to parts by index" loop repeats the list's (`list.tsx`).
- **Suggested home:** `positionCorners` with an axis in `tiles.ts`; the grouped-button tokens and
  variant in `button-group.ts` (or `shared.ts`); the bindings' item-entry memo (Solid `For` keyed
  by value) as a binding-core or `parts` helper.
- **What must not change:** `__snapshots__/{button,icon-button}.spec.ts.snap`, the
  `button-groups`, `buttons` and `icon-buttons` screenshots, `button-group.spec.ts` in preset,
  machines and binding-core, the component suites' `ButtonGroup` cases.

## Open questions

- Inner radii (`GROUP_INNER_RADII`), the 2px connected gap, the 18/12/8 standard gaps and the 12px
  press growth are my reading of Compose's `ButtonGroupDefaults`; m3.material.io couldn't be
  checked, so they are unconfirmed.
- Should the press narrow the neighbours too (a group-level layout effect, or flex weights)?
- The rn-adapter sweeps (`factory.spec.ts` 60s, `codegen.spec.ts` 120s) now take 36s and 68s
  alone; raise their timeouts, or sample `position` rather than enumerating it?
- Should composed groups place their buttons themselves (registration order), instead of each
  `ButtonGroup.Button` taking a `position`?
