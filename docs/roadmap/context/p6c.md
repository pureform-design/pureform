# p6c: Overlays (output context)

Commits: b6846bb..7847d9c, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `b6846bb` | `feat(machines)`: `menu`, `dialog`, `tooltip` (Zag's, unchanged) and the own `snackbar` machine; catalog and lockfile entries                                                                             |
| `713eda2` | `feat(anatomy)`: `menuOverlayAnatomy`, `tooltipOverlayAnatomy`, `dialogOverlayAnatomy`, `dialogBackdropAnatomy`; `PartAnatomy.slot`, `partSlot`; binding-core's `partClasses`/`partSources` read the slot |
| `041b0f2` | `fix(machines)`: the snackbar root marks no `data-paused` (the pointer resting on it changed hydrated markup)                                                                                             |
| `fe06aae` | `feat(binding-core)`: `components/{overlay,menu,tooltip,dialog,snackbar}.ts`                                                                                                                              |
| `585a5a7` | `feat(solid)`: `menu`, `tooltip`, `dialog`, `snackbar` subpaths; `overlaysRegistry()` fixture; specs                                                                                                      |
| `147c7cd` | `feat(react)`: the same                                                                                                                                                                                   |
| `c75df6e` | `test(component-suites)`: four cases, `ComponentCase.opened`, `KeyboardCase.disables`/`focused`, `settlePlaced`, the regenerate flake fixed                                                               |
| `371c31c` | `chore`: `.vitest` in `.gitignore`                                                                                                                                                                        |
| `56d04fc` | `docs`: READMEs (machines, anatomy, binding-core, solid, react, component-suites)                                                                                                                         |
| `7847d9c` | `docs(design)`: "Built (p6c)" in §5.7 (portaling), §8, §9.1, §9.4, §9.7                                                                                                                                   |

## Built

### Components (both bindings, same subpaths, parts, elements, and DOM order)

| Subpath (`@pureform/solid/…`, `@pureform/react/…`) | Export     | Parts (element)                                                                                                                                                                                                                   | Machine                       |
| -------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `menu`                                             | `Menu`     | `Root` (`div`, unstyled), `Trigger` (`button` or `as`), `Positioner` (`div`, unstyled), `Content` (`div`), per item `Item` (`div`), `ItemLeading`, `ItemLabel`, `ItemTrailing`, `ItemTrailingText` (`span`)                       | `@pureform/machines/menu`     |
| `tooltip`                                          | `Tooltip`  | `Root`, `Trigger`, `Positioner` (as the menu's), `Content` (`div`), `Subhead`, `SupportingText` (`span`), `Actions` (`div`)                                                                                                       | `@pureform/machines/tooltip`  |
| `dialog`                                           | `Dialog`   | `Root`, `Trigger` (as the menu's), `Backdrop` (`div`, scrim scope), `Positioner` (`div`, unstyled), `Content` (`div`), `Icon` (`span`), `Headline` (`h2`), `Body`, `Actions` (`div`), `CloseTrigger` (`button` or `as`, unstyled) | `@pureform/machines/dialog`   |
| `snackbar`                                         | `Snackbar` | `Root` (`div`, `role="status"`), `SupportingText` (`span`), `Action`, `Close` (`button`)                                                                                                                                          | `@pureform/machines/snackbar` |

Machine part props: menu Trigger `getTriggerProps`, Positioner `overlayPositionerProps(getPositionerProps(), open)`,
Content `getContentProps`, Item `getItemProps({ value, valueText, disabled, closeOnSelect })` with
`hover: getItemState(item).highlighted`, ItemLeading/ItemTrailing `aria-hidden` + `mirrored`. Tooltip Trigger
`getTriggerProps`, Positioner as the menu's, Content `getContentProps`. Dialog Trigger `getTriggerProps`, Backdrop
`mergeProps(getBackdropProps(), normalizeProps.element(dialogBackdropLayout()))`, Positioner
`mergeProps(getPositionerProps(), normalizeProps.element(dialogPositionerLayout(open)))`, Content `getContentProps`,
Headline `getTitleProps`, Body `getDescriptionProps`, CloseTrigger `getCloseTriggerProps`, Icon `aria-hidden` +
`mirrored`. Snackbar Root `getRootProps`, SupportingText `getSupportingTextProps`, Action `getActionProps`, Close
`getCloseProps`. Root of menu/tooltip/dialog has no machine props (Zag has no root part); its `id` is a plain
attribute.

Ready-made props (`class`/`className`, `style`, `slotProps` keyed by part; `testId`, `unstyled` to Root):

- `Menu`: Root's + `trigger` (Node; the trigger renders as `<Trigger as={Button} label={trigger}>` only when given) and
  `items: MenuItem<Node>[]` (`value`, `label`, `valueText?`, `disabled?`, `closeOnSelect?`, `leadingIcon?`,
  `trailingIcon?`, `trailingText?`, `mirrorLeadingIcon?`, `mirrorTrailingIcon?`).
- `Tooltip`: Root's + `trigger`, `supportingText` (plain: straight in `Content`; rich: in `SupportingText`), `subhead`,
  `actions` (rich only, each only when given).
- `Dialog`: Root's (minus the `icon` variant) + `trigger`, `icon` (sets the `icon` variant), `mirrorIcon`, `headline`,
  `body`, `actions`; always renders `Backdrop`. `testId`/`unstyled` take a `backdrop` key too (`TestIdOverride<DialogPart>`).
- `Snackbar`: Root's + `supportingText`, `action` (button only when given), `closeLabel` (the close button's
  `aria-label`; the button renders only when given), `closeIcon` (default: an inline SVG cross).

Trigger props types: `MenuTriggerProps`/`TooltipTriggerProps`/`DialogTriggerProps` extend the part props with
`as?` and an index signature (`[prop: string]: unknown`), so `<Menu.Trigger as={Button} label="Edit" variant="text" />`
type-checks.

### Contracts (`@pureform/binding-core/src/components/`)

```ts
// overlay.ts
OverlayPlacement; OverlayPositioning { placement, gutter, sameWidth, strategy, flip }
overlayPositionerProps(p, open)               // + hidden: !open

// menu.ts
MenuPart = PartName<typeof menuOverlayAnatomy>; MenuVariantProps { color, density, tokens }
MenuElementIds { trigger, positioner, content }; MenuSelectDetails { value }
MenuBehaviorProps extends Controllable<"open", boolean> { onSelect, closeOnSelect, loopFocus, typeahead,
    positioning, "aria-label", ids }
MenuRootOwnProps; MENU_ROOT_PROPS; MenuItem<Node>; MenuContentProps<Node> { trigger, items }; MENU_CONTENT_PROPS
menuSelection(props); menuMachineProps(props)  // placement "bottom-start" unless given
menuItemProps(item)                            // { value, valueText, disabled, closeOnSelect }

// tooltip.ts
TooltipPart; TooltipVariantProps { variant, tokens }; TooltipElementIds { trigger, positioner, content }
TooltipBehaviorProps extends Controllable<"open", boolean> { openDelay, closeDelay, disabled, interactive,
    closeOnEscape, closeOnClick, positioning, ids }
TooltipRootOwnProps; TOOLTIP_ROOT_PROPS; TooltipContentProps<Node> { trigger, supportingText, subhead, actions }
TOOLTIP_CONTENT_PROPS; tooltipSelection(props); isRichTooltip(props)
tooltipMachineProps(props)                     // interactive ??= rich; placement "bottom" unless given

// dialog.ts
DialogPart = PartName<typeof dialogOverlayAnatomy> | "backdrop"; DialogVariantProps { icon?: boolean, tokens }
DialogElementIds { trigger, backdrop, positioner, content, headline, body, closeTrigger }
DialogBehaviorProps extends Controllable<"open", boolean> { modal, role, closeOnInteractOutside, closeOnEscape,
    restoreFocus, initialFocusEl, finalFocusEl, "aria-label", ids }
DialogRootOwnProps; DIALOG_ROOT_PROPS; DialogContentProps<Node> { trigger, icon, mirrorIcon, headline, body, actions }
DIALOG_CONTENT_PROPS (without icon); dialogSelection(props); dialogMachineProps(props) // headline/body → title/description ids
dialogPositionerLayout(open)   // { hidden, style: fixed, inset 0, flex, centered, border-box, padding 24px } (camelCase; normalize per binding)
dialogBackdropLayout()         // { style: { position: "fixed" } }

// snackbar.ts
SnackbarPart; SnackbarVariantProps { tokens }; SnackbarElementIds { root, supportingText, action, close }
SnackbarOpenChangeReason = "open" | "timeout" | "action" | "close" | "escape"; SnackbarOpenChangeDetails { open, reason }
SnackbarBehaviorProps extends Controllable<"open", boolean, SnackbarOpenChangeDetails> { duration, onAction, id, ids }
SnackbarRootOwnProps; SNACKBAR_ROOT_PROPS; SnackbarContentProps<Node> { supportingText, action, closeLabel, closeIcon }
SNACKBAR_CONTENT_PROPS; snackbarSelection(props); snackbarMachineProps(props)   // ids.root = id ?? ids.root
```

`parts.ts`: `partClasses` and `partSources` read the classes and the provider's `slotProps` by `partSlot(spec)`
(`slot`, else the part's name; `null` for none).

### Machines (`@pureform/machines`)

- `menu`, `dialog`, `tooltip`: `export * from "@zag-js/<name>"`, unchanged. New subpaths and root namespaces.
- `snackbar` (own; `src/snackbar/`): props `open`, `defaultOpen` (`false`), `onOpenChange({ open, reason })`,
  `duration` (5000; `null` stays), `onAction`, `ids`, `dir`. States `closed`, `open` (effect `waitForDuration`),
  `paused` (held by `pointerInside`/`focusInside`; `RESUME` of the last hold goes back to `open`, restarting the
  countdown). Events `OPEN`, `CLOSE { reason }`, `ACTION`, `PAUSE`/`RESUME { source }`, `CONTROLLED.OPEN/CLOSE`
  (Zag's dialog pattern: a watch on `open`). Api: `open`, `paused`, `setOpen`, `getRootProps` (`role="status"`,
  `hidden`, `data-state`, pointer/focus holds, Escape closes), `getSupportingTextProps`, `getActionProps`,
  `getCloseProps`. Spec: `snackbar.spec.ts` (7).
- New deps `@zag-js/menu`, `dialog`, `tooltip` (catalog entries). The lockfile gained only their hunks and
  `aria-hidden`, `focus-trap`, `rect-utils`, `remove-scroll`.

### Anatomy (`src/composites.ts`, `src/types.ts`, `src/attributes.ts`)

- `PartAnatomy.slot?: string | null`: the registry slot that draws the part and takes the provider's `slotProps`,
  when not its name (`null`: none). `partSlot(part)` reads it.
- `menuOverlayAnatomy` (`name: "menu"`, `scope: "menu"`): `root` (unstyled, `slot: null`, `pf-menu-root`), `trigger`,
  `positioner` (unstyled), `content` (`slot: "root"`, `data-pf-part="content"`, `pf-menu-content`), `item`,
  `itemLeading` (mirror), `itemLabel`, `itemTrailing` (mirror), `itemTrailingText`.
- `tooltipOverlayAnatomy`: the same wrapper parts, `content`, `subhead`, `supportingText`, `actions`.
- `dialogOverlayAnatomy`: the wrapper parts, `content`, `icon` (mirror), `headline`, `body`, `actions`, `closeTrigger`
  (unstyled).
- `dialogBackdropAnatomy`: `name: "scrim"`, `scope: "dialog"`, one part `root` with `data-pf-part="backdrop"`,
  `pf-dialog-backdrop`.
- `compositeTestIds.menu`, `.tooltip`, `.dialog`, `.dialogBackdrop`.

### Suites (`tests/component-suites`)

Cases `src/components/{menu,tooltip,dialog,snackbar}.ts` and the shared `overlay.ts` (`overlayParts(ids)`: trigger,
content, shown, `read` (shown and the trigger's `aria-expanded` agree), `click`, `placed`). In `COMPONENTS` and both
scenes. Suite changes:

- `ComponentCase.opened`: open renderings (`defaultOpen: true`), run by `accessibility` and `direction` only
  (`renderings(component)` in `harness/page.ts` lists `examples` then `open: <name>`); both now wait with
  `settlePlaced()` (settle, four frames, settle).
- `KeyboardCase.disables: false` skips "Tab skips it when disabled" (all four overlays: none has a disabled
  state of its own). `KeyboardCase.focused`: the state Tab leaves it in, which keys start from; the keyboard suite
  now clears `onChange` after tabbing.
- The runtime theme's `regenerate` case waits up to 10 s for the generator (see below).

## Deviations from the design

- **No portals.** Overlays render in place inside an unstyled Root element, so theme scope, `dir`, and the
  registry reach them and SSR/hydration see one tree. Recorded in §5.7 with its cost (clipping and stacking
  ancestors).
- **Overlays have a Root element the preset doesn't**: the preset's menu, tooltip, and dialog are only their
  surfaces. The surface is the `Content` part (`data-pf-part="content"`, `pf-<name>-content`) drawn by the `root`
  slot, through the new `PartAnatomy.slot`. `testIds.menu.root` (generated) now names the wrapper, matching
  `compositeTestIds.menu.root`.
- **The ready-made trigger is a pureform `Button`** (`as={Button}`), labeled by `trigger`; the menu, tooltip, and
  dialog subpaths import `../button`.
- **The snackbar is its own machine**, not Zag's toast (a toaster store with a queue). `onOpenChange` details carry
  a `reason`; Zag's overlays' details are `{ open }` only.
- **The dialog's layout is inline** (fixed, centered, 24px padding on the positioner; the backdrop `position: fixed`
  over the scrim's `absolute`): the preset has no slot for it.
- **No `disabled` on the menu or dialog**; the tooltip's `disabled` (Zag's) stops the tooltip, not the trigger.
  Disable the trigger itself (`slotProps.trigger.disabled`, or on the composed trigger).
- **The dialog surface is a `div`** with `role="dialog"`, not a native `<dialog>` (Zag's focus trap, dismissal, and
  `aria-hidden` on the page).

## Stubs and gaps

- **Clipping and stacking**: no portal, so a clipping ancestor cuts a menu or tooltip off unless
  `positioning.strategy: "fixed"`, and a transformed or `z-index` ancestor confines the dialog's fixed layer. The
  native top layer (`popover`, `<dialog>`) is the likely way out; not attempted.
- **Menu**: no submenus, groups, separators, checkbox/radio items (Zag's `getOptionItemProps`), or context-menu
  trigger in the bindings. Without a trigger the content's `aria-labelledby` points at a missing id; give
  `aria-label`.
- **Tooltip**: no arrow part (the preset has none). Rich tooltips' actions need `interactive` (the default for
  `rich`).
- **Snackbar**: no queue or stacking of several; focus isn't restored after the action closes it (goes to the
  page). Announcing relies on `role="status"` becoming visible, which some screen readers miss for a region that
  was `hidden`; inserting the message would be surer.
- **Open overlays aren't server-rendered by the suites** (Zag's placement rewrites the positioner's inline style);
  an app that server-renders `defaultOpen` gets a hydration attribute change on the positioner.
- **Demos not updated** (as after p6a, p6b).
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests` (99 differences).

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/machines`, `anatomy`, `binding-core`, `solid`, `react`: pass.
  Workspace `build` + `test:unit`: pass except the pre-existing rn-parity case.
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 7218 passed, 228 skipped (six projects).
- One component, every project: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run -t 'Menu|Dialog|Tooltip|Snackbar'`.
- Unit: `cd packages/solid && bun x vitest --config vitest.config.unit.ts run src/menu src/tooltip src/dialog src/snackbar`
  (16 per binding).

## Notes for the next phases (p6d, p6e)

- **The regenerate flake (p6b) had a clear cause**: the first runtime-theme `regenerate` case in a page pays the
  seed generator's cold dynamic import, which outran `vi.waitFor`'s default 1 s on the CSS and Tailwind projects
  (whichever component ran first). The wait is 10 s now.
- **A part named differently from its slot**: set `slot` on the composite part (`content` → `slot: "root"`); one
  `useComponent` call then styles everything, and the provider's `slotProps` reach it by slot. Tabs or lists with
  wrapper elements can do the same instead of a second scope.
- **The pointer rests where the last test (or spec file) left it**: a hover onto a trigger it already rests on fires
  nothing (unhover first), and a component that reacts to hover (the snackbar pauses) changes state under it. Don't
  put hover state into hydrated attributes (`data-paused` was dropped for this).
- **Zag places floating parts a few frames after opening and after the trigger has layout**; measuring right after
  `settle()` saw `0, 0`. Use `settlePlaced()` in suites, and `frames()` in specs.
- **Keyboard cases**: a component whose focus changes its state (tooltip) sets `keyboard.focused`; one with no
  disabled state sets `keyboard.disables: false`. A key that clicks a button trigger is `does: "click"` (the
  wrapper Root sees the click).
- **Tabs (p6d)**: Zag's tabs need `@zag-js/tabs`; check how its arrow keys follow `dir` in the keyboard suite (the
  select's didn't, p6b).
- **`as` on a part** passes the part's merged props (Zag's, test ids, `data-scope`) to the component, whose own
  attributes are overridden by them (`data-testid="pf-menu-trigger"` on the Button's root). Use it for triggers
  rather than wrapping.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing. `.vitest/` is ignored
  now.
- **Lockfile**: edited by hand (`--lockfile-only` rewrote emnapi, aria-query, commander, dom-accessibility-api,
  lightningcss); kept only the Zag hunks, then `bun install --frozen-lockfile` installed 7 packages with no change.
