# c1e: Navigation (output context)

Commits: see `git log 38e43e0..c1e-navigation` (preset, machines, bindings, tests, docs).

## Built

- **Preset** (`packages/preset/src/components/navigation*.ts`):
    - `NAV_TOKENS` gains `horizontalIndicatorHeight` (40), `horizontalPadding` (`spacing("4")`),
      `horizontalGap` (`spacing("1")`).
    - `navHorizontalParts(ref, height)`: a horizontal destination over the vertical one. The item
      is the pill (row, `height`, full radius, inline padding; selected label colour
      `horizontalActiveLabelColor`); the `indicator` is absolute over the whole item (100% × 100%)
      holding the active indicator and the icon (icon offset by `horizontalPadding`); the
      `label` stays in flow, `position: relative` so it paints over the pill, with
      `marginInlineStart: iconSize + horizontalGap`. Same DOM as vertical, same indication
      surface (`indicator`), works on React Native (absolute children sit against their parent).
    - `navLabelTokens(group)`: colour groups now set root tokens `activeLabelColor: main` and
      `horizontalActiveLabelColor: onContainer` instead of an item `selected` colour, so the
      layout picks the token. `NavActive` lost its `label` field.
    - `navigationBar`: `itemLayout: vertical | horizontal` (default vertical). The vertical
      sizing (flex 1, height 100%, 6px block padding) moved from the base into
      `itemLayout.vertical` (computed output unchanged); horizontal centres content-sized items
      with a `spacing("2")` gap.
    - `navigationRail`: new `header` slot (root → header, item); tokens `modalContainer`
      (`surfaceContainer`), `expandedWidth` (220), `headerGap`, `headerSpacing`; rail overrides
      `horizontalIndicatorHeight` 56 and `horizontalGap` `spacing("2")`. Variants `expanded`
      (`"false" | "true"`; collapsed item width 100% moved to `expanded.false`) and `modal`
      (`surfaceContainer`, `level1`, `borderStartEndRadius`/`borderEndEndRadius` `large`,
      height 100%). Compounds: 0 before, 0 after.
- **Machine** (`packages/machines/src/navigation`): anatomy part `header`, `getHeaderProps()`.
- **binding-core** (`components/navigation.ts`): `NavigationVariantProps` gains `itemLayout`,
  `expanded`, `modal` (the last two typed only for the rail); `NavigationModalProps`
  (`open`/`defaultOpen`/`onOpenChange`, `closeOnEscape`, `closeOnInteractOutside`);
  `NavigationContentProps.header`; `navigationSelection` (modal implies expanded unless
  `expanded` is given); `navigationModalMachineProps`, `navigationModalPositionerLayout`,
  `navigationModalContentLayout`. Usage: bar `same("color", "itemLayout")`, rail
  `same("color", "expanded", "modal")` plus `scrim`.
