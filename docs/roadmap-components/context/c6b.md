# c6b: Stepper (output context)

Commits: see `git log f1b5b019..c6b-stepper`.

## Built

- **Preset `stepper`** (`packages/preset/src/components/stepper.ts`, exported with
  `STEPPER_ORIENTATIONS`, `StepperOrientation` and `createStepper(densities?)`): slots `root, list,
item, trigger, indicator, label, caption, separator, content`, structure `root > list > item >
(trigger > (indicator, label, caption), separator, content)`. Variants: `orientation` horizontal
  (default) and vertical, `density` (`inherit` and the theme's steps, through
  `densityTokenVariant`, like the list item). 0 compounds (before 0, after 0). The two groups set
  different slots' properties, so `variant-overlap.spec.ts` passes without an allow-list entry.
  Tokens: `container` (`surface`), `content` (`onSurfaceVariant`), `activeContent` (`onSurface`),
  `errorContent`, `captionColor`, `indicatorContainer`/`indicatorContent`,
  `activeIndicatorContainer`/`activeIndicatorContent` (primary), `errorIndicatorContainer`/
  `errorIndicatorContent`, `connector` (`outlineVariant`), `connectorThickness` (1),
  `connectorLength` (24), `connectorGap` (8), `indicatorSize` (24), `height` (56),
  `paddingInline` (16), `gap` (8), `radius` (`radius("medium")`), `contentPadding` (16),
  `densityOffset` and the indication tokens. The `trigger` is the one indication surface (state
  layer over `container` in the current content colour, the focus ring). Registered in `index.ts`
  (`export *`), `pureform.ts` (`stepper: createStepper<Step>(densities)`), `pureform.spec.ts`
  (both lists), `contrast.ts` (text and indicator pairs), the anatomy spec's indication table;
  `generated.ts` regenerated (`stepperAnatomy`). Spec `stepper.spec.ts`.
    - **State comes from ARIA, so no new core state:** the current step is the header's
      `aria-selected` (a row) or `aria-current` (a column); both match the `selected` slot state. An
      error is the header's `aria-invalid` (`invalid`). A done step is the _indicator's_
      `aria-checked` (`checked`, read on its own element; the indicator is `aria-hidden`, so the
      attribute is inert for assistive technology). The indicator and label read the header's state
      through `slot("trigger", …)` conditions.
    - Layout: a row's item grows and its connector (`flexGrow: 1`) fills the space between headers; a
      column's item is a flex column whose connector is absolutely positioned (logical insets) from
      below the indicator to the item's end, beside the content, which is indented to line up with the
      label. The item's `minHeight` keeps a connector's length (24) under a collapsed step.
    - Motion: only colour fades (`stateTransition`), which run under reduced motion; nothing moves,
      so there's no reduced-motion test beyond the existing reduced-motion suite staying green.
- **Machine** (`packages/machines/src/stepper/`, `@pureform/machines/stepper`): `@zag-js/steps`
  (new catalog dependency `^1.46.0`, added to the root `package.json` and `machines/package.json`;
  `bun.lock` updated by `bun install`, which worked here) with `anatomy =
zag.anatomy.extendWith("label", "caption")`. `machine = withInteraction(zagMachine)` (an emitter
  per header, keyed by its index). `connect` adds: `getTriggerProps({ index, invalid, disabled })`,
  `getLabelProps`, `getCaptionProps`; roving tab index in a row (only the current header, or the
  last once every step is done, is a tab stop; Zag left every header one in non-linear mode); the
  arrow keys of the orientation (a row's flip under `rtl`), Home and End move focus between the
  headers, wrapping and skipping disabled ones; the done indicator's `aria-checked`. Roles (see
  design calls): a row is Zag's tab list; a column's list is `list`, items `listitem`, headers
  buttons with `aria-expanded` and `aria-current`, content `region`. A row's items are
  `role="presentation"` and lose Zag's `aria-current` (a presentational wrapper would otherwise be
  exposed). Drift test, `index.spec.ts`, own spec (browser).
