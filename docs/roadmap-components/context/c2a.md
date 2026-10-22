# c2a: Tooltip and rich tooltip (output context)

Commits: see `git log 8dc8065..c2a-tooltip-split`.

## Built

- **Preset:** `tooltip.ts` is the plain tooltip: slots `root`, `caret`, `supportingText`
  (structure `root: [supportingText, caret]`), no variants. The `variant` group
  (`plain`, `rich`), the `subhead` and `actions` parts and the rich-only tokens
  (`richContainer`, `subheadColor`, `richContent`, `richRadius`, `richMaxWidth`) are removed.
  New `rich-tooltip.ts` (`richTooltip`): `root`, `caret`, `subhead`, `supportingText`, `actions`,
  with the rich tokens (`container`, `content`, `subheadColor`, `radius`, `maxWidth`). Both are
  registered in `pureform.ts` and `index.ts`; contrast pairs split by component; specs and the
  snapshot updated. `generated.ts` regenerated.
- **Anatomy:** `tooltipOverlayAnatomy` (root, trigger, positioner, content, caret,
  supportingText) and a new `richTooltipOverlayAnatomy` (scope `rich-tooltip`), with
  `compositeTestIds.richTooltip`. The `caret` is a child of the positioner, as Zag places it
  there.
- **Machine:** none new. Both tooltips run on Zag's tooltip, unchanged (`@pureform/machines/tooltip`).
- **binding-core:** `TooltipVariantProps` is only `tokens`; `isRichTooltip` removed;
  `isInteractiveTooltip(props, byDefault = false)` and `tooltipMachineProps(props,
interactiveByDefault = false)`; `CARET_STYLE` (`--arrow-background: currentColor`);
  `TooltipContentProps` has `caret` instead of `subhead` and `actions`. New
  `components/rich-tooltip.ts`: `RichTooltip*` types, `RICH_TOOLTIP_ROOT_PROPS`,
  `RICH_TOOLTIP_CONTENT_PROPS`, `richTooltipSelection`, `isInteractiveRichTooltip`,
  `richTooltipMachineProps` (interactive by default). Usage entries for `tooltip` (no group) and
  `rich-tooltip`.
- **Solid and React:** `Tooltip` has `Root`, `Trigger`, `Positioner`, `Content`, `SupportingText`,
  `Caret`; new `rich-tooltip/` subpath with `RichTooltip` (+ `Subhead`, `Actions`). The ready-made
  takes `caret`. `Caret` renders Zag's arrow wrapper as the `caret` part (with `--arrow-background:
currentColor`, and the part's `color` set to the surface's) with Zag's arrow tip inside.
  Package exports, vite entries, registry fixtures and specs added.
- **React Native:** the trigger overlay moved to `src/tooltip-overlay.tsx` (`TooltipHost`,
  `LONG_PRESS_TOOLTIP_MS`, `TooltipTriggerProps`, `TooltipBehaviorProps`). `Tooltip` and the new
  `RichTooltip` (`@pureform/react-native/rich-tooltip`) only supply their surface. No caret on
  native (nothing places it); the plain text is now in a `supportingText` view.
- **Suites and demos:** component-suites cases `tooltip` (plain, caret) and `richTooltip`
  (subhead, caret; scene, names and bindings), the Panda fixture page, rn-web-demo (`App.tsx`,
  config, test), the RN component list. Direction, indication, keyboard, overlay, hydration and
  controllable suites cover both through the case lists.

## Removed deprecated options

- `tooltip`'s `variant` (`plain`, `rich`): replaced by `richTooltip`. Props `subhead` and
  `actions` on `Tooltip` went with it. Nothing else was deprecated on the tooltip.

## Deviations from the design

- `richTooltip` runs on Zag's **tooltip** (with `interactive`), not `popover` or `hover-card`:
  neither package is installed and adding one needs a catalog and lockfile edit that would
  conflict with the sibling subphases. The tooltip machine already gives hover, focus, delays and
  an interactive surface; a click-to-open rich tooltip would be a separate trigger mode.
- The plain tooltip's text now sits in a `supportingText` part (it was the root's text before).
  Output is the same visually (the browser screenshots are unchanged).

## Stubs and gaps

- No caret on React Native.
- No screenshot of the caret itself: the fixture page draws static surfaces, which Zag doesn't
  place. The suites render and check it (parent, `--arrow-background`, Zag's tip).
- `Tooltip`'s `caret` has no preset-side size token; Zag's arrow size comes from `positioning`.

## How to verify

- `omni run build test -p <project>` for anatomy, preset, binding-core, machines, solid, react,
  react-native, rn-web-demo; `omni run test:e2e -p @pureform/browser-e2e-tests`;
  `bunx vitest run -c vitest.config.e2e.ts` in `tests/component-suites` (the whole file set: a
  `-t` filter leaves the pointer on the previous tooltip's trigger and fails `controllable`).
- `omni` caches failed tasks; use `-f failed` after fixing.

## Notes for the next phases

- c2b to c2f: add to the same registration lists (`COMPONENT_NAMES`, scene maps, `COMPONENTS`,
  `rn-components.ts`); expect small merge conflicts there. Run `generate` after merging.
- binding-core's `usage.spec.ts` scans `src/*/*.tsx` of each binding, and an import of a
  sibling subpath (`"../tooltip/…"`) counts as drawing its anatomies. A helper shared by two
  components belongs at the top of `src/`, as `tooltip-overlay.tsx`.

## Refactoring hints

- **Helpers that look generic:** the `Caret` part (arrow wrapper + tip, `CARET_STYLE`) is a
  popper arrow; c2f's menus or a later popover will want it. `TooltipHost` (RN) is the
  trigger-overlay for any anchored surface; the menu's RN overlay has the same trigger/anchor
  logic.
- **Code that looks like a sibling's:** Solid's and React's `rich-tooltip.tsx` are `tooltip.tsx`
  plus `Subhead` and `Actions`, rename for rename. They could share a part factory. Each is
  small, so this was left.
- **Suggested home:** a shared `anchoredParts` module in solid/react `src/` once a third
  component (popover, hover card) needs Root/Trigger/Positioner/Content.
- **What must not change:** the plain tooltip's resolved root styles, and the rich one's (the old
  `variant: "rich"` root); the snapshot shows both.

## Open questions

- Should the rich tooltip move to Zag's `popover` (click to open, focus into it) for actions that
  need keyboard focus? The `tooltip` machine keeps focus on the trigger.
- Does the caret want a size token and an offset from the corner, as Compose 1.5's does?