- **Solid / React** (`navigation.tsx`): `Header` part, ready-made `header` prop (rail only),
  modal rail: Zag `dialog` machine, the scrim as backdrop (`dialogBackdropLayout`), a fixed
  positioner on the start edge, a `role=dialog` content div around the `<nav>`. `modal` is read
  once at mount (Solid: `untrack`). `createNavigation` takes an optional `scrim` anatomy (the
  rail passes `scrimAnatomy`, so the usage spec sees it in the rail's own files).
- **React Native** (`navigation.tsx`): `header` (rail), `itemLayout`/`expanded` through the
  selection, `ModalRail` (RN `Modal`, `Scrim`, press-outside and back button close).
- **Tests:** preset `expressive.spec.ts` (labels via tokens, horizontal layout, header, modal),
  snapshot updated; machine header test; binding-core selection/parts tests; Solid and React
  specs (header, expanded, modal open/Escape, horizontal); RN specs (horizontal row, absolute
  pill, header, expanded, modal); component-suites examples (bar "horizontal items", "…secondary
  color"; rail "expanded", "expanded, with a mirrored icon"); panda fixture page renders a
  horizontal bar and an expanded rail; c0a's "unread token" allowlist entries removed from
  `css-adapter/src/codegen.spec.ts` and `browser-e2e-tests/src/panda-factories.e2e.test.ts`.
- **Docs:** gap analysis rows (§0.1 row 3, §1.4 two rows, §2.4 nav rows, §7 nav row); READMEs
  of preset, machines, binding-core, solid, react, react-native.

## Deviations from the design

- Instead of moving the label into the pill, the pill covers the item in the horizontal
  layout ("a different indication surface per layout" kept as the same slot, repositioned).
- A modal rail is expanded unless `expanded={false}`.
- Deprecated options: navigation has none; nothing removed.

## Stubs and gaps

- The modal rail has no enter/exit animation (hidden/shown at once); the dialog uses no
  presence. Not in the component suites' examples (it renders in an overlay).
- A horizontal item without an icon still reserves the icon's space before the label.
- No `densityOffset` on navigation (never had one).
- The navigation screenshot and the indication fixtures (`web.txt`, `native.txt`) were
  regenerated on purpose: the fixtures only gained rows for the new variants (existing rows
  unchanged; horizontal labels compute to the icon colour on both targets); the screenshot adds
  a horizontal bar and an expanded rail with their labels inside the pill.

## How to verify

- `omni run build test -p <project>` for preset, anatomy, machines, binding-core, solid, react,
  react-native, css-adapter, panda-fixture, component-suites, browser-e2e-tests.
- `bunx tsc --noEmit -p tsconfig.json` in preset, machines, binding-core, solid, react,
  react-native.

## Notes for the next phases

- c7 (section labels): add `sectionLabel` to the rail's slots/structure next to `header`, and
  only style it under `expanded.true`.
- The gap analysis edits were made without `oxfmt` reflowing the tables (cells padded in place),
  to keep merges with siblings' rows simple; run `oxfmt` on it once after merging.

## Refactoring hints

- **Helpers that look generic:** `navHorizontalParts` (`navigation.ts`): "absolute surface
  covering the item + in-flow label offset past the icon" is the pattern any pill holding
  icon+label wants (button group items, toolbar, tabs with inline icon). `navLabelTokens`:
  a colour group setting two label tokens that layout variants pick between; same idea as
  `field.ts`'s `focusColor`.
- **Code that looks like a sibling's:** the modal rail's Zag dialog wiring in
  `packages/solid/src/navigation.tsx` and `packages/react/src/navigation.tsx` (`Modal`) copies
  the dialog binding's backdrop/positioner/content pattern; the RN `ModalRail` copies
  `react-native/src/dialog/dialog.tsx`'s `ModalDialog` (Modal + PortalHost + Scrim + Pressable).
  c3b (sheets) will need the same, edge-anchored.
- **Suggested home:** a binding-core `edgeOverlayLayout(edge, open)` replacing
  `navigationModalPositionerLayout`/`navigationModalContentLayout`, and per binding a shared
  `ModalFrame` (scrim + dialog machine + positioner + content) in `overlay.tsx`/`dialog`.
- **What must not change:** `packages/preset/src/components/__snapshots__/new-components.spec.ts.snap`
  (nav entries), the nav specs above, component-suites navigation examples, the navigation
  screenshot.

## Open questions

- Values not confirmed against M3's site: horizontal pill 40 (bar) / 56 (rail), padding 16,
  gaps 4 (bar) / 8 (rail), expanded width 220, header gap 8 and spacing 16, modal container
  `surfaceContainer`, elevation `level1`, end radius `large`, horizontal bar label `labelMedium`,
  expanded rail label `labelLarge`.
- A horizontal bar item is 40 tall, under the 48 dp touch target; no touch-target part added.
- Should `modal` be reactive in Solid (it's read once)?