- **binding-core** (`components/stepper.ts`): `StepperRootOwnProps` (variants, `count`, `linear`,
  `isStepValid`, `isStepSkippable`, `onStepInvalid`, `onStepComplete`, `id`/`ids`,
  `step`/`defaultStep`/`onStepChange`, `testId`, `unstyled`, `indication`), `STEPPER_ROOT_PROPS`,
  `STEPPER_CONTENT_PROPS`, `STEPPER_LIST_LABEL_PROPS`, `StepperItem` (`label`, `caption`, `icon`,
  `content`, `error`, `editable`, `disabled`, `aria-label`, `interactionSource`), `stepperSelection`,
  `stepperMachineProps`, `stepperTriggerProps` (drops `aria-controls` for a step with no content),
  `stepperTriggerDisabled`, `stepperIndicator` (`"error" | "check" | "icon" | "number"`). Usage
  entry `stepper` (`orientation`, `density`, ripple). Spec `stepper.spec.ts`.
- **Solid and React** (`src/stepper/`): `Stepper` ready-made (`items`; the content goes in each item
  in a column and after the list in a row) with `Root` (`count`), `List`, `Item` (`index`),
  `Trigger` (`error`, `editable`, `disabled`, `controls`, `interactionSource`), `Indicator`,
  `Label`, `Caption` (both `plainParts`), `Separator`, `Content` (`index` when outside an item) and
  `NextTrigger`/`PrevTrigger` (a `button` or `as`, disabled with no next or previous step; no
  anatomy slot: they're the app's buttons). The indicator shows a check (done), a warning (error),
  the item's `icon`, or the number; the glyphs are `ToastIcon`'s success and warning. Exports, vite
  entries, registry fixtures (`displayRegistry`), `optimizeDeps` (`@zag-js/steps`), specs.
- **React Native** (`src/stepper/`): `Stepper` over `Pressable` headers, `step` controllable,
  `linear`, `orientation`, `onStepChange`; each step calls `useComponentSlots` with its own state
  (`selected`, `checked`, `invalid`, `disabled`) since native passes one state to every slot. Spec
  on both engines. No arrow keys, no next/previous triggers, no `isStepValid`.
- **Suites:** component-suites case `stepper.ts` (ten examples, `step` state by click, keyboard:
  Enter and Space press, arrows by direction move focus, Home and End; indication through the first
  step's source), added to the harness names and both scenes. Browser suite: a `steppers` section
  on the Panda fixture (base, teal and sharp rows, and a base column) with its screenshot,
  `stepper` in `RN_COMPONENTS`, an RN indication case, indication fixtures (additions only).
  Component suite result for `-t Stepper`: 42 files passed, 582 tests, on every binding × target
  (axe, direction, server rendering, a named and a runtime theme, keyboard, indication).
- **Docs:** gap analysis (§1.9 and the matrix row, a §7 row); READMEs (preset, machines,
  binding-core, solid, react, react-native).
- **Outside my ownership (additive or forced):** `packages/bundler/src/prune/scan.spec.ts` used
  `@pureform/solid/stepper` as its "component it doesn't know"; it now uses `/hologram`. Shared
  registration files edited by one line per component: see "Merge notes".

## Design calls (M3 doesn't specify the stepper)

Sources: Angular's `mat-stepper` docs and token names (step header: icon, label, optional text,
selected, done, error and edit states; connector; content), zag `steps` part list. Values are ours.

