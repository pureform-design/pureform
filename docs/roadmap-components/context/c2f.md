# c2f: Split button and FAB menu (output context)

Commits: see `git log 8dc8065..c2f-split-button-fab-menu`.

## Built

- **Preset** (`packages/preset/src/components/`):
    - `split-button.ts`: `splitButton`, slots `root`, `leadingButton`, `trailingButton`,
      `trailingIcon` (structure `root → leadingButton, trailingButton → trailingIcon`). Variants
      `color`, `variant` (`filled` default, `tonal`, `outlined`, `elevated`), `size` (`xsmall`
      to `xlarge`, `small` default, heights, padding, gap, icon, type and outline from
      `BUTTON_SIZES`), `density` (`densityTokenVariant`). Tokens: `radius` (full, the outside
      corners), `innerRadius` and `pressedInnerRadius` (per size in `SPLIT_BUTTON_SIZES`), `gap`
      (2px), `iconSize`, `leadingGap`, `trailingPadding`, outline, per-size `height*`/`padding*`,
      group, density and indication tokens. Each button is a `pressableRoot` with
      `fillTokenColors`/`fillVariant`; the inner corners round further while the button is
      `pressed`; the trailing button is round all over and its icon turns 180° while
      `expanded` (`aria-expanded`). Two indication entries (`leadingButton`, `trailingButton`).
      0 compounds.
    - `fab-menu.ts`: `fabMenu`, slots `root`, `list`, `item`, `itemIcon`, `itemLabel`,
      `closeTrigger` (structure `root → list, closeTrigger; list → item → itemIcon, itemLabel`).
      Variants `color` (any group) and `size` (`default`, `medium`, `large`, from `FAB_SIZES`;
      the deprecated `small` isn't offered). `root` is relative and stacks at the `menu` layer;
      `list` is absolute above the FAB at its end (`insetBlockEnd: 100%`, `insetInlineEnd: 0`,
      `listGap`), column, `gap` 4px, `overlayMotion(POPUP_MOTION)`; `item` is a 56px pill in the
      group's container colors (`interactiveColors`), `titleMedium`; `closeTrigger` is the FAB
      (size, size's radius, level 3 → 4 elevation) in the container colors, turning into the
      group's main colors and a full radius while `expanded`. Two indication entries
      (`closeTrigger`, `item`). 0 compounds.
    - Registered in `index.ts` and `pureform.ts`; spec `split-button.spec.ts` (both components,
      snapshot); `pureform.spec.ts` lists them.
- **Anatomy:** generated `splitButtonAnatomy`, `fabMenuAnatomy`; no composite (the FAB menu's
  list is placed by CSS, not Zag's positioner). `anatomy.spec.ts`: icon slots and indication
  entries.
- **Machines:** none new. Both run `@pureform/machines/menu` unchanged.
- **binding-core:** `components/menu-button.ts` (`menuButtonMachineProps(props, placement)`,
  `MENU_BUTTON_BEHAVIOR_PROPS`), `components/split-button.ts` (`SplitButton*` types,
  `SPLIT_BUTTON_ROOT_PROPS`, `SPLIT_BUTTON_CONTENT_PROPS`, `SPLIT_BUTTON_MENU_LABEL`,
  `splitButtonSelection`, `splitButtonMachineProps` → `bottom-end`), `components/fab-menu.ts`
  (`FabMenu*` types incl. `FabMenuItem`, `FAB_MENU_ROOT_PROPS`, `FAB_MENU_CONTENT_PROPS`,
  `fabMenuSelection`, `fabMenuMachineProps` → `top-end`, `fabMenuItemProps`); exported from
  `index.ts`; `usage.ts` entries `split-button` (splitButton + menu + ripple) and `fab-menu`.
- **Solid / React:** `split-button/` (`SplitButton` ready-made + `Root`, `LeadingButton`,
  `TrailingButton`, `TrailingIcon`, `Menu`) composes the Menu binding: `Menu.Root` (unstyled)
  around the split button's root, `Menu.Trigger as={TrailingButtonPart}` (drops the menu's
  `data-scope`/`data-pf-part`/`data-testid` so the part keeps its own), the menu's `Positioner`
  and `Content` for the items. Each button has its own interaction source
  (`useOwnInteractionSource` + `useInteractionHandlers`). `fab-menu/` (`FabMenu` + `Root`,
  `List`, `Item`, `ItemIcon`, `ItemLabel`, `CloseTrigger`) runs the menu machine itself, with
  item sources, presence on the list, and the FAB showing `icon`, or `closeIcon` (a cross by
  default) while open. Specs in `split-button/split-button.spec.tsx` (both components).
- **React Native:** `SplitButton` renders its row as the `Menu`'s `trigger` function (menu opens
  over the page under the trailing button, `bottom-end`); `FabMenu` has its own overlay (portal,
  `Anchored` `top-end`, `useDismiss`, presence), dropping the list's web placement keys
  (`inFlow`). Spec `split-button/split-button.spec.tsx`.
- **Suites:** component-suites cases `splitButton`, `fabMenu` (the FAB's indication) and
  `fabMenuItems` (the items' indication), scene names `SplitButton`, `FabMenu`; browser suite
  section `split-buttons-and-fab-menus` (new screenshot), `RN_COMPONENTS` gains both,
  indication fixtures regenerated (additions only).
- **Docs:** gap analysis §1.1 rows, §4.0 draft anatomies, §7 rows; preset, anatomy, solid,
  react, react-native READMEs.

## Deviations from the design

- **`fabMenu` has a `list` part** the draft anatomy didn't name: the items need a styled column
  above the FAB, and the anatomy needs every part inside `root`. Recorded in §4.0 and §7.
- **No Zag positioner for the FAB menu on the web.** Floating placement `top-end` doesn't mirror
  under `rtl` when the FAB sits at the start (Floating UI shifts it), so the list is placed by
  logical insets. React Native still uses its anchored portal.
- **No new machine files:** the phase listed "their machines (shared menu wiring)"; the menu
  machine serves both unchanged, and the shared wiring is binding-core's `menu-button.ts`.
- **Split button:** no `corner` or `toggle` variants (M3's split button is always round outside),
  no `touchTarget` part (not in the draft); the leading button's icon is content, not a part.
- Deprecated options: none touched. The FAB menu doesn't offer the FAB's deprecated `small` size
  or `surface` fill (new component, no back-compat).

## Stubs and gaps

- Spec values unconfirmed (m3.material.io needs a browser): split button inner radii per size
  (extraSmall, extraSmall, extraSmall, small, medium) and pressed (small, small, medium, large,
  large), trailing padding per size, the 2px gap; FAB menu item height 56, padding 24, gap 8,
  4px between items, 8px above the FAB, item elevation (none), the close button's colors.
- No stagger of the FAB menu items, no width change of the FAB into the close button (size
  stays), no optical offset of the trailing icon when open.
- Not in the rn-web or Solid demos.

## How to verify

- `omni run build test -b 8dc8065 -w -o continue` (see the final reply for the result).
- `bunx tsc --noEmit -p tsconfig.json` in preset, anatomy, binding-core, solid, react,
  react-native: clean.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "SplitButton|FabMenu"`
  (run `omni run prepare -p @pureform/panda-fixture` first).
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
  src/indication.e2e.test.ts src/rn-parity.e2e.test.ts src/panda-factories.e2e.test.ts`.
- The bindings' `src/split-button` specs: `bunx vitest run -c vitest.config.unit.ts src/split-button`.

## Notes for the next phases

- omni can replay a failed `binding-core#test:unit` from cache after sources change; run with
  `-f failed`.
- Screenshot `-u` doesn't rewrite a screenshot that passes within tolerance: delete it first to
  regenerate on purpose.
- Solid renders `aria-expanded={true}` as an empty attribute; pass `"true"`/`"false"`.

## Refactoring hints

- **Helpers that look generic:**
    - `menuButtonMachineProps` and `MENU_BUTTON_BEHAVIOR_PROPS`
      (`packages/binding-core/src/components/menu-button.ts`): any component that is a button
      opening Zag's menu (c4c toolbar overflow, an app bar's overflow).
    - Inline-run corners: the split button writes its own start/end corners per button
      (`split-button.ts`); `tiles.ts`' `positionCorners` is block-direction only. c2e's
      connected button group needs the inline version too: a `positionCorners(outer, inner,
      "inline")` would serve both.
    - A pressed-or-rest corner (`when(slot(part, "pressed"), pressed).else(rest)`) is `cornerRadius`
      without the toggle swap; `shared.ts` could offer it per corner.
- **Code that looks like a sibling's / the existing menu:**
    - The ready-made menu item rendering (leading, content with label and supporting text,
      trailing, trailing text) is copied into the Solid and React `SplitButton` from `Menu`'s
      `ReadyMade` (`menu/menu.tsx`). Export a `MenuItems` (render items from data) from the menu
      binding and use it in both.
    - The Solid/React `FabMenu` Root/List/Item mirror `Menu`'s Root/Content/Item (machine, item
      sources, presence). A shared `useMenuRoot` hook in each binding would remove it.
    - The React Native `FabMenu`'s overlay (controllable open, anchor measure, presence,
      dismiss, portal, `Anchored`) is `MenuOverlay`'s; extract an `AnchoredOverlay` in
      `react-native/src/overlay.tsx` (or reuse when c3's sheets do the same).
    - The leading/trailing buttons use the snackbar's pattern (own source + `useInteractionHandlers`
      on a plain `button`): a `usePlainPressable` helper in each binding.
    - c2e (button group) likely repeats the per-size button tokens: both read `BUTTON_SIZES`.
- **Suggested home:** `menu-button.ts` stays in binding-core; item rendering in each binding's
  `menu/`; inline corners in `tiles.ts`.
- **What must not change:** `packages/preset/src/components/__snapshots__/split-button.spec.ts.snap`,
  the `split-buttons-and-fab-menus` screenshot, the indication fixtures' `splitButton` and
  `fabMenu` entries, the component suites' `SplitButton`/`FabMenu` cases.

## Open questions

- Should the FAB menu use Zag's positioner after all (with `top-end` and no shift), at the cost
  of the mirror check when the FAB sits at the start? The CSS placement assumes the list fits
  above the FAB.
- Should `splitButton` reuse the button's `corner` (square) variant? M3 shows only round outer
  corners.
- The split button's open-menu direction case uses the small size: at `medium`, Zag rounds the
  menu's place to whole pixels and it lands 0.66px off its mirror.
- `fabMenu` `list` is a new part beyond the draft anatomy; confirm the name.
- Totals in gap analysis §1.8 (components, "missing" list) are left for the orchestrator, since
  every c2 sibling changes them.