1. **Parts:** `trigger` (Angular's step header), `indicator` (its icon circle), `label`, `caption`
   (its optional text, free text rather than an `optional` flag so it can be translated), `separator`
   (its connector), `content`. Zag's `progress`, `nextTrigger` and `prevTrigger` get no slot
   (behaviour only); the bindings expose the last two as unstyled buttons.
2. **Step states:** _current_ (primary indicator, `onSurface` label), _completed_ (primary
   indicator holding a check), _error_ (error indicator and label, a warning), _editable_
   (`editable: false` disables a done step's header), _disabled_, _linear_ (headers don't navigate).
   Colours are tokens (`activeIndicatorContainer`, …), so a theme or an instance retunes them.
3. **Row is the tabs pattern, column is a disclosure list.** Zag gives every stepper a `tablist`,
   but a column puts the content between the headers, which a tab list can't contain (axe's
   `aria-required-children` fails). The column therefore drops the tab roles: a `list` of steps,
   headers that disclose (`aria-expanded`, `aria-current="step"`), content a `region`. Arrow keys
   still move focus; every header is a tab stop there, as an accordion's are.
4. **Manual activation:** the arrow keys move focus, Enter or Space (the button's click) goes to the
   step, like Angular and unlike Zag's tabs (automatic).
5. **Indicator content** (number, icon, check, warning) is chosen by the binding from state, not by
   the preset; the glyphs reuse the toast's.
6. **Header height 56** (Angular's is 72 in a row, 24 in a column), 24px indicator, 16px padding:
   unconfirmed against any spec.
7. **No label position option** (Angular's `labelPosition: bottom`) and no per-step connector
   colours; no `color` variant group (the active colour is the `primary` role by tokens).

## Deviations from the design

- Anatomy parent of `content` is `item` (an anatomy part has one parent). In a row the bindings put
  it after the list, under `root`; the preset doesn't care.
- The last step of a row also grows (`flexGrow: 1`), so a row of N steps has N equal shares and the
  last header sits at the start of its share; a column's last item has the connector's height as
  trailing space. The preset has no "last child" condition, and the bindings don't mark the last.
- The component suite's `keyboard.disables: false` and `indication.disabled: undefined`: the stepper
  has no disabled state of its own (a step has).

## Stubs and gaps

- React Native: no keyboard, next/previous parts, validity (`isStepValid`) or `onStepComplete`.
- No `labelPosition`, no edit/done icon props, no step `completed` override (it's `index < step`).
- Zag's `step` can equal `count` (every step done); the ready-made shows every check then.
- The Solid/React ready-made renders only `items`; a "Next/Back" row is composed with
  `NextTrigger`/`PrevTrigger`.

## How to verify

- `bunx vitest run` in `packages/preset` (all pass but `doc-counts.spec.ts`, see merge notes);
  `bunx vitest run -c vitest.config.unit.ts` in `packages/machines`, `binding-core`, `solid`,
  `react`, `react-native` (`src/stepper`); `bunx tsc --noEmit -p tsconfig.json` in each.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t Stepper`.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
src/indication.e2e.test.ts src/rn-parity.e2e.test.ts src/rn-indication.e2e.test.ts` (steppers).
- `bun install --frozen-lockfile` passes.

## Notes for the next phases

- **Merge notes:** run `omni run generate -f all` after merging (`stepperAnatomy`). Shared lines I
  added: `package.json` (`@zag-js/steps` in the catalog) and `bun.lock`, `machines/package.json`
  (dependency and the `./stepper` export), `machines/vite.config.ts`, `machines/src/index.ts`,
  `machines/src/index.spec.ts`, `machines/src/anatomy-drift.spec.ts`, preset `index.ts`,
  `pureform.ts`, `pureform.spec.ts` (two lists), `contrast.ts`, anatomy spec's indication table,
  binding-core `index.ts` and `usage.ts`, each binding's `package.json` export and `vite.config.ts`,
  solid and react `vitest.config.unit.ts` (`optimizeDeps`) and registry fixtures, the component
  suite's harness names, both scenes and `components/index.ts`, browser suite's `visual` sections,
  `rn-components.ts`, `rn-indication`, indication fixtures, the Panda fixture page.
- **`doc-counts.spec.ts` fails on this branch alone** (components: gap analysis says 57, the code
  has 58). I left §1.8 to the merge, as instructed. The failure blocks `omni`'s `preset#test` and
  so every task depending on it, so to build locally I bumped the number, then reverted it before
  committing.
- The gap analysis' "zag machines 54; 16 wrapped" row (§1.8) should gain `steps` at the merge
  (17 wrapped; the steps machine is wrapped, not own).
- The bundler's pruning spec no longer names a real component as unknown; siblings that add
  `accordion`, `paginator`, `table` and so on need nothing there.
- Zag's steps has no keyboard handling, and its `tabIndex` is 0 on every header in non-linear mode;
  both are overridden in `connect`.
- Solid renders a boolean `aria-selected={true}` as `aria-selected=""`; write `"true"` and `"false"`
  in a static fixture (the Panda page does).
- Build note: with `doc-counts` failing, `omni run build` of the anatomy package is skipped through
  its dependency on `preset#test`; `bunx vite build` in the package builds it directly.

## Refactoring hints

- **Helpers that look generic:**
    - `stepperTriggerProps` (binding-core): drop `aria-controls` for a header with no content. Same as
      `tabsTriggerProps`' `controls` option (tabs also strips `data-ssr`): a shared
      `withoutControls(props, controls)` would serve tabs, the stepper and the accordion (c6a).
    - The machine's `keyTarget` (arrow keys by orientation and direction, Home, End, wrapping, skipping
      disabled) repeats the carousel's (`machines/src/carousel/index.ts`) and what Zag gives tabs and
      radio groups. c6a's accordion and tree will want one too.
    - The row-is-tabs, column-is-disclosure role switch (`getListProps`, `getItemProps`,
      `getContentProps`, the trigger's ARIA) is the accordion's header pattern: c6a's `accordion` and
      the stepper's column could share a small "disclosure header" helper in `machines/src/interaction`.
    - `NextTrigger`/`PrevTrigger` (`stepAction` in Solid and React) are `pickerAction`
      (`picker-actions.tsx`) plus `disabled` from the machine; `pickerAction` could take a `disabled`
      accessor and serve both.
    - `StepContent`/`StepIndicator` are small ready-made-only helpers; nothing to share.
- **Code that looks like a sibling's:** the ready-made's items-as-data (`StepperItem`, `*_CONTENT_PROPS`,
  `*_LIST_LABEL_PROPS`) copies tabs'; c6a's accordion items will copy it again. The stepper's check
  and warning reuse `ToastIcon`: c6a's expand icon and c6c's paginator arrows will each want a named
  glyph, so a `GLYPH_PATHS.check`/`warning` and their components should exist apart from the toast.
- **Suggested home:** a `disclosure.ts` and a direction-aware `focusTarget` in
  `packages/machines/src/interaction`; `withoutControls` in binding-core `components/content.ts`.
- **What must not change:** the `steppers` screenshot, the indication fixtures' `stepper.*` lines,
  `stepper.spec.ts` in the machines, bindings and the component suite's `Stepper` case (axe, keyboard
  and direction results).

## Open questions

- Is a column's disclosure-list semantics (instead of Zag's tabs) what the user wants? The tab
  pattern fails axe for content inside the list, so the alternative is to render a column's content
  outside the list, losing the connector beside it.
- Header height (56), indicator size (24) and spacing are ours; Angular's values (72, 24, 24px
  padding) weren't copied. Should a row's headers share the width equally (`flexGrow` on each)?
- Should the done state be a state the core knows (`completed`, with a `data-pf-*` attribute)
  instead of the indicator's `aria-checked`? It would avoid an ARIA attribute on a decorative
  element, but adds a state to core and every adapter.
- `labelPosition: bottom` and a per-step `optional` flag exist in Angular; the caption covers the
  second, the first is not built.
- React Native has no next and previous parts or keyboard; add them if the stepper is used there
  beyond a controlled `step`.
