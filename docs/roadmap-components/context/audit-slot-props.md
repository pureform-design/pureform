# Audit: per-part customization of the ready-made components (audit-slot-props)

Read-only audit; no code changed. R = `packages/react/src`, S = `packages/solid/src`, N = `packages/react-native/src`.
Everything was read from source at `main` (ed1e8d34); nothing was run. Each appendix section lists
the claims its author could not confirm; the main ones are repeated under "Unverified" below.
The per-component maps (what was asked for, items 1-6 per component and renderer) are in the
appendix, A-E; this part is the summary across them.

## 1. How the three renderers expose parts

**React / Solid.** A ready-made's props are `Omit<RootProps, keyof SlotKeyedProps<A> | "children"> & SlotKeyedProps<A> & ContentProps`
(`react/src/parts.tsx:380`, `solid/src/parts.tsx:320`), `A` being the component's own anatomy (the _overlay_
anatomy for overlays, which adds `trigger`, `positioner`, `content`):

| prop                          | shape                                                             |
| ----------------------------- | ----------------------------------------------------------------- |
| `className` (R) / `class` (S) | keyed by own part, `ClassValue`                                   |
| `style`                       | keyed by own part; R `CSSProperties`, S `CSSProperties \| string` |
| `slotProps`                   | keyed by own part, `PartProps`                                    |
| `testId`                      | string prefix, or keyed by part                                   |
| `unstyled`                    | boolean, or keyed by part                                         |

`testId` and `unstyled` go whole to Root's `useComponent`; `className`/`style`/`slotProps` are split
per part by `useSlotProps` (R, memoized, shared frozen `NO_PROPS`) / `createSlotProps` (S, static
objects or a Proxy per part). A part is reachable only if the ready-made calls `slot("part")` for it.
Merge order in a part: machine props, `data-*`, state attrs, registry class/token style, **provider
`slotProps[component][slot]`**, user props (`binding-core/src/parts.ts` `partSources`).

**Provider `slotProps`** (R/S only) is keyed component, then _slot_ (`spec.slot ?? part.name`), not
part name; a part with `slot: null` gets none, and a part may map to another slot (modal date
picker: `root` has `slot: null`, `content` has `slot: "root"`).

**React Native.** One ready-made per directory (`withEngine(Impl)`); no `Root`/parts, no provider
`slotProps`, no `className`, `slotProps` or `unstyled` anywhere. Per-part props: `testId` (string
prefix, or by part) via `testIdOf` -> `partTestId`. The only user style hook is `RootStyleProps
{ style?: StyleProp<ViewStyle> }` (`styles.ts:230`) merged by `withUserStyle(root, style)`
(`{...root, ...StyleSheet.flatten(style)}`, a new object per render) on root only, and only on:
Button, IconButton, Fab, Chip, Badge, Checkbox, Switch, Radio, RadioGroup (+ `Text` takes
`StyleProp<TextStyle>`, `FadeThrough.style`, and `inputProps`/`TextInputProps.style` on Input /
Textarea, where the text-field family's `inputProps.style` is silently overridden by `s.input`).

## 2. Groups of components by pattern

**P1. Single-recipe component, own parts, full keyed props (R/S); testId (+ root `style` on some) (N).**
Button, IconButton, Fab, Chip, Badge, Avatar, Checkbox, Switch, Slider, Rating, Stepper, Splitter,
Accordion, Carousel, Card, AppBar (+ its `searchBar` pass-through), TextField, TextArea, NumberField,
CodeField, NativeSelect, FileUpload, Paginator, Table, Tree, LinearProgress, CircularProgress,
LoadingIndicator, Tabs, ListItem. All own parts that the ready-made renders are keyed; gaps are
only parts it never forwards (sec. 4).

**P2. Wrapper over child ready-mades, own part = `root` only; nothing for children.**
ButtonGroup, ChipSet, Toolbar. R/S: plain `className`/`style` on Root (`PartProps`), no `slotProps`;
`unstyled` absent (ButtonGroup, ChipSet) or added by hand to Root props (Toolbar). Per-item
`testId` is a string prefix for that child. N: `testId` + `aria-label` only.

**P3. Collection keyed by the CHILD's parts.** List (`slotProps`/`unstyled` keyed by `ListItemPart`),
SelectionList, RadioGroup (keyed by `RadioPart`). Plain `className`/`style` are the group's root
(`PartProps`); `testId` is keyed by own parts. Their own parts (`item`, the `<li>`; radio-group root)
cannot take `slotProps`/`unstyled`. Child-level values are spread _after_ the item's own, so they win.

**P4. Overlay: overlay anatomy keyed, nested Button/IconButton as triggers.** Dialog, FullscreenDialog,
BottomSheet, SideSheet, Popover, RichTooltip, Tooltip, Menu, SearchView, DatePicker,
DockedDatePicker, TimePicker, DateInput. Keyed by overlay parts (R/S); N takes `testId` keyed by the
_plain_ anatomy, whose part names differ (sec. 5).

**P5. Field with nested menu/chips/buttons.** Select, Autocomplete, TagsInput, SearchBar, SearchView,
DateInput, TimeInput, ColorPicker, FileUpload, Snackbar, Toast, SplitButton, FabMenu, Toolbar
(overflow), Paginator. Own parts keyed; the nested Menu/Chip/Button/ListItem/Select parts are not
reachable from the ready-made (composed form only).

**P6. Thin wrappers that inherit.** CopyButton (`Omit<IconButtonProps,...>`, all IconButton keyed
props flow through `...rest`; N has no `style` typed), SelectionList (partly P3).

**P7. Single-part plain components** (`createSinglePart`): Icon, Text, Separator, Media, Label,
Description, ErrorText, SupportingText, Input, Textarea, Field, Scrim, TouchTarget, DragHandle:
element props on the root; `testId`/`unstyled` on Root; no keyed form. Not part of the standard's
"keyed" problem but they are the targets of nested forwarding.

**P8. Motion helpers.** FadeThrough, HorizontalSharedAxis, Ripple: flat props; N FadeThrough takes
`style`, HorizontalSharedAxis none.

## 3. Tokens

- Plain `tokens` normally goes to the component's own recipe (`xSelection(props)` in
  `binding-core/src/components/*.ts`). Outliers:
    - **List / SelectionList**: `tokens` -> the _items_ (ListItem defaults via `ListDefaults`/`listItemVariants`); `listTokens` -> the list recipe.
    - **RadioGroup**: `tokens` -> the radios (no group recipe).
    - **ButtonGroup**: `groupTokens` -> `buttonGroup`; no plain `tokens`. Button tokens unreachable.
    - **ChipSet**: `setTokens` -> `chipSet`; `tokens` -> each chip (under the chip's own).
    - **Toolbar**: `tokens` -> `toolbar`; `color: "vibrant"` provides `iconButton.accent` to children via `ProvidedTokens`.
    - **TagsInput**: `chip.tokens` (the one nested-token prop in the field group).
    - **Paginator**: only _provided_ tokens reach its Select and IconButtons.
- No prefixed token props elsewhere. Nested components' tokens (Button/IconButton in overlays,
  pickers, SplitButton; Menu in Select/Autocomplete/SplitButton/Toolbar; Chip; ListItem; Checkbox in
  Table selection cells; Scrim in dialogs/sheets) are not reachable by a dedicated prop. In R/S the
  only route is untyped `slotProps.<part>.tokens`/other non-class keys on an `as={Button}` part.
- Scrim tokens/variants are unreachable from Dialog/BottomSheet/SideSheet; selection `{}`.

## 4. Gaps (all)

1. **N**: no `className`/`slotProps`/`unstyled` anywhere; `style` is root-only `StyleProp<ViewStyle>` on 9 components; everything else is `testId` only. No provider `slotProps`.
2. **P2** (ButtonGroup, ChipSet, Toolbar): no way to address the child buttons/chips (class, style, slotProps, unstyled, tokens) from the ready-made; no `unstyled` (ButtonGroup/ChipSet); `indication` not forwarded.
3. **P3** (List, SelectionList, RadioGroup): `slotProps`/`unstyled` keyed by child; own `item`/`root` parts unreachable by those; ListItem `className`/`style` unreachable (keyed `slotProps.<part>.className` only); ListItem `slotProps.<part>.unstyled` works at runtime but is typed plain `PartProps`.
4. **Nested ready-made parts not reachable** (R/S): SplitButton menu; Toolbar overflow Menu and trigger; AppBar SearchBar (only `searchBar` pass-through); FabMenu per-item parts (shared by all items); Select/Autocomplete/SearchView menus (only string `testId`, no `menu`/`menuSlotProps`; `unstyled` never reaches nested menus/chips); TagsInput chips; DateInput/Pickers Cancel/Confirm buttons and calendar cells; FileUpload Button/ListItem/IconButton/LinearProgress; Field's Label/Input/Description/ErrorText; Paginator Select and IconButtons; Table selection Checkbox; Dialog/Sheet trigger & close buttons; Snackbar actions; ColorPicker HexField/EyeDropper.
5. **`className`/`style` dropped on `as={Button|IconButton}` parts** (unverified at runtime): trigger, closeTrigger, backButton, confirmAction, modeToggle, prev, next, Cancel/Confirm get a plain string/object but Button/IconButton expect keyed values and skip non-objects (`useSlotProps`, `parts.tsx:418`). Variants/tokens/parts only through undocumented `slotProps.<part>.<buttonProp>`.
6. **Backdrop** (Dialog, BottomSheet, SideSheet; R/S): rendered bare; only `testId.backdrop`/`unstyled.backdrop` reach it (through `partAsRoot`, `dialog-parts.tsx:188`); no class/style/slotProps/tokens. N scrim has no testId.
7. **Parts never forwarded / dead**: table `sortLabel`, `sortIndicator`; splitter `resizeTriggerIndicator`; Label `requiredIndicator`; TimeInput `input`, `fieldLabel`; CodeField hidden input; DateInput `segment` (R); FileUpload `error` (unused in R/S); docked picker `actions` (never rendered); S DatePicker/Docked `weekdays`/`grid`/`weekday`/`week` (`DayCalendar` takes no props; R forwards `weekdays`/`grid`); R `weekday`/`week`; TimePicker dial parts and scroll items; ColorPicker `areaBackground`, `areaThumb`, `transparencyGrid`, `channelSliderTrack/Thumb`, `swatch`; Avatar fallback (S); CopyButton status span; DragHandle `handle`; ListItem `frame`/`action`/`region` scopes (only `testId`); NavigationRail scrim/dialog (string `testId` only); Tabs/Stepper `transition`, `transitionScrim`.
8. **No per-instance addressing**: slot props on repeated parts apply to all instances (CodeField cells, NativeSelect options, FileUpload items, period buttons, slider handles/markers, rating stars, stepper steps, tabs, tiles/cells, tree `node` shared by leaf/branch, toast roots, menu items at every level; submenus ignore parent `testId`/`unstyled`). Striped table rows only split `row`/`alternateRow`.
9. **`testId` for nested pieces only as string prefix** (menus, chips, ListItems, FileUpload items): a by-part object does not propagate.
10. **Part-set drift N vs web** (same `testId` key, different element): overlays use the plain anatomy in N (no `trigger`/`positioner`/`content`/`backdrop`/`caret`; web `content` = surface, N `root` = surface; sheets: web `body` = N `content`; default ids `pf-dialog-content` vs `pf-dialog-root`). SearchView 10 vs 7 parts; NativeSelect N 3 of 5; N Select lacks `hiddenSelect`; date pickers' N anatomy lacks trigger/positioner/content; hard-coded trigger test ids in N pickers (`pf-date-picker-trigger`, `pf-docked-date-picker-trigger`) ignore `testId`; N FabMenu items share ids; N repeated ids (weekday, week, swatch, page, item, tile, cell, step).
11. **Behaviour/prop drift** (not slot-related but seen): Switch `icon` vs `checkedIcon`; Slider `aria-label` array vs string; SelectionList R/S never set `position` for `variant="segmented"` (List and N SelectionList do); N inputs use an `inputProps` bag, R/S take attributes directly; N Autocomplete `inputProps` overrides own role/aria; N Snackbar always renders close; R Snackbar host overwrites `style`/`onOpenChange` of `item.options`; SplitButton N forwards fewer Menu props; FabMenu `itemCount` token web-only; AppBar `scrollTarget` web-only; N lacks Tabs, NavigationBar, NavigationRail.
12. **R vs S**: `className` vs `class`; S `style` may be a string; S ChipSetChipProps doesn't omit `value`; S Avatar no Fallback without `src`; S docked picker always renders Label and hides month/year steps outside day view; S Toolbar always wraps `ProvidedTokens`, R only when unstyled root.

## 5. Collisions to watch

- `root` is in every anatomy; in overlays the anatomy `root` is an _unstyled wrapper_ `<div>` and the surface is `content`, so `className={{ root }}` hits an element the registry doesn't style. The nested scrim's anatomy (`name: "scrim"`, part `root`, attribute `backdrop`) is a second `root`; `testId.backdrop` is remapped to it (`partAsRoot`) and the test-id suffix is `part.attribute`, not the part name.
- Slot remaps: modal date picker `root` has `slot: null`; `content` has `slot: "root"`, so provider `datePicker.root` styles `content`. Provider `slotProps` is by slot, not part.
- Two parts called `trigger` in the modal date picker (`datePicker.trigger`, `calendarCell.trigger`); `calendarCell` is its own component/recipe.
- `touchTarget` is a part of button, iconButton, fab, chip, card **and** a standalone component/recipe; Card's `media`/`avatar` parts vs the standalone `media`/`avatar` recipes. Ready-mades render their own recipe's part, not the standalone component.
- `icon`/`label`/`trailingIcon` repeat across button/chip/fab/iconButton/splitButton: a standard keyed by part name only is fine per component but composition (nested `as={Button}`) mixes two recipes' parts under one key (`trigger` is the SplitButton/Dialog part, `root`/`label` are the nested Button's).
- `prev`/`next` in the docked picker each style two buttons; `item` means the `<li>` in `list` and the ListItem root; `period`, `channelSlider` shared.
- Token props already named differently (`tokens`, `listTokens`, `groupTokens`, `setTokens`, `chip.tokens`); a prefixed standard must also decide for `tokens` on List/RadioGroup/ChipSet where plain `tokens` currently means "children's".
- Existing props that look like slot props but aren't: `inputProps` (N), `searchBar`, `chip` (TagsInput), `positioning`, `indication` (a root prop in some components).

## 6. React Native constraints

- Style types: `StyleProp<ViewStyle>` root (`RootStyleProps`), `StyleProp<TextStyle>` for Text/TextInput parts; engine styles `s.*` are `MotionStyles` (may hold Animated/Reanimated values), cast to `ViewStyle`/`TextStyle` internally. A user key spread over an animated key replaces it (`withUserStyle` flattens and spreads).
- Parts render as `<v.part.View|Text|TextInput|Pressable style={s.part}>` from `useComponentSlots` (`views` proxy cached in a WeakMap per engine/factory; `moving` slots use the engine's animated views). A part style can't just be an array: engine styles may be animated.
- Per-render allocations that already exist (don't add to them): `withDefaults` + `splitSelection` in `useComponentSlots`; selection objects built from props each render (only Menu uses `useStableSelection`); `{...s.x, ...unselectable}` on every Pressable; `withUserStyle` copy; `id = (part) => testIdOf(...)` closures; `withEngine` rebuilds `{...props, key}`; per-item `groupedButtonVariants`/handlers in ButtonGroup/ChipSet; Toolbar size maps; `providedTokensFromPaths`; `inputProps` objects; bottom sheet `placement()`; toast group/item styles; ColorPicker calls `useComponentSlots` four times. `useStyles`' factory caches by selection value (doc comment; not verified).
- `testIdOf` throws on an unknown part; string prefix gives `${prefix}-${part.attribute}`.
- `withEngine` remounts the Impl on engine change; DatePicker/DockedDatePicker/FadeThrough/Expanding aren't wrapped.
- RN has no `className`; no provider `slotProps`.

## 7. Notes for the standard

- One keyed shape per ready-made over its _own_ anatomy (what P1 does), including P2/P3, with children reached through named nested props rather than through the child's parts keyed at the group level.
- Decide the RN equivalent up front: per-part `style` (ViewStyle/TextStyle by part) plus `testId`, built without extra per-render allocation (memoize on identity, as `useSlotProps` does); `unstyled`/`slotProps` likely have no RN meaning.
- Decide a single token naming rule (own-recipe `tokens` plus a prefix/nested key for children) and where `ProvidedTokens` fits.
- Cover the not-forwarded parts and the backdrop; define how repeated parts are addressed.
- Make `className`/`style` through `as={Button}` work (or route nested components' props explicitly).
- R `className` vs S `class` naming is a pre-existing renderer convention.

## Unverified (from the audits)

`className`/`style` dropped through `as={Button|IconButton}`; Snackbar host overwrite in Solid; RN `useStyles` dedupes by value; N FileUpload omits `fileIcon`; SupportingText has only `tone`; Solid Field/Label by structural grep only; Solid per-component by slot-name diffs rather than full reads; some N/Solid file:line refs are approximate (`~`); D's slider "N parity" note is garbled; whether `slotProps` is a declared key on FadeThrough, HorizontalSharedAxis and Ripple.

---

# Appendix: per-component maps

Each section below is one audited group; "Gaps" there are per-group.

## Appendix A: Buttons, chips, bars, small parts, card

Legend: **R** = packages/react/src, **S** = packages/solid/src, **N** = packages/react-native/src. Paths relative to `packages/`.
Common facts (verified):

- R/S `SlotKeyedProps<A>` = `className`|`class` (S uses `class`), `style`, `testId`, `slotProps`, `unstyled`, keyed by own parts (`react/src/parts.tsx:380`, `solid/src/parts.tsx:320`). `testId` = string prefix | by-part map; `unstyled` = boolean | by-part map (`binding-core/src/parts.ts:43-54`, `anatomy/src/attributes.ts:24`). `testId`/`unstyled` go whole to Root, the rest are split per part by `useSlotProps` (R) / `createSlotProps` (S).
- "Plain" below = Root's `PartProps` (`HTMLAttributes`; className string / style object, forwarded to Root element only; no `slotProps`).
- N: no `slotProps`/`className`/`unstyled` anywhere in these dirs. Only `testId` (prefix | by part, via `testIdOf`, `react-native/src/parts.ts:47`) and, on some components, root-only `style` from `RootStyleProps` = `StyleProp<ViewStyle>` (`react-native/src/styles.ts:230`), merged with `withUserStyle` (`styles.ts:235`; spread + `StyleSheet.flatten` every render). (So "RN has only testId" is not quite true: root `style` exists on Button, IconButton, Fab, Chip, Badge, and Text.)
- N per-render allocations common to the pressable components: `{ ...s.root, ...unselectable }` new object each render, `withUserStyle(...)` new object when `style` given, `id = (part)=>testIdOf(...)` closure, `withEngine` re-creates props `{...props,key}` each render (`parts.ts:36-44`). Noted per component only where extra.
- Same-named parts across recipes: every component has `root`; `touchTarget` is a part of button, iconButton, fab, chip, card **and** is its own component/recipe (`touchTarget.root`); card has `media` and `avatar` parts while `media` and `avatar` are their own components/recipes (`media.root`, `avatar.root`); `icon`/`label`/`trailingIcon` repeat across button/chip/fab/iconButton/splitButton. Ready-mades render their _own recipe's_ `touchTarget` part (e.g. `Button.TouchTarget`), not the standalone `TouchTarget` component.

---

### button

Anatomy: root, label, icon, secondaryIcon, touchTarget

- **Props**
    |                                                          | R                                | S                                       | N                                                              |
    | -------------------------------------------------------- | -------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
    | className/class                                          | keyed own parts                  | keyed own parts                         | absent                                                         |
    | style                                                    | keyed own parts (CSSProperties)  | keyed own parts (CSSProperties\|string) | plain, root only, `StyleProp<ViewStyle>` (`button.tsx:30,128`) |
    | slotProps                                                | keyed own parts                  | keyed                                   | absent                                                         |
    | unstyled                                                 | root prop `Unstyled<ButtonPart>` | same                                    | absent                                                         |
    | testId                                                   | prefix\|by part                  | same                                    | same (`button.tsx:51`)                                         |
    | Evidence R `button.tsx:141-179`, S `button.tsx:155-215`. |
- **Parts reachable**: R/S all 5 (`slot("root"|"touchTarget"|"icon"|"secondaryIcon"|"label")`). N: all 5 reachable for testId only; none for style except root.
- **Nested**: none (icon/secondaryIcon are user nodes).
- **Tokens**: `tokens` → `button` recipe (`buttonSelection`, `binding-core/src/components/button.ts:112-126`). Same in N (`button.tsx:92`).
- **Variants down**: none (parts share the button recipe).
- **Inconsistencies**: N lacks className/slotProps/unstyled and per-part style; N has no `touchTarget` hitSlop (IconButton/Chip N use `touchTargetSlopOf`); N allocs `pick(props,TRIGGER_ARIA)` each render (`button.tsx:121`). S uses `<Show>`/optional-part helpers for icon parts (not always mounted), R uses conditionals — same output.

### icon-button

Anatomy: root, touchTarget, container, icon, outline

- **Props**: R/S same shape as Button (keyed class/style/slotProps, `unstyled`, `testId`); N: `style` root only, `testId` (`icon-button.tsx:33-44,119`). R `icon-button.tsx:128-159`, S `:138-175`.
- **Parts reachable**: R/S all 5. N testId only for 5; style only root.
- **Nested**: none.
- **Tokens**: `tokens` → `iconButton`.
- **Variants down**: none.
- **Inconsistencies**: N renders `outline` only when `variant === "outlined"` (`icon-button.tsx:~108`); R/S always render `Outline`. N `aria-label` required prop (type) — R/S `IconOnlyName` union. N adds `Drawing` layers.

### fab

Anatomy: root, touchTarget, container, icon, label

- **Props**: same shape as Button/IconButton (R `fab.tsx:126-163`, S `:132-175`, N `fab.tsx:24-33` root `style`).
- **Parts reachable**: R/S all 5; N testId only (+root style).
- **Nested**: none.
- **Tokens**: `tokens` → `fab`; `extended` defaulted from `label` presence in all three.
- **Variants down**: none.
- **Inconsistencies**: N `onPress?: () => void` (no event) vs button/icon-button `(event)`; N `FabProps` has no `mirrorIcon` handling beyond state (does via `states`).

### fab-menu

Anatomy: root, list, item, itemIcon, itemLabel, closeTrigger

- **Props**: R/S keyed (class/style/slotProps) + `unstyled` + `testId` (R `fab-menu.tsx:219-269`, S `:244-300`). N: **only** `testId` (`fab-menu.tsx` `FabMenuProps`); no `style`, no `class`.
- **Parts reachable**: R/S all 6; but `item`/`itemIcon`/`itemLabel` slot props are shared by every item (no per-item). N testId all 6 — `item`, `itemIcon`, `itemLabel` get the _same_ test id for every item.
- **Nested**: closeTrigger is the FAB-looking trigger (own part, not `Fab`). No nested ready-made components.
- **Tokens**: `tokens` → `fabMenu`; ready-made injects `itemCount` token (`fabMenuSelection(props, itemCount)`, `fab-menu.ts:55-63`) in R/S (`fab-menu.tsx:114` R) — **N calls `fabMenuSelection(props)` without itemCount** (`react-native fab-menu.tsx` in `FabMenuImpl`/`CloseTriggerImpl`) so tokens differ.
- **Variants down**: none (color/size used by recipe).
- **Inconsistencies**: itemCount token only on web; N has `positioning` + `closeOnSelect` but not the full menu behavior props; N closeTrigger icon fallback is the string "×" vs `CloseIcon`. N per-render: `inFlow(s.list)` builds an object each render; `Item` gets `selection` object.

### split-button

Anatomy: root, leadingButton, trailingButton, trailingIcon (no `menu` part)

- **Props**: R/S keyed class/style/slotProps + unstyled + testId (R `split-button.tsx:178-224`, S `:179-…`). N: `testId` only (`split-button.tsx` `SplitButtonProps`); no style anywhere.
- **Parts reachable**: R/S 4 parts. The menu popup is **not** reachable from the ready-made: `<SplitButtonMenu>` is rendered with no props (R `split-button.tsx:217`, S ~`:208`); only the composed `SplitButton.Menu` takes `PartProps` forwarded to `Menu.Content`. Leading label/icon are bare children of `leadingButton` (no label/icon part).
- **Nested**: `Menu` (`Menu.Root` in Root, `Menu.Positioner`/`Menu.Content`, items via `Menu.ItemEntry` R / `Menu.Items` S / `<Menu items>` N). Menu parts not reachable (no `menu`/`menuSlotProps` prop). Forwarded to Menu: `open, defaultOpen, onOpenChange, onSelect, closeOnSelect, loopFocus, typeahead, aria-label, ids, positioning, indication` (R/S); N forwards `open, defaultOpen, onOpenChange, closeOnSelect, positioning, onSelect, aria-label, indication` only (no `ids`/`loopFocus`/`typeahead`).
- **Tokens**: `tokens` → `splitButton` only; menu tokens unreachable.
- **Variants down**: `color/variant/size/density` used by splitButton recipe; nothing passed to Menu.
- **Inconsistencies**: N prop set smaller (above); N `trailingIcon` default is string "▾" vs `DropDownArrow`; N leading text wraps in `<Text style={ownText(...)}>`; N `SplitButtonButtonImpl` builds style/IconSlot per render.

### button-group

Anatomy: root

- **Props**: R/S: Root's plain `className`/`style` (PartProps) only — **no** slotProps, **no** `unstyled`, no `indication` (R `button-group.tsx:49-55,150-188`; `useComponent` is called with only `selection` + `testId`, `:89`). `testId` = prefix|by part (`BUTTON_GROUP_ROOT_PROPS` includes `testId`). N: no `style`, `testId` only, plus `aria-label` (`button-group.tsx` `ButtonGroupProps`).
- **Parts**: `root` only; reachable via plain className/style (R/S), testId (all).
- **Nested**: `Button` / `IconButton` (ready-made forms) chosen by `item.label === undefined`. Per-item reachable props only: `value, label, icon, aria-label, disabled, width (icon btn), onClick, testId (string; becomes that button's prefix), interactionSource`. **No** className/style/slotProps/unstyled/tokens per item; no group-level way to reach button parts (`ButtonGroupItem` `binding-core/src/components/button-group.ts:100-113`). (`ButtonGroup.Button`/`.IconButton` composed forms do take full Button/IconButton props.)
- **Tokens**: `groupTokens` → `buttonGroup` (`buttonGroupSelection`, `:128-134`); no plain `tokens`; button tokens unreachable.
- **Variants down**: `size`, `color`, `variant`, `corner`, `density`, and computed `position` (`groupedButtonVariants`, `:215-231`; `connected` → position); IconButton gets `variant: text→standard`; group `disabled` ORed into each item. Button's own value wins.
- **Inconsistencies**: N applies the same variants but casts (`as Partial<…>`), handles selection via `toggleSelection` + `selected`, uses `role="group"` always; N `aria-label` explicit. R/S `ButtonGroupButtonProps` omit `"position"`; R also omits `"value"`. N allocates `groupedButtonVariants` + handlers per item per render.

### chip

Anatomy: root, icon, label, trailingIcon, touchTarget

- **Props**: R/S keyed class/style/slotProps + unstyled + testId (R `chip.tsx:129-165`, S `:141-…`); N root `style` + testId (`chip.tsx:25-39`).
- **Parts reachable**: R/S all 5; N testId (5), style root only.
- **Nested**: none.
- **Tokens**: `tokens` → `chip` (`chipSelection`, `chip.ts:63-73`).
- **Variants down**: none.
- **Inconsistencies**: N has `hitSlop` via `touchTargetSlopOf`; N `onPress` takes event; S optional icon parts via helpers.

### chip-set

Anatomy: root

- **Props**: R/S plain `className`/`style` on Root; no slotProps, no `unstyled` (R `chip-set.tsx:45-141`, `useComponent` with only selection+testId `:68`). `testId` prefix|by part. N: `testId` + `aria-label`; no style.
- **Parts**: `root` only.
- **Nested**: `Chip` (ready-made) per item via `SetChip`. Per-item reachable: `value, label, icon, trailingIcon, disabled, onClick, testId, interactionSource`. No per-item className/style/slotProps/unstyled; chip parts unreachable from `ChipSet` (composed `ChipSet.Chip` takes all `ChipProps`).
- **Tokens**: `setTokens` → `chipSet` (`chip-set.ts:102-107`); plain `tokens` → each chip (merged under chip's own via `chipSetChipVariants`, `:116-138`).
- **Variants down**: `variant, corner, color, density, tokens` → chips; `disabled` ORed.
- **Inconsistencies**: N wraps in `ScrollView` when `singleLine` (web: recipe CSS only); N has `selected`-driven toggles via `toggleSelection`; same variants down. R `ChipSetChipProps` omits `value` from ChipProps and re-adds optional; S doesn't omit. Token-prop naming differs from button-group (`setTokens` vs `groupTokens`) and from Chip's `tokens` use.

### copy-button

No anatomy / no recipe. Not an Object.assign; no `Root`.

- **Props**: `CopyButtonProps = Omit<IconButtonProps, icon|aria-label(ledby)|selected|…|toggle|position> & behavior & content` (R `copy-button.tsx:29-41`, S `:28-…`) → inherits IconButton's keyed className/style/slotProps/unstyled/testId, all forwarded via `...rest` to `IconButton`. N: `CopyButtonVariantProps` + `InteractiveProps` + `testId: TestIdOverride<IconButtonPart>`; no `style` typed (`copy-button.tsx` `CopyButtonProps`), though `...rest` would forward it.
- **Parts**: IconButton's 5 parts reachable in R/S. The live-region `<span role="status">` has no part, only `COPY_ANNOUNCEMENT_STYLE` inline (R `:70`, S).
- **Nested**: `IconButton` (ready-made); full reach through inherited props.
- **Tokens**: `tokens` → iconButton (inherited).
- **Variants down**: all IconButton variants (`CopyButtonVariantProps = Omit<IconButtonVariantProps,"position">`).
- **Inconsistencies**: N: no live-region span (uses `AccessibilityInfo.announceForAccessibility`), `copy` injectable prop, glyph fallbacks `✓`/`⧉`; web sets `data-copied`.

### toolbar

Anatomy: root

- **Props**: R/S: plain `className`/`style` (Root PartProps) + `unstyled: Unstyled<ToolbarPart>` added in `ToolbarRootProps` (R `toolbar.tsx:48-55`, S `:44-…`); no slotProps; `testId` prefix|by part. N: `testId` + `aria-label`; no style, no unstyled (`toolbar.tsx` `ToolbarProps`).
- **Parts**: `root` only.
- **Nested**: per item `IconButton` (when `icon`) or `Button variant="text"`; overflow `Menu` with `IconButton` trigger (R/S `Menu.Root/Trigger/Positioner/Content`, N `<Menu>`). Per-item reachable: `value,label,icon,disabled,selected,onSelectedChange,onClick,testId,interactionSource`. No per-item class/style/slotProps. Overflow: `overflowLabel`, `overflowIcon`; its testId = `${testId string|"pf-toolbar"}-overflow` (`toolbarOverflowTestId`, `toolbar.ts`); menu parts/`positioning` not reachable.
- **Tokens**: `tokens` → `toolbar`. `color:"vibrant"` provides `iconButton.accent` token to descendants (`unstyledToolbarProvidedTokens`, `toolbar.ts:115-125`; R wraps in `ProvidedTokens` only when unstyled root `toolbar.tsx:74-100`; S always wraps `ProvidedTokens` `toolbar.tsx:~66`; N `providedTokensFromPaths(selected.providedTokens.root)`). Nested tokens otherwise unreachable.
- **Variants down**: none (Button fixed `variant="text"`).
- **Inconsistencies**: hidden overflow items use keyed `style: {root: HIDDEN}` passed into Button/IconButton on web (`toolbar.tsx:129`) vs wrapper `<View style={HIDDEN}>` + `onLayout` measurement on N; N `inFlowInline(s.root)` and an outer ROOM view; web uses `watchOverflow` DOM. N allocs lots per render (sizes map, `element(item)`).

### app-bar

Anatomy: root, leading, content, headline, subtitle, trailing

- **Props**: R/S keyed class/style/slotProps + `unstyled` + `testId` (R `app-bar.tsx:163-243`, S `:174-…`). N: `testId` only + scroll props (`scrollOffset`, `scrollBehavior`); no style (`app-bar.tsx` `AppBarProps`).
- **Parts reachable**: R/S all 6. N testId all 6.
- **Nested**: `SearchBar` when `searchBar` prop (type `SearchBarProps`), spread whole after defaults `centered`, `scrolled` (R `app-bar.tsx:176`, S `:…`, N `:~55`): reach through `searchBar={{ slotProps/className/tokens/testId… }}` (SearchBar's own shape), not through app-bar's slotProps. Leading/trailing/headline/subtitle are user nodes.
- **Tokens**: `tokens` → `appBar`; search bar tokens via `searchBar.tokens`. N provides tokens to leading/trailing via `ProvidedTokens` (`app-bar.tsx`); web via recipe provided tokens in `useComponent`.
- **Variants down**: `centered`, `scrolled` → SearchBar; `search` forced from `searchBar !== undefined`; `size` becomes `small` while searching/collapsed (`appBarSelection`, `app-bar.ts:183-193`).
- **Inconsistencies**: R/S have `scrollTarget`/`useAppBarState`, N only `scrollOffset` + `useAppBarScroll` hook; N `mirrorLeading` as state on root; N `accessibilityRole="header"` on root vs `<header>`.

### badge

Anatomy: root. Ready-made = the single part (`Badge` = `Root`).

- **Props**: R/S plain `className/class`, `style`, `unstyled` (`Unstyled<"root">`), `testId` via `createSinglePart` (`react/src/single-part.tsx`; R `badge.tsx:19-36`). N: root `style` (`StyleProp<ViewStyle>`, `single-part.tsx:168`), `testId`; no unstyled.
- **Parts**: root.
- **Nested**: none. **Tokens**: `tokens` → `badge`. **Variants down**: none.
- **Inconsistencies**: N renders content in an inner `NativeText` with `ownText(style)`; N `Drawing` layer.

### avatar

Anatomy: root, image, fallback

- **Props**: R/S keyed class/style/slotProps + unstyled + testId (R `avatar.tsx:112-136`, S `:126-…`). N: `testId` only (`single-part.tsx:92`), no style.
- **Parts reachable**: R/S all 3; N testId all 3.
- **Nested**: none.
- **Tokens**: `tokens` → `avatar`. **Variants down**: none.
- **Inconsistencies**: with no `src`, R always renders `<Fallback>`; **S renders children bare in root (no fallback part)** (`solid avatar.tsx` ReadyMade `<Show when={props.src!==undefined} fallback={props.children}>`); N renders fallback `NativeText` unless image loaded. N own status/`onError` state per render; N `Image` style array alloc per render. (`hasImage` semantics differ across renderers.)

### icon

Anatomy: root. Single-part (`Icon` = `Root`).

- **Props**: R/S plain class/style + unstyled + testId (R `icon.tsx:18-38`). N: `testId` only; no style (`single-part.tsx:204`); N `Icon` is a plain function, not `withEngine`.
- **Parts**: root. **Nested**: none. **Tokens**: `tokens` → `icon`. **Variants down**: none.
- **Inconsistencies**: `mirror`, `label`, `filled`, `size`, `color` present in all; N hard-codes `color` from `tokens["colors.onSurface"]` merge.

### text

Anatomy: root. Single-part.

- **Props**: R/S plain class/style + unstyled + testId. N: `style: StyleProp<TextStyle>` (not ViewStyle) + `testId`; no unstyled (`single-part.tsx:67`).
- **Tokens**: no `tokens` prop (`textSelection` takes only `textStyle` → selection key `style`; `text.ts:37`). Variant prop is named `textStyle` to avoid clashing with `style`.
- **Inconsistencies**: N hard-codes `color: tokens["colors.onSurface"]`; N style is an array allocated per render (`[ {color}, rootOf(selected), props.style ]`).

### touch-target

Anatomy: root. Single-part; standalone, but ready-made components render their own recipe's touchTarget part instead.

- **Props**: R/S plain class/style + unstyled + testId (R `touch-target.tsx:17-37`). N: `testId` only (`Omit<TouchTargetRootOwnProps,"unstyled">`, `touch-target.tsx:17`); no style; plus `useTouchTargetSlop` hook.
- **Tokens**: none (`selection: () => ({})`). **Nested/variants**: none.
- **Inconsistencies**: N renders an outer absolute-fill `View` + inner `View` (testId on inner); web renders one `aria-hidden` span.

### drag-handle

Anatomy: root, handle

- **Props**: R/S: plain class/style + `unstyled`/`testId` typed loosely (index signature `[prop: string]: unknown`, `drag-handle.tsx:28`; cast to `Unstyled<PartName>`). **No** keyed class/style/slotProps: `handle` part is rendered by the component without user props (R `drag-handle.tsx:46-49`, S `:~46`). N: `onPress`, `aria-label`, `testId` only.
- **Parts reachable**: `root` (class/style); `handle` only via `testId` map / `unstyled` map. N: testId both.
- **Tokens**: `tokens` → `dragHandle`; `orientation` variant.
- **Inconsistencies**: not Object.assign (no `.Root`) unlike single-part components; R/S index signature weakens types; N has `onPress`.

### separator

Anatomy: root. Single-part; element `hr` (S/R), `role=separator` when not hr.

- **Props**: R/S plain class/style + unstyled + testId. N: `testId` only (`single-part.tsx:~221`), no style.
- **Tokens**: `tokens` → `separator`; variants `inset`, `orientation`.
- **Inconsistencies**: N is a `View`; no `as`.

### media

Anatomy: root. Single-part; element `img` (R/S) / `Image`/`View` (N).

- **Props**: R/S `MediaProps` = img+video HTML attrs + own props (plain class/style, unstyled, testId). N: `src`, `source`, `alt`, `testId`; no style prop (`single-part.tsx:314-322`).
- **Tokens**: `tokens` → `media`; variants `aspect`, `shape`.
- **Inconsistencies**: N `source` (ImageSourcePropType) vs web `src`; N computes aspect ratio from loaded image, mutates a copy of style per render.

### card

Anatomy: root, touchTarget, actionArea, media, header, avatar, headerText, headline, subhead, headerAction, content, supportingText, actions, footer

- **Props**: R/S keyed class/style/slotProps + unstyled + testId (R `card.tsx:179-295`, S `:183-…`). N: `testId` only; no style (`card.tsx` `CardRootProps`).
- **Parts reachable**: R/S all 14 (`slot(...)` for each; `touchTarget` only when interactive and not action-area; `actionArea` when layout uses it). N testId for all parts; all rendering via `Card.*` parts that take only `children`.
- **Nested**: `media`, `avatar`, `headerAction`, `actions`, `footer`, `children` are user nodes inside plain wrapper parts (`div`); they are **not** the `Media`/`Avatar` components (names clash with those recipes). No nested ready-mades rendered by Card.
- **Tokens**: `tokens` → `card`. Nested tokens not reachable (would be per-node props).
- **Variants down**: `padded` defaulted to false when section layout; `interactive`/`disabled` routing (when action area exists, Root gets `interactive=false` and `disabled` goes to ActionArea).
- **Inconsistencies**: R/S also support `href`/`as` (anchor / button elements, `cardElement`); N uses `onPress` presence to pick element. When `actionArea`, R/S forward the remaining own props (aria, onClick, href, …) to the action-area element (`card.tsx:276`) and the Root gets only `CARD_ROOT_PROPS`. S builds `rootOwnProps` via getters. N touchTarget only on pressable root.

---

### Not applicable / no ready-made in some renderers

- badge, avatar, icon, text, separator, media: N has them (in `react-native/src/single-part.tsx`, re-exported by per-dir `index.ts`); no differences in structure to note beyond above.
- All requested dirs have a ready-made in at least one renderer; none are "no ready-made".

### Gaps (this group)

1. **Group wrappers expose nothing for children**: ButtonGroup, ChipSet, Toolbar offer only root class/style (web) and per-item `testId`; no per-item `className/style/slotProps/unstyled/tokens`, no slot-forward to button/chip parts. N has no style at all.
2. **Token props inconsistent**: ButtonGroup `groupTokens` (no `tokens`), ChipSet `setTokens` (own) + `tokens` (→ chips), Toolbar `tokens` (own); Text has no tokens.
3. **Unstyled absent** on ButtonGroup, ChipSet (R/S) and everywhere in N; Toolbar adds `unstyled` itself in `ToolbarRootProps`, outside `SlotKeyedProps`.
4. **N is mostly testId-only**; root `style` only on Button/IconButton/Fab/Chip/Badge (+ TextStyle on Text); none on FabMenu, SplitButton, ButtonGroup, ChipSet, Toolbar, AppBar, Card, Avatar, Icon, Separator, Media, TouchTarget, DragHandle.
5. **Unreachable nested parts**: SplitButton menu, Toolbar overflow Menu+trigger, AppBar's SearchBar (only via `searchBar` pass-through), CopyButton status span, FabMenu per-item slots (shared across items), DragHandle `handle`.
6. **Renderer divergence**: Avatar (S has no Fallback part without `src`; R always renders it), FabMenu `itemCount` token (web only), IconButton Outline (N conditional), SplitButton Menu forwards (N misses `ids/loopFocus/typeahead`), AppBar scroll API (`scrollTarget` web only), Fab `onPress` signature (N no event).
7. **Duplicate test ids in N FabMenu** (`item`, `itemIcon`, `itemLabel` per item share one id) and in web too (same part id per item).
8. **Part-name collisions**: Card `media`/`avatar`/`touchTarget` vs standalone components; DragHandle/Card index types (`[prop: string]: unknown`) loosen typing.
9. **R/S naming**: `className` vs `class`; S ChipSetChipProps doesn't omit `value` like R does.

## Appendix B: Fields and inputs

Legend: R = packages/react, S = packages/solid, N = packages/react-native. Paths are relative to `packages/`.

- **R/S shared mechanism.** Ready-mades take `SlotKeyedProps<Anatomy>`: `className` (R) or `class` (S), `style`, `slotProps`, `testId`, `unstyled`.
    - These are keyed by the component's own parts. `className`/`style`/`slotProps` are per part. `testId` is a prefix string or an object by part. `unstyled` is `boolean` or an object by part.
    - R definition: `react/src/parts.tsx:380`. S definition: `solid/src/parts.tsx:320`.
    - S `style` is `JSX.CSSProperties | string`; R `style` is `CSSProperties`.
    - The ready-made spreads `slot("root")` onto Root. Root also gets every other prop: `tokens`, variants, machine props and element attributes such as `id`, `onClick`.
    - `testId` and `unstyled` go to Root whole. Root then applies them to every part.
- **N shared mechanism.** There is no `className`, `slotProps` or `unstyled` anywhere in RN.
    - Parts are drawn by `useComponentSlots` (`react-native/src/styles.ts:169`). Test ids come from `testIdOf` / `partId`, which take a string prefix or an object by part.
    - The only style prop is plain `style` on the plain single-part components, and only on the ones noted below. The multi-part RN ready-mades have no `style` at all.
    - Per-render allocations in RN (hot spots): `testId={(part)=>partId(...)}` closures, `selection={xSelection({...props})}` objects, spread style objects `{...s[part], ...unselectable}`, and `[s.root, rest.style]` arrays.
    - `useComponentSlots` runs `splitSelection(withDefaults(...))` every render.
- **Dir layout.** `text-field` and `text-area` have a ready-made in R and S via the shared factory `createTextInput` (`react/src/text-input.tsx`, `solid/src/text-input.tsx`). In N they have only an `index.ts` re-exporting `TextField` / `TextArea` from `react-native/src/text-input.tsx`.
- **Tokens, general rule.**
    - Plain `tokens` is typed `InstanceTokens<recipe>` and goes to the component's own recipe: textField, textArea, field, label, input, plainTextarea, description, errorText, supportingText, numberField, codeField, tagsInput, searchBar, searchView, autocomplete, select, nativeSelect, dateInput, timeInput, fileUpload.
    - Selection functions are in `binding-core/src/components/*`.
    - The only prefixed or nested token prop in this group is TagsInput's `chip`.
    - No component here accepts `listTokens`, `menuTokens` or similar.

### TextField (`text-field/`, factory `text-input.tsx`)

Anatomy `textField`: root, container, leadingIcon, prefixText, input, suffixText, label, trailingIcon, supportingText, counter.

1. **Props.**

    | Prop              | R                             | S                                              | N                                                              |
    | ----------------- | ----------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
    | className / class | keyed by own parts            | keyed by own parts (`class`)                   | absent                                                         |
    | style             | keyed by own parts            | keyed by own parts (`CSSProperties \| string`) | absent (see Gaps)                                              |
    | slotProps         | keyed by own parts            | keyed by own parts                             | absent                                                         |
    | unstyled          | boolean or keyed by own parts | boolean or keyed by own parts                  | absent                                                         |
    | testId            | prefix or keyed by own parts  | prefix or keyed by own parts                   | prefix or keyed by own parts (`TestIdOverride<TextFieldPart>`) |
    - R/S evidence: `react/src/text-field/text-field.tsx:62-77`.
    - N: `inputProps?: TextInputProps` (`text-input.tsx:57`). This is the only RN style-ish escape hatch and it targets the TextInput only.

2. **Own parts.**
    - R/S: all 10 parts reachable through the keyed props. `slot("root")` is spread onto Root.
    - N: all parts get a `testID`, but none take a style or props. Only the TextInput is reachable, through `inputProps`.
    - N: `style` inside `inputProps` is overridden by `style={s.input}` (`text-input.tsx:~217`) because the spread comes first. `onFocus` in `inputProps` is also overridden; only `onBlur` is composed.
3. **Nested components.** None. The visibility icon is an inline SVG (R/S). N renders a `Pressable` with a "◉/◡" glyph for `secure`; its `aria-label` is `revealLabel`.
4. **Tokens.** Plain `tokens` go to `textField` (`binding-core/text-field.ts:226`). The same in S and N. No other token props.
5. **Variants passed down.** None.
6. **Inconsistencies.**
    - Prop names: R `className`/`autoComplete`/`maxLength`; S `class`/`autocomplete`/`maxlength`, plus `style` may be a string.
    - R/S take input attributes directly (TEXT_FIELD_INPUT_PROPS + framework spelling). N has an `inputProps` bag instead.
    - N lacks `unstyled`, `className` and `slotProps`.
    - N `secure` has `revealLabel`; R/S have no equivalent label prop (the secure toggle's label is fixed).
    - N `TextField` is a plain function wrapping `Field` (itself `withEngine`).
    - Part-id helper `partId` types `testId` per anatomy, but the N `Field` is shared with TextArea, Select, Autocomplete and DockedDatePicker. Its `FieldPart` is the union of text-field and text-area parts.

### TextArea (`text-area/`, factory `text-input.tsx`)

Anatomy `textArea`: root, container, leadingIcon, input, label, trailingIcon, supportingText, counter. It has no prefixText or suffixText.

1. **Props.** As TextField (R/S keyed by own parts via `SlotKeyedProps<textAreaAnatomy>`, `react/src/text-area/text-area.tsx:63-77`).
    - N: `lines` (default 3), `inputProps`, `testId` by `TextAreaPart`, no style, no unstyled.
2. **Own parts.** Same as TextField minus the affixes.
3. **Nested.** None.
4. **Tokens.** `tokens` go to `textArea` (`textAreaSelection`).
5. **Variants.** `autoGrow` is an R/S/N variant of the root.
6. **Inconsistencies.**
    - N has `lines`. R/S take `rows` as the textarea attribute (React: `rows`, via TEXT_AREA_INPUT_PROPS).
    - R/S omit `prefixText`/`suffixText` by deleting them from `parts`. N's shared `Field` guards `affix()` with `name === "textArea"`.
    - Otherwise the same as TextField.

### textarea (plain `Textarea`; anatomy `plainTextarea`, single part `root`)

1. **Props.**
    - R/S: element props (`className`/`class`, `style`, `ref`) go to the single native `<textarea>`: plain, not keyed. `testId`/`unstyled` typed by `TestIdOverride<"root">` / `Unstyled<"root">` (`PieceOwnProps`, `binding-core/field-primitives.ts:~48`). `as` is supported.
    - N: `TextControlProps` (`field/text-control.tsx:23`): all of RN `TextInputProps` minus `testID`/`value`/`defaultValue`, so `style` is `StyleProp<TextStyle>` and is applied as `[s.root, rest.style]`. `testId` is a prefix or by part. No unstyled.
2. **Own parts.** `root` is reachable. N also merges `multiline` / `numberOfLines: 3` / `textAlignVertical: "top"` defaults.
3. **Nested.** None.
4. **Tokens.** `tokens` go to `plainTextarea` (`plainTextareaSelection`).
5. **Variants.** None.
6. **Inconsistencies.** N has no `unstyled`, no `as`, no `ref`. Inside a Field, R/S/N all read the field state. R/S use `aria-describedby`; N has `aria-labelledby` only.

### input (plain `Input`; anatomy `input`, single part `root`)

Same shape as plain Textarea.

- R/S: `InputProps` (`react/src/input/input.tsx:17`).
- N: `TextControlProps<InputPart>`. N Input has no `type` prop.
- Tokens go to `input` (`inputSelection`).
- Same N gaps: no unstyled, no `as`. `style` is `TextStyle` via the TextInput.

### Field (anatomy `field`, single part `root`)

1. **Props.**
    - R/S: element props plain (`className`/`class`, `style`); `testId` (root only) and `unstyled` (`boolean`) typed by `"root"`; `as`.
    - N: no `style`, no `unstyled`; only `testId`.
    - All: `disabled`, `invalid`, `required`, `controlId`, and content props `label`, `description`, `error`.
2. **Own parts.** `root`.
3. **Nested (ready-made, when no `children`).** `Label`, `Input`, `Description`, `ErrorText` (`react/src/field/field.tsx:90`).
    - Their props are not reachable: none of `labelProps`, `inputProps` or `slotProps` exists. The nested `Input` is rendered with no props at all, so no `type`, `placeholder`, `value` or `tokens`.
    - To customize them you must compose via `children`.
4. **Tokens.** `tokens` go to `field` only. Nested pieces cannot be given tokens.
5. **Variants.** None. States (`disabled`, `invalid`, `required`) are shared through context. Pieces' own props win.
6. **Inconsistencies.**
    - N counts description and error via `register` (`useFieldPiece`). R/S use `describe` and a `useState`.
    - N lacks `as`, `style` and `unstyled`.
    - N's context gives `aria-labelledby` only, since RN has no `aria-describedby`.

### Label (anatomy `label`: root, requiredIndicator)

1. **Props.**
    - R/S: element props plain on root (`className`, `style`). `testId`/`unstyled` typed by `"root" | "requiredIndicator"`. Props `required` and `disabled`.
    - N: no style, no unstyled; `testId` by part; `required`, `disabled`, `tokens`; `children`.
2. **Own parts.** `requiredIndicator` is **not** reachable for className/style/slotProps in R/S. `unstyled`/`testId` can address it by part. In N, `testId` by part works (`label.tsx:~45`).
3. **Nested.** None.
4. **Tokens.** `tokens` go to `label` (`labelSelection`).
5. **Variants.** None.
6. **Inconsistencies.**
    - N lacks `style`, `as` and `unstyled`.
    - N renders a `Text` with `nativeID={field.ids.label}`. R uses `htmlFor`.
    - The required mark is `REQUIRED_MARK`, rendered via a nested `scope.render("requiredIndicator")` in R/S.

### Description / ErrorText (anatomies `description`, `errorText`; single part `root`)

1. **Props.**
    - R/S: element props plain on root; `tokens`, `testId` (`"root"`), `unstyled`; `as`.
    - N: only `children`, `tokens`, `testId` (`DescriptionProps`/`ErrorTextProps`, `description.tsx:11`, `error-text.tsx:11`). No `style`.
2. **Own parts.** `root` only.
3. **Nested.** None.
4. **Tokens.** `tokens` go to `description` / `errorText`.
5. **Variants.** None.
6. **Inconsistencies.**
    - The N `tokens` type is derived with `Parameters<typeof xSelection>[0]["tokens"]`, versus an `InstanceTokens` import elsewhere.
    - N lacks `style` and `unstyled`.
    - N mounts register with a counter; R/S use `useDescribes`.
    - An unrelated name clash: `errorText` here and the `error` part of `fileUpload` are different things (see FileUpload).

### SupportingText (anatomy `supportingText`: root; variant `tone`)

1. **Props.**
    - R/S: via `createSinglePart`, element props plain; `tone`, `tokens`, `testId` (`"root"`), `unstyled`; `as`.
    - N (`single-part.tsx:260`): `tone`, `tokens`, `children`, `testId`. No `style`, no `unstyled`.
2. **Own parts.** `root`.
3. **Nested.** None.
4. **Tokens.** `tokens` go to `supportingText` (`supportingTextSelection`: `{tone, tokens}`).
5. **Variants.** `tone`. This is a standalone component; the ready-mades with a `supportingText` part use their own recipe's `supportingText` part, not this recipe.
6. **Inconsistencies.**
    - N is a plain function with `useSelectedStyles`, not `withEngine`. It has no `style`, unlike N `Text`, which has `style`.
    - N `Text` takes `style: StyleProp<TextStyle>` and `Separator`/`Scrim` etc. have their own.
    - Same-named `supportingText` part exists in 10+ recipes (textField, textArea, numberField, codeField, tagsInput, autocomplete, select, dateInput, fileUpload, plus the standalone recipe). All are independent.

### NumberField (anatomy `numberField`: root, container, leadingIcon, prefixText, input, suffixText, label, control, decrementTrigger, incrementTrigger, supportingText)

1. **Props.**
    - R/S: `SlotKeyedProps<numberFieldAnatomy>`: all five keyed by own parts (`react/src/number-field/number-field.tsx:223-235`).
    - N (`number-field.tsx:57-83`): `testId` by part only. `inputProps: TextInputProps`. No style, no unstyled. Also `indication`.
2. **Own parts.** All 11 reachable in R/S through `slot(...)`, including `control`, `decrementTrigger` and `incrementTrigger`. N: testIds for all, nothing else.
3. **Nested.** None as components. The trigger icons are default SVGs; `decrementIcon` / `incrementIcon` are content props.
4. **Tokens.** `tokens` go to `numberField` (`numberFieldSelection`).
5. **Variants.** `variant`, `color`, `density`.
6. **Inconsistencies.**
    - N `NumberFieldProps` is a pick list. It lacks `largeStep`, `allowMouseWheel`, `required`, `name`, `form`, `id` and `interactionSource`; R/S take the full set.
    - N has `inputProps`; R/S spread input attributes through `slotProps.input`.
    - N trigger objects are rebuilt every render: `{ ...s[part], ...unselectable }`.
    - R `ReadyMade` passes `leadingIcon`/`prefixText`/`suffixText` booleans into Root. There is no `trailingIcon` (the control occupies it).

### CodeField (anatomy `codeField`: root, label, control, input, supportingText)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts. `slotProps.input` is applied to **every cell** (`react/src/code-field/code-field.tsx:150`: `<Input key index {...slot("input")} />`).
    - N: `testId` by part only; `inputProps` ("for every cell"); no style, no unstyled.
2. **Own parts.** All 5 reachable in R/S. The hidden `<input>` Root renders for form submit is not a part and is not reachable (`code-field.tsx:80-90`). N: all `testId`; same for cells (one `input` testId for all cells).
3. **Nested.** None.
4. **Tokens.** `tokens` go to `codeField`.
5. **Variants.** `variant`, `color`, `density`.
6. **Inconsistencies.**
    - Per-cell customization is impossible: every cell receives the same slot props and the same `testId`.
    - N's prop pick lacks `name`, `form`, `required`, `autoFocus` etc.
    - N `testId` prefix doc: `otp` → `otp-input`.

### TagsInput (anatomy `tagsInput`: root, container, leadingIcon, input, label, trailingIcon, supportingText)

Nested anatomy `inputChip`: root, avatar, icon, label, remove, touchTarget. It has same-named `root`, `label` and `icon` parts.

1. **Props.**
    - R/S: `SlotKeyedProps<tagsInputAnatomy>` keyed by own parts. Root-level `chip?: InputChipVariantProps` (corner, toggle, color, density, tokens) is the only way to reach chips.
    - N: `testId`, `inputProps`, `chip` (via TagsInputVariantProps), no style/unstyled.
2. **Own parts.** All 7 reachable in R/S.
3. **Nested.** `Chip`, `ChipTouchTarget`, `ChipAvatar`/`ChipIcon`, `ChipLabel`, `ChipRemove`, under their own `inputChip` scope.
    - Chip parts are **not** reachable via className/style/slotProps or `unstyled`.
    - `testId` only reaches them when it is a **string** prefix (`tagsInputChipTestId` → `${prefix}-chip`, `binding-core/components/tags-input.ts:167`). A by-part object does not reach chips.
    - `chip` gives variants and tokens to the chips. `indication` is forwarded to chips. `unstyled` is not (`react/src/tags-input/tags-input.tsx:122-126`).
    - Content hooks: `chipAvatar`, `chipIcon`, `removeIcon`.
4. **Tokens.** Plain `tokens` → `tagsInput`. `chip.tokens` → `inputChip` recipe. This is the only nested token path in the group.
5. **Variants.** `variant`, `color`, `density` are the field's. The chip's `color`/`density` are separate, under `chip`; the field's are not passed down.
6. **Inconsistencies.** R/S same. N takes `chip` and chip testId the same way, plus `indication`. N lacks the className/style/slotProps/unstyled route.

### SearchBar (anatomy `searchBar`: root, leading, input, trailing)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts. Input attributes `list`, `aria-*` go to the input (`SEARCH_BAR_INPUT_PROPS`). Everything else goes to Root.
    - N (`search-bar.tsx:25`): `testId` by part; `inputProps`; `placeholder`; no style/unstyled.
2. **Own parts.** All 4 reachable in R/S.
3. **Nested.** None.
4. **Tokens.** `tokens` go to `searchBar`. Variants are `centered` and `scrolled` (`searchBarSelection`).
5. **Variants.** `centered`, `scrolled`.
6. **Inconsistencies.**
    - N takes `placeholder` and `inputProps` explicitly; R/S spread attributes.
    - N's list has `value`/`defaultValue`/`onValueChange` plus `disabled` only (no `name`, `required`, `readOnly`).
    - N root style: `{ ...s.root, ...unselectable }` per render.

### SearchView (R/S anatomy `searchViewOverlayAnatomy`: root, trigger, positioner, surface, header, leading, input, trailing, divider, content; N anatomy `searchView`: root, header, leading, input, trailing, divider, content)

Nested menu anatomy `searchViewMenuAnatomy` (item parts).

1. **Props.**
    - R/S: `SlotKeyedProps<overlayAnatomy>` keyed by the 10 overlay parts, with `testId`/`unstyled` re-typed to `SearchViewPart` (`react/src/search-view/search-view.tsx:450-456`).
    - N: `testId` by the 7-part N anatomy only; no className/style/slotProps/unstyled.
2. **Own parts.**
    - R/S: all 10 reachable.
    - N: `trigger`, `positioner` and `surface` do not exist. The trigger is an unstyled `View` with a fixed `testID` (`compositeTestIds.searchView.trigger`), unaffected by `testId`.
3. **Nested.**
    - Default trigger: a `SearchBar` (R/S `<SearchBar as="span" inert readOnly value placeholder>`). Its props and parts are **not reachable**; only the `trigger` slot of the view itself is. `trigger?: ReactNode` replaces it.
    - Leading/trailing buttons: `IconButton`. Not reachable except via `leading` / `trailing` content and `backLabel` / `clearLabel`.
    - Suggestion items: drawn as menu parts (`Item`, `ItemLabel`, …). These are **not reachable** through the ready-made. The `menu` scope takes a testId only when `testId` is a string (`search-view.tsx:206-210`), and `indication` is forwarded. No `unstyled`.
    - N: `MenuItems` gets `searchViewMenuSelection()` plus `indication`. No `testId`.
4. **Tokens.** `tokens` go to `searchView` only. The menu gets `{}` (`searchViewMenuSelection`). No menu or bar tokens.
5. **Variants.** `variant` (fullScreen/docked/contained). Nothing is passed to the menu.
6. **Inconsistencies.**
    - The R/S and N part sets differ (10 vs 7). R/S `SearchViewProps.testId` accepts `trigger`, `positioner`, `surface`; N doesn't.
    - N `trigger` can be a render function receiving `SearchViewTriggerProps`; R/S take a node.
    - N lacks className/style/slotProps/unstyled.
    - Same-named parts: `leading`/`trailing`/`input` appear in both searchBar and searchView. `searchViewMenu.item*` vs `menu.item*`.

### Autocomplete (anatomy `autocomplete`: root, container, leadingIcon, prefixText, input, suffixText, label, trailingIcon, supportingText; menu anatomy `autocompleteMenu`: positioner, root, itemGroup, itemGroupLabel, item, itemLabel)

1. **Props.**
    - R/S: `SlotKeyedProps<autocompleteAnatomy>` keyed by the 9 field parts. `aria-label*` go to the combobox.
    - N: `testId` by `AutocompletePart`. `inputProps` (merged: its `role`, `onKeyPress` etc. are overridden by your `...props.inputProps` spread last). No style/unstyled. N has `error`, `toggleLabel`, `indication`.
2. **Own parts.** The 9 field parts are reachable in R/S. The menu parts (`positioner`, `content`, `item`, `itemGroup`, `itemGroupLabel`, `itemLabel`) are **not reachable** through slot props. `Positioner` and `Content` are rendered bare (`autocomplete.tsx:443-446`).
3. **Nested.** Menu scope `autocompleteMenu` plus items. `testId` reaches it only if a string prefix (`autocomplete.tsx:247-251`). `unstyled` is not forwarded to the menu; `indication` is. N: `MenuListbox` gets no `testId` or tokens.
4. **Tokens.** `tokens` go to `autocomplete`. The menu gets none.
5. **Variants.** The menu receives the field's `color` and `density` (`autocompleteMenuSelection`). `variant` is not passed.
6. **Inconsistencies.**
    - N spreads every other prop into `Field` and uses TextFieldPart ids (`partId(autocompleteAnatomy, ...)`).
    - N `trailingIcon` defaults to "▾"; R/S use a `DropDownArrow`.
    - Autocomplete `items` group by `group` in R/S only.
    - N builds `inputProps` and `selection` objects per render.

### Select (anatomy `select`: root, container, leadingIcon, prefixText, input, suffixText, label, trailingIcon, supportingText, hiddenSelect; menu anatomy `selectMenu` as above)

1. **Props.**
    - R/S: `SlotKeyedProps<selectAnatomy>` keyed by the 10 parts, including `hiddenSelect`.
    - N: `testId` by `SelectPart`, plus FieldProps (`inputProps` omitted). No style/unstyled.
2. **Own parts.** R/S: all 10, including `hiddenSelect`. N: no `hiddenSelect` is rendered, and the field's `partId` typing uses the text-field part set.
3. **Nested.** Same as Autocomplete: the `selectMenu` scope (`testId` string only, `indication` forwarded, no `unstyled`). The menu's parts are unreachable. `Positioner`/`Content` are bare.
4. **Tokens.** `tokens` go to `select`. The menu gets none.
5. **Variants.** The menu gets the field's `color` and `density` (`selectMenuSelection`).
6. **Inconsistencies.** N Select has no `error`, `required` or `name` props (R/S take them, `binding-core/select.ts:139-150`); `invalid` only. Same N behavior as Autocomplete for the rest.

### NativeSelect (anatomy `nativeSelect`: root, select, icon, group, option)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts. `slotProps.option` is applied to **every** option, including the placeholder one. `slotProps.group` is applied to every group (`react/src/native-select/native-select.tsx:259-311`).
    - N: `testId` by part; no style/unstyled. Props `items`, `placeholder`, `icon`, `aria-*`, `disabled`, `invalid`, `required`, `name`, `form`, `id`.
2. **Own parts.**
    - R/S: all 5.
    - N: only `root`, `select` and `icon` have test ids. `group` and `option` are not rendered (a native menu or `Menu` draws them).
3. **Nested.** N renders `Menu` (or `@react-native-menu/menu`) as the picker. Its parts and tokens are not reachable.
4. **Tokens.** `tokens` go to `nativeSelect`.
5. **Variants.** None.
6. **Inconsistencies.**
    - N has a different part set in practice (3 of 5).
    - R/S per-option customization is impossible: one slot for all options.
    - N `select` is a `Pressable` with `[plain.select, unselectable]` style per render.

### DateInput (anatomy `dateInput`: root, header, headline, selectedDate, modeToggle, divider, field, container, leadingIcon, prefixText, input, suffixText, label, trailingIcon, supportingText, segment, actions)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts, 17 parts.
    - N: `DateInputProps = Omit<DateInputRootOwnProps, unstyled|icons|affixes> & DateInputContentProps`. `testId` by part, and N has no style/unstyled.
2. **Own parts.**
    - R/S: 16 of 17 reachable. R's ready-made does not give `segment` a slot (`react/src/date-input/date-input.tsx:224-226`: bare `<Segment segment>`). S passes `slots("segment")` to every segment (`solid/src/date-input/date-input.tsx:388`).
    - N: every part gets a `testID`; `segment` is a repeated `id("segment")` for all segments.
3. **Nested.**
    - `modeToggle`: rendered `as={IconButton}`, so `slotProps.modeToggle` is spread on `IconButton` and its props are reachable that way. N: `IconButton`.
    - `Actions`: Cancel and OK are `Button variant="text"` with only `cancelLabel` / `confirmLabel`; not reachable. The same in N.
4. **Tokens.** `tokens` go to `dateInput`. No Button or IconButton tokens.
5. **Variants.** `variant`, `color`, `density` are the field's. None are passed to the buttons.
6. **Inconsistencies.**
    - **Range**: S renders two `Input`s for `selectionMode="range"` (`indexes()`, `solid/.../date-input.tsx:329`). R renders a single input even though `selectionMode` is accepted. N renders a single input.
    - The `segment` slot works in S only.
    - N has the combined supporting text `props.error ?? supportingText ?? hint`.

### TimeInput (anatomy `timeInput`: root, headline, body, hourField, minuteField, input, fieldLabel, separator, periodSelector, period, actions)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts. Content props: `headline` and `actions` only.
    - N: `tokens`, `testId` by part, `TimeBehaviorProps`, content props; no style/unstyled.
2. **Own parts.**
    - R/S: `input` and `fieldLabel` are **not reachable**; they are rendered inside each `hourField` / `minuteField` label with no props (`react/src/time-input/time-input.tsx:103-125`). `slotProps.hourField` and `slotProps.minuteField` do reach the label wrapper. The same applies to the `period` slot: one slot for both AM and PM. The `Field` part takes a `label` prop (`TimeInputFieldProps`), reachable only through `slotProps.hourField.label`, not typed.
    - N: all parts get a `testID` (`props.id(part)`), and `period` takes the root's `testId` through `TimeButton`.
3. **Nested.** None. N `TimeButton` is internal.
4. **Tokens.** `tokens` go to `timeInput` (`timeInputSelection({tokens})`).
5. **Variants.** None.
6. **Inconsistencies.**
    - The ready-made has no `hourLabel` / `minuteLabel` props.
    - N takes `tokens` through `TimeInputRootOwnProps["tokens"]`.
    - `indication` is supported in all three.

### FileUpload (anatomy `fileUpload`: root, label, dropzone, icon, headline, supportingText, itemGroup, item, error)

1. **Props.**
    - R/S: `SlotKeyedProps<Anatomy>` keyed by own parts.
    - N: `testId` by part; `FileUploadVariantProps` (`color`, `tokens`) plus `files`, `onPick`, `onRemove`, `fileIcon`, `removeIcon`, `errorMessage`, `removeLabel`; no style/unstyled. The N `Image` preview and the other inline styles are internal.
2. **Own parts.** R/S: all but `error` are reachable (`slot("item")` goes to every item, accepted and rejected alike). The `error` part has a `Part` (`react/src/file-upload/file-upload.tsx:245`) but the ready-made renders the `ErrorText` component for rejected files, so the part is unused there. N renders `v.error.Text` with `testId("error")`.
3. **Nested.**
    - `Trigger`: `Button variant="outlined"` with only a `trigger` label (`null` hides it). Not reachable.
    - Per item: `ListItem` (gets a `testId` of `${prefix}-item` only when `testId` is a string: `fileUploadItemTestId`, `binding-core/file-upload.ts:253`). `IconButton`, `LinearProgress` and `ErrorText` are also nested and not reachable. `ListItem`'s `slotProps` are used internally for `headline` and `supportingText`.
4. **Tokens.** `tokens` go to `fileUpload`. `error` is a derived variant from `invalid || error`.
5. **Variants.** `color`. Nothing is passed down.
6. **Inconsistencies.**
    - N has an `onPick` callback; R/S use a native file dialog and drop (Zag).
    - N renders `v.error.Text` where R/S render `ErrorText`.
    - N has no `fileIcon` prop (it is omitted from content props; `fileIcon` instead lives on `FileUploadEntry`).
    - R/S item testId is a prefix only.

### No ready-made / not applicable

- `supporting-text/` in R/S: a single-part component, no `ReadyMade` (covered above).
- `native-select/` etc.: covered above.
- `text-input.tsx`: the factory, not a component.
    - R/S: `createTextInput` builds `Root`/parts/`ReadyMade` for TextField and TextArea.
    - N: `Field` (`withEngine(FieldImpl)`) plus `TextField` / `TextArea`.
- `field/text-control.tsx` (N): the shared `TextInput` core of Input and Textarea.
- `description/`, `error-text/`, `label/`, `field/`, `input/`, `textarea/` in R/S are single-part pieces without a keyed ready-made (their props are plain element props).

### Gaps (group B)

1. N has no `className`, `slotProps` or `unstyled` on any component here.
    - `style` exists only on the TextInput-backed pieces (Input, Textarea) via `TextInputProps`, as `TextStyle`.
    - There is no `style` on the plain RN pieces Field, Label, Description, ErrorText, SupportingText.
    - The text-field family's `inputProps.style` is silently overridden by `style={s.input}`.
2. R/S never expose nested components' parts:
    - TagsInput chips (only `chip` variants/tokens, and `testId` as a string).
    - Select/Autocomplete/SearchView menus (only `testId` as a string; no `menu` or `menuSlotProps`).
    - SearchView's default SearchBar trigger, IconButtons and menu items.
    - DateInput Cancel/OK `Button`s.
    - FileUpload `Button`, `ListItem`, `IconButton` and `LinearProgress`.
    - Field's Label, Input, Description and ErrorText.
    - Only `DateInput.modeToggle` is reachable incidentally, because `as={IconButton}` spreads its slot props.
3. Slot props applied to many instances share one slot: every CodeField cell, every NativeSelect option, every FileUpload item, both `period` buttons. There is no per-instance customization.
4. Unreachable own parts:
    - TimeInput `input` and `fieldLabel`.
    - Label `requiredIndicator`.
    - CodeField's hidden input.
    - DateInput `segment` in R (reachable in S).
    - FileUpload `error` (unused in R/S).
5. `testId` for nested menus and chips only works with string prefixes; a by-part object does not propagate. `unstyled` never reaches nested chips or menus.
6. Part-set mismatch for the same component:
    - SearchView R/S have 10 parts; N has 7.
    - NativeSelect N exposes only 3 of 5.
    - N Select lacks `hiddenSelect`.
    - R vs S DateInput `segment` and range input.
7. Prop shape differences:
    - R `className` vs S `class`; S `style` may be a string.
    - R/S take input attributes directly; N uses an `inputProps` bag.
    - N Select lacks `error`/`required`/`name`. N NumberField and CodeField are partial prop picks (no `name`/`form`/`required`/`id`).
    - N `Autocomplete` `...props.inputProps` overrides its own role/aria handlers.
    - N `secure` has `revealLabel`; R/S have no equivalent.
8. Token inconsistency: plain `tokens` is the only token prop, aimed at the component's own recipe. Menus, buttons and the list item have none, and TagsInput's `chip.tokens` is the lone exception.
9. Variants passed down are only `color`/`density` to select and autocomplete menus. SearchView, FileUpload and DateInput pass nothing.
10. RN allocations per render: closure `testId`, new `selection` objects, spread style objects and `inputProps` objects. Because `useComponentSlots` re-splits the selection, this adds work on every render.

## Appendix C: Overlays

Renderers: **R** = React, **S** = Solid, **N** = React Native. Paths are relative to `packages/`.
Everything below was read from source; nothing was run.

### Shared facts (apply to every component below unless a section says otherwise)

- **R/S slot props.** Every R/S ready-made (except Scrim and the snackbar queue host) is typed `Omit<RootProps, keyof SlotKeyedProps<Anatomy> | "children"> & SlotKeyedProps<Anatomy> & XContentProps`.
    - `SlotKeyedProps`: `react/src/parts.tsx:380`, `solid/src/parts.tsx:320`.
    - Shape of each prop:

        | Prop                          | Shape                                                                 |
        | ----------------------------- | --------------------------------------------------------------------- |
        | `className` (R) / `class` (S) | keyed by own parts                                                    |
        | `style`                       | keyed by own parts (R: `CSSProperties`; S: `CSSProperties \| string`) |
        | `slotProps`                   | keyed by own parts (arbitrary part props)                             |
        | `testId`                      | prefix string, or keyed by part                                       |
        | `unstyled`                    | boolean, or keyed by part                                             |

    - A part with no key gets a shared frozen empty object (R `useSlotProps`, `parts.tsx:409`).
    - S uses `createSlotProps` (`solid/src/parts.tsx:402`).
- **Prop name differs by renderer.** R uses `className`; S uses `class`. N has neither.
- **`Anatomy` is the OVERLAY anatomy** (composites.ts), not the plain generated one. That anatomy adds `trigger`, `positioner`, `content` (and `closeTrigger`, `contextTrigger` where applicable) around the plain anatomy's parts. For dialog, fullscreen dialog, the sheets, popover, tooltip, rich tooltip and menu, `content` is the styled surface (`slot: "root"`).
    - `root` is an unstyled wrapper `<div>` (`styled:false`) around the trigger and positioner. So `className={{root}}` hits an element the registry doesn't style.
    - Overlay anatomies: `anatomy/src/composites.ts` lines 182 (menu), 343 (tooltip), 416 (rich tooltip), 509 (popover), 612 (dialog), 1219 (fullscreen dialog), 1322 (bottom sheet), 1415 (side sheet).
- **Variants and tokens (R/S).** `Root` calls `<x>Selection(props)` from `binding-core/src/components/*.ts`.
    - Plain `tokens` always goes to the component's own recipe.
    - No ready-made has any other prefixed token prop.
    - Nested component tokens are never reachable by a dedicated prop. The only route is `slotProps.<part>.tokens` (see the trigger note).
- **Trigger and close buttons are nested ready-mades: `<Trigger as={Button} label={trigger} {...slot("trigger")}/>`.**
    - Fullscreen dialog's `CloseTrigger` is `as={IconButton}` and its `ConfirmAction` is `as={Button} variant="text"`.
    - Side sheet's `BackButton` and `CloseTrigger` are `as={IconButton}`.
    - `slot(part)` returns `PartProps`: a plain `className` string and plain `style` object, plus whatever `slotProps[part]` holds.
    - Button/IconButton's own `className`/`style` are keyed by Button parts and are discarded in `Button ReadyMade` (`react/src/button/button.tsx:151`).
    - So, by code reading (not run), `className` and `style` on `trigger`/`closeTrigger`/`backButton`/`confirmAction` are effectively LOST. A string/CSS object indexed by "root"/"label" finds nothing.
    - What does reach the nested Button: other keys inside `slotProps.<part>`. Example: `slotProps={{trigger:{variant:"outlined", tokens:{...}, slotProps:{label:{...}}}}}`, since `combinePartProps` keeps non-class/style keys.
    - So Button/IconButton variants, tokens and parts are reachable only that way, undocumented and untyped (`PartProps`).
- **Same-named part in two recipes.** `root` appears in the overlay anatomy (unstyled wrapper) and, in R/S, in the nested scrim backdrop. The backdrop's anatomy `dialogBackdropAnatomy` / `bottomSheetBackdropAnatomy` / `sideSheetBackdropAnatomy` is `name:"scrim"`, part `root`, attribute `backdrop`.
    - `dialog-parts.tsx:188-194` maps the user's `testId.backdrop` / `unstyled.backdrop` onto the scrim's `root` via `partAsRoot`.
    - The scrim's selection is `{}`. Scrim tokens and variants are NOT reachable from any ready-made.
- **Backdrop gets no slot props (R/S).** `<Backdrop />` is rendered bare in Dialog, BottomSheet and SideSheet. Only `testId.backdrop` and `unstyled.backdrop` reach it.
    - `className`, `style` and `slotProps` have no `backdrop` key, because `SlotKeyedProps<Anatomy>` is keyed by the overlay anatomy, which has no backdrop.
    - Fullscreen dialog has no backdrop at all.
- **`testId` / `unstyled` types.** The Part union is `PartName<overlayAnatomy> | "backdrop"` for dialog, bottom sheet and side sheet (binding-core `dialog.ts:20`, `sheet.ts:34-40`). It is the overlay anatomy alone for the others.
- **RN (all components).**
    - **API shape.** One ready-made per dir, `withEngine(Impl)`. A bare function sits above it for the surface-or-modal split (dialogs, sheets, popover, tooltip, menu).
    - **Props taken.** Only `testId?: TestIdOverride<Part>` (prefix string or keyed by part) plus variants/`tokens` (and `indication` where the recipe has it). There is NO `style`, `className`, `slotProps` or `unstyled` anywhere.
    - **Part names.** `Part = PartName<plainAnatomy>` (e.g. `dialogAnatomy`, `bottomSheetAnatomy`), NOT the overlay anatomy.
        - So RN has no `trigger`, `positioner`, `content` or `backdrop` test-id keys. Exception: menu's `contextTrigger` (see Menu).
        - In RN `root` is the styled surface. In web the surface is `content`; web `root` is the wrapper. Same key, different element.
        - Default test ids differ: web `pf-dialog-content` vs RN `pf-dialog-root` for the same surface.
    - **Styling plumbing.**
        - `useComponentSlots<Part>(name, selection)` returns `{styles: s (MotionStyles), selected, views: v}` (`react-native/src/styles.ts:169`).
        - Parts render as `<v.part.View|Text style={s.part} testID={id("part")}>` (View/Text are the engine's or RN's own).
        - `testIdOf(anatomy, part, props.testId)` is called via a per-render `id` closure.
    - **Style types.** `s.*` is `MotionStyles` (not typed as `ViewStyle`/`TextStyle`). It is spread into the style object (`{...s.root, ...presence.style}`) and cast to `ViewStyle` / `TextStyle` only in single-part components.
    - **Per-render allocations.** A new style object per render for the root view (e.g. `dialog.tsx:~113`). Closures `id`, `given` (trigger props) and `onKeyDown` are rebuilt each render. The selection object is rebuilt each render, e.g. `dialogSelection({...props, icon})`, except Menu, which uses `useStableSelection`. Details are in the per-component sections.
    - **Trigger.** A string/node `trigger` becomes `<Button label={trigger} {...given}/>`, with no way to style or token it. A function `trigger` lets the app render its own.
    - **Portal infra.** `portal.tsx`, `portal-host.tsx`, `overlay.tsx` (Anchored, useDismiss, placeOverlay), `modal.tsx` (ModalWindow, ModalScrimLayer, useModalOverlay) and `tooltip-overlay.tsx` (TooltipHost) have no parts, test ids, styling or ready-made of their own.
        - The modal scrim in RN is `<Scrim open/>` from `single-part.tsx`, rendered with no `testId`. It always has the default `pf-scrim-root`, and the dialog's `testId` can't name or prefix it.

---

### Dialog

1. **Props**
    - Shapes by renderer:

        | Prop                  | R                                            | S                                            | N                         |
        | --------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------- |
        | `className` / `class` | keyed by own parts                           | keyed by own parts                           | absent                    |
        | `style`               | keyed by own parts                           | keyed by own parts                           | absent                    |
        | `slotProps`           | keyed by own parts                           | keyed by own parts                           | absent                    |
        | `unstyled`            | keyed by own parts, or boolean (+`backdrop`) | keyed by own parts, or boolean (+`backdrop`) | absent                    |
        | `testId`              | prefix or keyed (+`backdrop`)                | prefix or keyed (+`backdrop`)                | prefix or keyed (5 parts) |

    - R/S: `react/src/dialog/dialog.tsx:132-142`, `solid/src/dialog/dialog.tsx`.
    - N: `react-native/src/dialog/dialog.tsx:79-122`.
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, icon, headline, body, actions, closeTrigger.
    - Reachable via slot props: root, trigger, positioner, content, icon, headline, body, actions.
    - NOT reachable through className/style/slotProps: backdrop. It is reachable only via `testId` and `unstyled`.
    - `closeTrigger` is in the anatomy but is not rendered by the ready-made (compose with `Dialog.CloseTrigger`).
    - N parts (`dialogAnatomy`): root, icon, headline, body, actions. All have a testId.
3. **Nested**
    - R/S: `Button` as trigger (`Trigger as={Button} label={trigger}`, `dialog.tsx:167`). It is reachable only via `slotProps.trigger.*`, with className/style lost (see Shared facts).
    - R/S: the scrim is the backdrop, not reachable except testId/unstyled.
    - N: `Button` for a string trigger (`:~152`). No customization. The `trigger` function form gives a custom trigger. The scrim is `ModalScrimLayer`, with no props.
4. **Tokens**
    - `tokens` goes to the `dialog` recipe in all three renderers (`dialogSelection`, binding-core `dialog.ts:158`).
    - No prefixed token props, and no nested tokens. Scrim and Button tokens are unreachable.
5. **Variants down**
    - `icon`: R/S set it automatically from `isPresent(icon)` (`dialog.tsx:163`) and drop the user's `icon` variant. N does the same in `dialogSelection({...props, icon: isPresent(props.icon)})`.
    - Nothing passed to children as defaults.
6. **Inconsistencies**
    - The web body is the `body` prop. N's body is `children`; N has no `body` prop.
    - N is surface-or-modal depending on `trigger`/`onOpenChange`/`defaultOpen`. Web is always modal-capable via Root.
    - N `actions` can be a function `({close})`. R/S take a node only.
    - Part sets differ (see Shared): web `content` is the surface, N `root` is the surface.
    - N has no `closeTrigger` key.
    - N takes `trigger` as a function, R/S as a node only.
    - Web `testId`/`unstyled` accept `backdrop`. N has no equivalent.
    - N uses `{...s.root, ...presence.style}` allocated each render; the `Root = props.open === undefined ? v.root : engine` choice is made per render.

### Fullscreen dialog

1. **Props**
    - R `className`/`style`/`slotProps`: keyed by own (overlay) parts.
    - S `class`/`style`/`slotProps`: keyed by own (overlay) parts.
    - R/S `unstyled`, `testId`: keyed or plain.
    - N: `testId` only (6 parts: root, header, closeTrigger, headline, confirmAction, body).
    - Refs: `react/src/fullscreen-dialog/fullscreen-dialog.tsx:84-94`, `solid/src/fullscreen-dialog/fullscreen-dialog.tsx`, `react-native/src/fullscreen-dialog/fullscreen-dialog.tsx:59-90`.
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, header, closeTrigger, headline, confirmAction, body.
    - All reachable in R/S via slot props. There is NO backdrop.
    - N lacks `trigger`/`positioner`/`content` keys, and `root` is the surface.
3. **Nested**
    - R/S: `Button` trigger, `IconButton` as `CloseTrigger` (`as={IconButton}`, props `aria-label`, `icon`), `Button variant="text"` as `ConfirmAction`. All are reachable only via `slotProps.<part>.*`, with className/style lost.
    - N: `Button` trigger. `IconButton` is rendered inside `v.closeTrigger.View`, so the `closeTrigger` testId lands on the wrapper, and the IconButton keeps its default testId. `confirmAction` is a node or a function, rendered inside its own `v.confirmAction.View`.
4. **Tokens**
    - `tokens` goes to the `fullscreenDialog` recipe (`fullscreenDialogSelection`, `fullscreen-dialog.ts:82`: `{tokens}` only).
    - No nested tokens.
5. **Variants down**: none.
6. **Inconsistencies**
    - Web content prop is `body`; N's is `children`. N's `closeIcon` default is the string `"✕"` (a `CloseIcon` glyph on web).
    - N's `confirmAction` can be a function `({close})`.
    - N has a fallback `<View style={{flexGrow:1}}/>` spacer when there is no headline. The web renders nothing.
    - N body: a string renders as `v.body.Text`, anything else as `v.body.View` wrapping a `ScrollView`. Web is always a `div`.
    - A new style object per render (`style={{...s.root, ...presence.style}}`).

### Bottom sheet

1. **Props**
    - R `className`/`style`/`slotProps`, S `class`/`style`/`slotProps`: keyed by own (overlay) parts (`bottom-sheet.tsx:~236`).
    - R/S `unstyled` and `testId`: plain or keyed, and may name `backdrop`.
    - N: `testId` only (`bottom-sheet.tsx:110`).
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, dragHandle, body. Reachable: all six.
    - Backdrop is not reachable except via testId/unstyled.
    - N parts (`bottomSheetAnatomy`): root, dragHandle, content.
3. **Nested**
    - R/S: `Button` trigger (`as={Button}`). `DragHandle` is rendered as a part of this recipe (not a nested ready-made) in R/S.
    - N: `DragHandle` ready-made is nested inside `v.dragHandle.View` (`:364`). Its testId, style and slots are not reachable. `Button` is the trigger.
4. **Tokens**
    - `tokens` goes to the `bottomSheet` recipe (`bottomSheetSelection`, `sheet.ts:386`).
    - No other token props.
5. **Variants down (and selection)**
    - `modal` (default true) and `dragHandle` (default true) go into the selection.
    - `modal` gates the backdrop and the click-outside behaviour.
    - `dragHandle === false` skips the drag handle.
    - R/S pass `dragHandle` to Root explicitly (`bottom-sheet.tsx:269`).
6. **Inconsistencies**
    - **Part-name collision.** Web `content` is the sheet surface and `body` is the content area. N `root` is the surface and `content` is the content area (anatomy `bottomSheetAnatomy`). The same key `content` means different elements.
    - N accepts both `children` and `body`, and `children` wins. Web only has `body`.
    - N has an extra standard (`modal={false}`) mode via `StandardBottomSheet`, plus drag/spring handling.
    - Per-render allocations in N: `placement(s.root ?? {})` returns two new objects each render. Style arrays `[placed, {transform: [{translateY: drag}]}]` and `{...own, ...presence.style}` are also per render.
    - `onLayout` is also reallocated each render.

### Side sheet

1. **Props**
    - R `className`/`style`/`slotProps`, S `class`/`style`/`slotProps`: keyed by own (overlay) parts.
    - R/S `unstyled` and `testId`: plain or keyed (+`backdrop`).
    - N: `testId` only (`side-sheet.tsx:61`).
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, header, backButton, headline, closeTrigger, body, actions. R/S reach all ten via slot props. Backdrop is testId/unstyled only.
    - N parts: root, header, backButton, headline, closeTrigger, content, actions.
3. **Nested**
    - R/S: `Button` trigger, `IconButton` for both `BackButton` and `CloseTrigger`, each reachable only via `slotProps.<part>.*`.
    - N: `Button` trigger, `IconButton` back and close inside `v.backButton.View` and `v.closeTrigger.View`. The testId lands on the wrapper.
4. **Tokens**: `tokens` goes to the `sideSheet` recipe (`sideSheetSelection`, `sheet.ts:395`). No nested tokens.
5. **Variants down**
    - `modal` and `coplanar` go into the selection. `coplanar` is forced false on modal sheets.
    - R/S Root forwards `modal` to the backdrop's visibility.
6. **Inconsistencies**
    - Same web `content`/`body` vs N `root`/`content` split as the bottom sheet.
    - N has `children` (no `body`). Web has `body`.
    - N has an extra `StandardSideSheet` mode.
    - `onBack` renders the back button on both.
    - N `closeIcon` has its own default.
    - Per-render style object allocations.

### Popover

1. **Props**
    - R `className`/`style`/`slotProps`, S `class`/`style`/`slotProps`: keyed by own (overlay) parts.
    - R/S `testId`/`unstyled`: from `PopoverRootOwnProps`, plain or keyed (type `TestIdOverride<PopoverPart>`).
    - N: `testId` only (`popover.tsx`, `TestIdOverride<Part>`).
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, caret, title, body, actions, closeTrigger.
    - R/S reach root, trigger, positioner, content, title, body, actions, caret. `closeTrigger` is NOT rendered by the ready-made (compose it with `Popover.CloseTrigger`).
    - N parts (`popoverAnatomy`): root, caret, title, body, actions. N renders root, title, body and actions. It has NO caret and no `caret` prop, although `caret` is in the anatomy.
3. **Nested**
    - R/S: `Button` trigger (via slotProps only).
    - N: `Button` trigger (`label`, `onPress`, `interactionSource`, aria attrs).
4. **Tokens**: `tokens` goes to the `popover` recipe (`popoverSelection`, `popover.ts:117`). No nested tokens.
5. **Variants down**: none.
6. **Inconsistencies**
    - N lacks `caret`, `modal`, `autoFocus`, `closeOnEscape`, `restoreFocus` and the focus elements. It takes `closeOnInteractOutside`, `positioning`, `open`, `defaultOpen`, `onOpenChange`, `aria-label`.
    - N's `actions` can be a function `({close})`.
    - N's trigger function also receives `{open}`.
    - Part keys: web `content` is the surface, N `root` is the surface.
    - N wraps the surface in a separate `engine.View` with a per-render style `{pointerEvents, transformOrigin, ...presence.style}`.

### Rich tooltip

1. **Props**
    - R/S slot-keyed props keyed by own (overlay) parts. `testId`/`unstyled` plain or keyed.
    - N: `testId` only (`rich-tooltip.tsx`, `TestIdOverride<Part>`).
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, caret, subhead, supportingText, actions.
    - R/S reach all eight, and the ready-made renders all of them.
    - N parts (`richTooltipAnatomy`): root, caret, subhead, supportingText, actions. N renders root, subhead, supportingText and actions. No caret.
3. **Nested**
    - R/S: `Button` trigger.
    - N: `TooltipHost` renders a `Button` for a non-function trigger, with `interactionSource` and `onLongPress`, and nothing else. Actions are a plain node inside `v.actions.View`.
4. **Tokens**: `tokens` goes to the `richTooltip` recipe (`richTooltipSelection`). No nested tokens (including for buttons passed in `actions`).
5. **Variants down**: none (the rich tooltip is interactive by default via `interactiveByDefault`).
6. **Inconsistencies**
    - N has no `caret`.
    - N's behaviour props are defined in `tooltip-overlay.tsx` `TooltipBehaviorProps`.
    - Web `testId` keys include `trigger`/`positioner`/`content`; N's do not. N's `root` is the surface and web's `content` is.

### Tooltip

1. **Props**
    - R/S: as for rich tooltip (slot-keyed by overlay parts, `testId`/`unstyled`).
    - N: `testId` only.
2. **Own parts**
    - Overlay anatomy: root, trigger, positioner, content, caret, supportingText. R/S reach all of them, and the ready-made renders all of them.
    - N parts (`tooltipAnatomy`): root, caret, supportingText. N has no caret.
3. **Nested**: `Button` trigger in all three, reachable only via slotProps in R/S.
4. **Tokens**: `tokens` goes to the `tooltip` recipe (`tooltipSelection`). Nothing else.
5. **Variants down**: none.
6. **Inconsistencies**
    - N has no `caret`.
    - R/S `supportingText` is always rendered, since the ready-made has no `isPresent` guard (`tooltip.tsx`).
    - N: same string-trigger `Button` with no styling hook.
    - The trigger's `onLongPress` is wired in N. Web uses `useTooltipLongPress` (`long-press.ts`).
    - N's overlay rebuilds a `given` object, an inline surface style and render callbacks each render.

### Scrim

1. **Props**
    - R: `ScrimProps` = element props (`className` and `style` as plain values, not keyed) + `tokens`, `testId`, `unstyled`, `as`. S: same with `class`/`style` plain.
    - Single-part: `createSinglePart` (`react/src/scrim/scrim.tsx:22`).
    - N: `ScrimProps` has `tokens`, `open`, `testId` only (`react-native/src/single-part.tsx:281`).
2. **Own parts**: just `root`, which is the whole component.
3. **Nested**: none.
4. **Tokens**: `tokens` goes to the `scrim` recipe (`scrimSelection`). Nothing else.
5. **Variants down**: none.
6. **Inconsistencies**
    - R/S scrim is a stand-alone component with plain `className`/`style`; N's has neither.
    - N's `open` animates in and out. R/S are static and `Scrim` is `aria-hidden`.
    - Dialog, bottom sheet and side sheet draw the backdrop with the scrim but give no access to its tokens or class/style (R/S) or testId (N).

### Snackbar

1. **Props**
    - R/S: slot-keyed props keyed by own parts. `testId`/`unstyled` plain or keyed.
    - N: `testId` only.
    - Refs: `react/src/snackbar/snackbar.tsx:~165`, `react-native/src/snackbar/snackbar.tsx:31-48`.
2. **Own parts**
    - Anatomy: root, supportingText, actions, action, close.
    - R/S: all reachable via slot props. The `actions` wrapper is rendered only when there is an `action` or a `closeLabel`.
    - N: all five reachable via `testId` only.
3. **Nested**
    - R/S: none. `Action` and `Close` are own parts rendered via `useMachineButton`.
    - N: `SurfaceButton` (own part) renders `action` and `close`, with `testId` and `selection` from the snackbar. Its tokens are the snackbar's.
4. **Tokens**: `tokens` goes to the `snackbar` recipe (`snackbarSelection`, `snackbar.ts:118`, which also takes `layout`). Nothing else.
5. **Variants down**: `layout` goes into the selection.
6. **Inconsistencies**
    - **N always renders the close button** (`closeLabel ?? "Dismiss"`, default glyph `"×"`, `:~121`). Web renders it only when `closeLabel` is given, with `CloseIcon` as the default icon.
    - N's `onClose` and `onAction` callbacks. Web: `onOpenChange` with a reason, and `onAction` on Root. R/S Root also take `duration`, `ids`, `id`, `onExitComplete`.
    - N's `open`/`defaultOpen` are optional, and `open === undefined` means always shown.
    - **Queue.**
        - R/S: `createSnackbarQueue()` + `<SnackbarHost queue offset/>`. The host spreads `item.options` into `<Snackbar>` and overrides `style` with `{root:{pointerEvents:"auto"}}`, built each render (`queue.tsx`). `className`, `style`, `slotProps`, `unstyled`, `layout`, `tokens` and `testId` are all in the options type, except className/style/slotProps/unstyled, which are not.
        - N: `useSnackbar().show(opts)` with `SnackbarOptions.offset: number`.
        - Queue options are `SnackbarQueueOptions` (variants, `IndicationProps`, content, `duration`, `onAction`, `onOpenChange`, `testId`). No className, style, slotProps or unstyled. An `onOpenChange` in the options is overwritten by the host's own handler in R (`queue.tsx`: `onOpenChange={...}` after the spread). Not verified for S.

### Toast

1. **Props**
    - R/S: `Toaster`/`Toast` (`Toaster` is the ready-made; `Toast = Object.assign(Toaster, {Group, Root, ...})`). Slot-keyed props keyed by anatomy parts (`SlotKeyedProps<typeof toastAnatomy>`). Also `toaster` (the store), `label`, `closeLabel`, `tokens`, `indication`, `testId`, `unstyled` (`ToasterOwnProps`).
    - N: `ToasterProps` = `toaster`, `closeLabel`, `tokens`, `indication`, `testId`. No class/style/slotProps/unstyled, and no `label`.
    - N exports only `createToaster` and `Toaster` (`toast/index.ts`). No `Toast` namespace.
2. **Own parts**
    - Anatomy: group, root, icon, title, description, actionTrigger, closeTrigger.
    - **Two roots.** `group` is the anatomy root (the region). `root` is each toast. Both are reachable.
    - R/S reach all seven through `slot(part)`. `slot("root")` is applied identically to every toast; per-toast class/style is not possible.
    - N: `testIdOf(toastAnatomy, "group", props.testId)` and the rest via `id(part)`. The same testId prefix is applied to EVERY toast (collision), in R/S/N.
3. **Nested**
    - R/S: none. `ActionTrigger` and `CloseTrigger` are own parts via `useMachineButton`, with their own interaction source.
    - N: `SurfaceButton` for both, with the toaster's `testId` and `selection` (`toastSelection(type, toaster)`).
4. **Tokens**: `tokens` goes to the `toast` recipe via `toastSelection(type, props)` (`toast.ts:98`). It is shared by group and toasts. Nothing else.
5. **Variants down**
    - `type` comes from each toast's data (`item.type`, falling back to `info`).
    - It is passed to every part's selection through `toastSelection(api.type, group.props)` (R/S Root).
6. **Inconsistencies**
    - N has no `label` prop; the group's `aria-label` is hardcoded to `"Notifications"`. R/S take `label` and pass it to `api.getGroupProps`.
    - N has no `closeIcon`: it uses the literal `"×"`. Glyphs come from the `TOAST_GLYPHS` text; R/S use `ToastIcon`/`CloseIcon` components.
    - N has its own swipe and hold-timeout implementation (`useToastSwipe`, `useHeldTimeout`). R/S use Zag's toast machine plus `toastSwipeToDismiss`.
    - N: group style is an allocation per render (`style={{...s.group, position:"absolute", ...}}`). `ToastItem` creates its own style objects per render.
    - N's `ToastItem` runs `useComponentSlots` once per toast, and each toast re-calls `toastSelection`.

### Menu

1. **Props**
    - R `className`/`style`/`slotProps`, S `class`/`style`/`slotProps`: keyed by own (overlay) parts. They apply to all menu levels: root, submenu positioner/content, and every item.
    - `testId`/`unstyled`: plain or keyed.
    - N: `testId` only (`menu.tsx:145`).
2. **Own parts**
    - Overlay anatomy: root, trigger, contextTrigger, positioner, content, itemGroup, itemGroupLabel, item, itemLeading, itemContent, itemLabel, itemSupportingText, itemTrailing, itemTrailingText.
    - R/S reach all 14 via `slot(part)` (`menu.tsx:773-835`, ItemEntry at `:520-595`).
    - **No per-item customization.** One `className.item` applies to all items, in every submenu level. `MenuItem` has no class/style/slotProps.
    - N parts (`menuAnatomy`): root, itemGroup, itemGroupLabel, item, itemLeading, itemContent, itemLabel, itemSupportingText, itemTrailing, itemTrailingText.
    - N has no trigger/positioner/content testIds. Special case: `ContextTrigger` takes its testId through `testIdOf(menuOverlayAnatomy, "contextTrigger", props.testId as …)` (`menu.tsx:~1260`). The cast means the type does not allow `{contextTrigger}` but the runtime does.
3. **Nested**
    - R/S: `Button` trigger, reachable only via `slotProps.trigger.*`. Submenus are `Menu.Submenu` roots rendered inside `ItemEntry`; they share the ready-made's `slot` function, so slot props apply to submenu parts too.
    - N: `Button` trigger (label form). Submenus are rendered inside the menu.
4. **Tokens**
    - `tokens` goes to the `menu` recipe (`menuSelection`: color, density, vibrant, grouped, tokens; `menu.ts:329`).
    - Submenus inherit `color`, `density`, `vibrant` and `tokens` from the parent (`menu.tsx:189-200`). They are not grouped.
    - No nested tokens.
5. **Variants down**
    - `color`, `density`, `vibrant`, `tokens` go from a menu to its submenus (R/S, and N via one shared selection).
    - `grouped` is computed as `menuGrouped(props)` (true if there are groups) and forced false in a drilled submenu.
6. **Inconsistencies**
    - **R/S submenus don't inherit `testId` or `unstyled`.** `<Submenu>` is rendered with no props, so `useComponent` there gets `testId: undefined`/`unstyled: undefined` (`menu.tsx:193-203`, `ItemEntry` at `:527`). Submenu parts get default test ids and the registry's styles, even when the root menu has `testId`/`unstyled`.
    - N-only props: `value` (the selected item, for listbox-like use) and `closeOnSelect`. Web adds `typeahead`, `loopFocus` and others via `MenuBehaviorProps`; N takes a subset.
    - N has per-item allocation control (`useStableSelection`, `ItemProps` documented as stable); web does not memoize.
    - Per-item data: web `MenuItem` has the same shape for R/S/N, so there is nothing per-item in any renderer.

---

### Not applicable / no ready-made

- **R/S**
    - `dialog-parts.tsx` and `solid/src/dialog-parts.tsx`: the shared overlay Root/Backdrop/Positioner/Content factory. It has no ready-made.
    - `overlay.ts`, `popover` Positioner, `tooltip/long-press.ts`.
    - `snackbar/queue.tsx` has a host (`SnackbarHost`) but no parts.
    - R/S have no portal or modal modules at all; every overlay renders in place.
- **N**
    - `portal.tsx`, `portal-host.tsx`, `overlay.tsx` (Anchored, useDismiss), `modal.tsx` (ModalWindow, ModalScrimLayer, useModalOverlay), `tooltip-overlay.tsx` (TooltipHost). All are plumbing with no parts or testIds.
    - `modal.tsx` draws the Scrim with no `testId`.

### Gaps (this group)

1. N has no `className`/`style`/`slotProps`/`unstyled` on any overlay, only `testId` keyed by the plain anatomy. Slot-level styling and `unstyled` are impossible in N.
2. R/S `className`/`style` on `trigger`/`closeTrigger`/`backButton`/`confirmAction` are dropped by the nested `Button`/`IconButton` (they expect keyed values). Only undocumented `slotProps.<part>.<buttonProp>` reaches them. No typed, documented route to nested Button/IconButton parts or tokens.
3. The backdrop has no slot-prop route in R/S, only `testId.backdrop` and `unstyled.backdrop`. Scrim tokens are unreachable from Dialog/BottomSheet/SideSheet in R/S. In N the scrim has no testId at all.
4. Part-name mismatch across renderers: web `content` = surface, N `root` = surface. For bottom and side sheets web `body` = content area while N `content` = content area. The same `testId` key therefore addresses different elements, and default ids differ (`pf-dialog-content` vs `pf-dialog-root`).
5. N lacks `caret` (popover, tooltip, rich tooltip) although the anatomies declare it. N also lacks several web behaviour props (popover `modal`, `autoFocus`, `closeOnEscape`).
6. Content-prop naming: web uses `body`; N uses `children` for dialog, fullscreen dialog and side sheet (both for bottom sheet). N `actions`/`confirmAction` can be functions `({close})`; web only takes nodes.
7. Menu submenus ignore the parent's `testId`/`unstyled` in R/S, and slot props apply to every item at every level. There is no per-item or per-submenu styling.
8. Toast `testId` prefix is applied identically to every toast. R/S `slot("root")` styles every toast identically. N has no `label` or `closeIcon`.
9. Snackbar N always renders the close button (web only when `closeLabel`). The R host overwrites the `style` and `onOpenChange` of `item.options`.
10. RN per-render allocations: root style objects (`{...s.root, ...presence.style}`) everywhere; `id` closures; `given` trigger props; selection objects (except Menu); bottom sheet `placement()` objects and style arrays; toast group/item style objects.
11. Tokens: plain `tokens` always goes to the component's own recipe. There is no prefixed or nested-token prop on any component in this group (consistent here). The only route for nested Button/IconButton tokens is the undocumented `slotProps.trigger.tokens` (R/S). None in N.

## Appendix D: Lists, selection, navigation, data

Legend: R = react, S = solid, N = react-native. "plain" = one value for the root element. "keyed own" = `SlotKeyed<OwnPart, …>`. "keyed child" = keyed by a child component's parts.

Conventions verified in the code:

- `SlotKeyedProps<A>` (react/src/parts.tsx:380, solid/src/parts.tsx:320) gives `className` (S: `class`), `style`, `slotProps`, `testId`, `unstyled`.
- `className`, `style` and `slotProps` are keyed only, by the component's own anatomy. There is no plain form on a ready-made that uses `SlotKeyedProps`. Plain `className`/`style` exist only where the ready-made is Root's `PartProps`, which is the case for List, SelectionList and RadioGroup.
- `testId` and `unstyled` are `TestIdOverride<Part>` / `Unstyled<Part>`: a string/boolean for all parts, or keyed. They are handed to Root's scope.
- S differs from R in two ways. It uses `class`, and `style` is `CSSProperties | string`. Otherwise its slot-part sets match R. I diffed the `slot(...)`/`slots(...)` names per component and they were identical, except that S table also uses `tableRowPart`.
- N has NO `className`, `slotProps` or `unstyled` anywhere in this group.
- N `style` exists only on Checkbox, Switch, Radio and RadioGroup, as `RootStyleProps` (`StyleProp<ViewStyle>`, react-native/src/styles.ts:230), applied by `withUserStyle`.
- N takes `testId` only as a `TestIdOverride`, through `testIdOf(anatomy, part, testId)` (react-native/src/parts.tsx:47).
- N repeated parts (item, tile, cell, step) all get the same test id, with no index. This matches the web.
- N per-render allocations: `style={{ ...s.x, ...unselectable }}` on every Pressable root or trigger. `withUserStyle` always builds a new object. Further cases are listed per component.

---

### list

- **Props**
    - R `ListProps` (react/src/list/list.tsx):
        - `className` / `style`: plain, on the `<ul>` (via `PartProps`).
        - `slotProps`: keyed child (`ListItemPart` → `ListItemPartProps`).
        - `unstyled`: keyed child (`Unstyled<ListItemPart>`).
        - `testId`: keyed own (`TestIdOverride<ListPart>`, i.e. `root` and `item`).
    - S: same, with `class`.
    - N `ListProps`: `testId` only (`testIdOf(listAnatomy, …)`), plus `aria-label`. No style, class, slotProps or unstyled.
- **Own parts** (`root`, `item`)
    - R/S: `root` is reachable through plain `className`/`style`/element props. `item` (the `<li>`) is NOT reachable from `<List>` ready-made: `List.Item` is wrapped without props, and `slotProps` goes to ListItem parts. `testId` reaches both.
    - N: both parts only through `testId`.
- **Nested**
    - ListItem per entry.
    - R/S: `slotProps` and `unstyled` are spread onto every ListItem AFTER the item's data (list.tsx ReadyMade). A list-level value therefore overrides an item's own `slotProps`/`unstyled`.
    - Per-item `testId` comes from `ListItemData.testId`.
    - ListItem `className`/`style` are NOT reachable (keyed `slotProps.<part>.className` only).
    - N: no way to reach ListItem parts, except item-data `testId`.
- **Tokens**
    - `tokens` go to the list items (the `listItem` recipe, as defaults merged per item by `listItemVariants`).
    - `listTokens` go to the list recipe (`listSelection`, binding-core list.ts:98).
    - `variant` ("standard" | "segmented") selects the list recipe.
    - Nested-component tokens: only through `tokens`.
- **Variants down**
    - `density`, `color`, `leadingType` and `tokens` go to items via the `ListDefaults` context.
    - `variant === "segmented"` makes the ready-made compute each item's `position`.
- **Inconsistencies**
    - S `List` ready-made keeps keyed rows and memoizes entries. No API difference.
    - R puts `slotProps`/`unstyled` after the item's props and N's `position` is `item.position ?? …`. In R the item's `position` comes after the computed one, so the item wins in both.
    - N has no part customization beyond `testId`.
    - Same-named part: the `list` recipe's `item` is the `<li>` wrapper. The listItem recipe has no `item`.

### list-item

- **Props** (`ListItemProps`: R react/src/list-item/list-item.tsx:386, S :420)
    - R/S: `className`/`style`/`slotProps` keyed own (`ListItemPart`).
    - R/S: `testId` and `unstyled` keyed own (`ListItemPart`), on Root.
    - N `ListItemProps` (react-native/src/list-item/list-item.tsx:45): `testId` keyed own only. No style, class, slotProps or unstyled.
- **Own parts** (`root`, `leading`, `content`, `overline`, `headline`, `supportingText`, `trailing`, `trailingText`, `indicator`, `region`, `frame`, `action`)
    - R/S `slot("…")` reaches all of them for className, style and slotProps. `frame`/`action` only when `swipeAction` is given, and `region`/`indicator` only when `region` is given.
    - R/S **gap:** keyed `unstyled` does not reach `frame`, `action` or `region` from the ready-made.
        - Root's scope gets `unstyled`. The Frame and Expandable scopes are built with `testId` only (R :289-291, :346-356).
        - `Region`/`Frame`/`Action` take only a per-part boolean `unstyled`. It is reachable only as `slotProps.<part>.unstyled`, which is not typed on `SlotKeyedProps`.
        - `testId` is forwarded to Frame and Expandable.
    - N: all parts via `testId` only. The N parts are root/Pressable, content, leading, trailing, overline, headline, supportingText, trailingText, region, frame, action, indicator.
- **Nested**
    - none (leading/trailing are content nodes).
    - `indication` is a Root-only prop (`indication`, `interactionSource`) in R/S/N.
- **Tokens**
    - `tokens` go to the `listItem` recipe, merged over list defaults (`listItemVariants`).
    - With a swipe the Root scope's tokens get `...swipeTokens` merged (R :166, N list-item.tsx ~:155).
    - Frame scope tokens are only the swipe's tokens (R :352). The item's own `tokens` are not on the frame scope.
- **Variants**
    - Receives list defaults `density`, `color`, `leadingType` and `tokens` through `ListDefaults` (R :98, S :112, N :67).
    - `lines` is derived from content (`listItemLines`) unless given.
- **Inconsistencies**
    - N has no `className`, `style`, `slotProps` or `unstyled`, and no way to reach most parts except `testId`.
    - N adds `onPress` and `role="option"`. R/S use `href`/`as`.
    - N per-render allocations: `style={{ ...s.root, ...unselectable }}` (×2 for Pressable vs View).

### selection-list

- **Props**
    - R `SelectionListProps` (react/src/selection-list/selection-list.tsx:37):
        - `className`/`style`: plain on the `<ul>` list element.
        - `slotProps`: keyed child (`ListItemPart`).
        - `unstyled`: keyed child (`ListItemPart`).
        - `testId`: keyed own `ListPart` (`root`, `item`).
    - S: the same, with `class`.
    - N `SelectionListProps`: `testId` only, plus `aria-label`.
- **Own parts**: same as List. `item` is the `<li role=presentation>`, not reachable except through `testId`.
- **Nested**
    - ListItem per option.
    - R/S: `slotProps`/`unstyled` spread on each ListItem. Item-level `testId` comes from `SelectionListItem`.
    - N: not reachable.
    - R renders `List.Root`/`List.Item` directly. Its remaining props (`variant`, `listTokens`, `testId`, …) pass through.
- **Tokens**
    - `tokens` go to the items (via `ListDefaults`). `listTokens` go to the list.
- **Variants**
    - Same as List. Down to items: `density`, `color`, `tokens` and `leadingType`.
- **Inconsistencies**
    - **R/S SelectionList never sets `position` on its ListItems.** A `variant="segmented"` list therefore does not round its tiles' corners. N does (`listItemPosition(...)`, selection-list.tsx), and so does `List` R/S.
    - N has no `loopFocus` or keyboard highlight behavior.
    - N `role="listbox"`; options are `ListItem role="option"`.
    - N passes `onPress={() => press(key)}` per render (new closure per item).

### radio-group (RadioGroup + Radio)

- **Props**
    - R `RadioGroupProps` (react/src/radio-group/radio-group.tsx:272):
        - `className`/`style`: plain on the group element.
        - `slotProps`: keyed child (`RadioPart` → `RadioGroupPartProps`, which has `unstyled?`).
        - `unstyled`: keyed child (`RadioPart`).
        - `testId`: keyed own `RadioGroupPart` (only `root`).
    - S: the same, with `class`.
    - N `RadioGroupProps` (react-native/src/radio-group/radio-group.tsx): `style` (`StyleProp<ViewStyle>`, group View). NO `testId` (fixed `compositeTestIds.radioGroup.root`), no slotProps, no unstyled.
    - N `RadioProps`: `style` (ViewStyle on the radio root via `withUserStyle`) and `testId` keyed own `RadioPart`.
- **Own parts**
    - Group: only `root`, reachable by plain `className`/`style`/element props. In R/S it uses `useUnstyledComponent` (no recipe, no tokens).
    - Radios (`root`, `touchTarget`, `input`, `ring`, `dot`): via keyed `slotProps` for all radios at once.
    - The `slotProps` lookup is a direct `slotProps?.[part] ?? {}`, not `useSlotProps`. `className` and `style` are NOT keyed here, so radio parts get no className/style except through `slotProps.<part>.className`.
    - Same-named `root`: `slotProps.root` targets the radio `<label>`, not the group element.
    - Per-item `testId` comes from `RadioGroupItem.testId`.
    - N: `testId` and `style` on the radio root only. No `input` part in N.
- **Nested**: Radio per item.
    - In R/S the item's `unstyled` is the group-level `unstyled`. Its props come from `slotProps`.
- **Tokens**
    - `tokens`, `color` and `density` on the group go to the radios (`radioSelection` merges the group's tokens with each radio's).
    - There is no group recipe, so no token prop for the group itself.
    - N: the same. `useStableSelection` keeps the group's variants stable.
- **Variants**: `color`, `density`, `tokens` down to radios as defaults. A radio's own props win.
- **Inconsistencies**
    - N has `style` on the group and radio, R/S have `className`/`style` plain only on the group element.
    - N has no `testId` on the group.
    - N `RadioGroup` takes `children` (`Radio`s) or `items`. R/S ready-made takes `items` only (children go through `RadioGroup.Root`).
    - N `Radio` is `memo(withEngine(...))`; `RadioGroup` is neither.
    - N per-render allocations: `withUserStyle({...s.root, ...unselectable}, style)` and the `items.map` creating props each render.

### checkbox

- **Props**
    - R `CheckboxProps` (react/src/checkbox/checkbox.tsx:213): `className`/`style`/`slotProps` keyed own, `testId` keyed own, `unstyled` keyed own.
    - S: the same, with `class`.
    - N `CheckboxProps` (react-native/src/checkbox/checkbox.tsx): `style` (ViewStyle, root only), `testId` keyed own. No className, slotProps or unstyled.
- **Own parts** (`root`, `touchTarget`, `input`, `box`, `checkIcon`, `indeterminateIcon`)
    - R/S: all reachable through keyed props.
    - N: `testId` reaches all. `style` reaches `root` only. N has no `input` part (the Pressable is the control).
    - `aria-label`, `aria-labelledby` and `aria-describedby` go to `input` in R/S, and to the root in N (`aria-label` only).
- **Nested**: none.
- **Tokens**: `tokens` go to the `checkbox` recipe (`checkboxSelection`).
- **Variants**: `color`, `density`.
- **Inconsistencies**
    - N `style` is a plain `ViewStyle` on the root. R/S keep root style under `style.root`.
    - N `aria-label` only.
    - R/S ready-made is also used by Table's selection cell, with only `aria-label`, `checked` and `onCheckedChange` (see table).

### switch

- **Props**
    - R `SwitchProps` (react/src/switch/switch.tsx:216): `className`/`style`/`slotProps` keyed own, `testId` keyed own, `unstyled` keyed own.
    - S: the same, with `class`.
    - N `SwitchProps`: `style` (ViewStyle on root), `testId` keyed own.
- **Own parts** (`root`, `touchTarget`, `input`, `track`, `stateLayer`, `handle`, `icon`)
    - R/S: all reachable. N: `testId` for all except `input` (there is no `input` part). `style` reaches `root` only.
- **Nested**: none.
- **Tokens**: `tokens` go to the `switchControl` recipe. The `icons` variant selects when the handle's icon shows.
- **Variants**: `color`, `icons`.
- **Inconsistencies**
    - Icon prop: R/S take `icon` (`SwitchContentProps`) and render the `icon` part only when given.
    - N takes `checkedIcon`, defaulting to `"✓"` (react-native/src/switch/switch.tsx:36,112).
    - Recipe name `switchControl` vs component name `Switch`.

### slider

- **Props**
    - R `SliderProps` (react/src/slider/slider.tsx:342): `className`/`style`/`slotProps` keyed own, `testId` keyed own, `unstyled` keyed own.
    - S: the same, with `class`.
    - N `SliderProps` (react-native/src/slider/slider.tsx:44): `testId` keyed own only. NO `style`, className, slotProps or unstyled.
- **Own parts**
    - R/S reach all 11 (`root`, `startTrack`, `track`, `activeTrack`, `markerGroup`, `marker`, `stateLayer`, `insetIcon`, `handle`, `valueIndicator`, `input`).
    - `slot("handle")`, `slot("stateLayer")`, `slot("valueIndicator")`, `slot("input")` apply to EVERY thumb of a range, and `slot("marker")` to every stop. Individual thumbs are not addressable.
    - `insetIcon` renders only when the `insetIcon` prop is given.
    - N: all parts via `testId`. There is no `input` part in N.
- **Nested**: none.
- **Tokens**
    - `tokens` go to the `slider` recipe.
    - Root tokens are computed from the value (`sliderTrackTokens`) and `...props.tokens` is merged on top (binding-core slider.ts:297-311).
    - Thumb and marker tokens go on parts through `useOwnTokens`, which calls `useClasses("slider", { tokens })` (R :247).
- **Variants**: `color`, `handleShape`, `size`, `orientation`.
- **Inconsistencies**
    - `aria-label`: R/S accept `string | string[]` (one per thumb) plus `aria-labelledby`/`aria-describedby`/`aria-valuetext` (S declares `aria-valuetext` explicitly). N accepts a single string.
    - N has no `style` or `invalid`/`readOnly`/`largeStep`/`stops` parity differences.
    - N per-render allocations: root `{...s.root, ...unselectable}`.

### rating

- **Props**
    - R `RatingProps` (react/src/rating/rating.tsx:194, a type alias): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `RatingProps`: `testId` keyed own only. No style, className, slotProps or unstyled.
- **Own parts** (`root`, `label`, `control`, `item`, `icon`, `fill`, `halfFill`)
    - R/S: all reachable. `slot("item")`, `slot("icon")` and `slot("fill")` apply to EVERY star. `fill` and `halfFill` are present only when the value reaches them.
    - N: via `testId` only.
- **Nested**: none (the `icon` prop is a content node).
- **Tokens**: `tokens` go to the `rating` recipe.
- **Variants**: `color`, `size`.
- **Inconsistencies**
    - The default star differs: R/S `<StarIcon/>` (glyphs), N `<Glyph glyph="★"/>`.
    - N lacks `name`, `form`, `required`. It takes only `value`, `defaultValue`, `onValueChange`, `count`, `allowHalf`, `readOnly`, `disabled`, `valueText`.
    - N per-render allocations: `style={{...s.item, ...unselectable}}` per star and an `onLayout`/`onPress` closure per star.

### stepper

- **Props**
    - R `StepperProps` (react/src/stepper/stepper.tsx:287): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `StepperProps`: `testId` keyed own only. No style, className, slotProps or unstyled.
- **Own parts** (`root`, `list`, `item`, `trigger`, `indicator`, `label`, `caption`, `separator`, `content`)
    - R/S: all reachable.
    - `slot("trigger")`, `slot("item")` and `slot("indicator")` apply to every step.
    - `separator` is omitted after the last step.
    - `slot("content")` is used in the item for a vertical stepper, and after the list for a horizontal one.
    - N: via `testId`. N has no `list` part and no `content` part in the same sense; its `testId` map is applied per step.
- **Nested**: the `transition` prop (`sharedAxis`/`fadeThrough`) wraps content in `HorizontalSharedAxis`/`FadeThrough` (R :395). Their parts are not reachable (`transitionScrim` is a bool only).
- **Tokens**: `tokens` go to the `stepper` recipe.
- **Variants**: `orientation`, `density`.
- **Inconsistencies**
    - N: no keyboard stepping, no next/previous triggers (file header comment).
    - N renders `item`/`trigger` itself, with `s.item`, and takes `StepperItem` per step.
    - N glyphs use `TOAST_GLYPHS` text. R/S use icons.
    - N `selection` is a per-render object passed into every `StepImpl`.
    - R `Root` gets `count={items.length}`.

### splitter

- **Props**
    - R `SplitterProps` (react/src/splitter/splitter.tsx:214): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `SplitterProps` (react-native/src/splitter/splitter.tsx:46): `testId` only. No style, className, slotProps or unstyled.
- **Own parts**
    - Reachable in R/S: `root`, `panel` (every pane), `resizeTrigger` (every divider).
    - **NOT reachable** through className, style or slotProps: `resizeTriggerIndicator`.
        - It is rendered inside `ResizeTrigger` with no user props (R :201, S ~:209).
        - Only the keyed `unstyled`/`testId` on Root reach it.
    - N: all four parts via `testId`. The panel's wrapping `Animated.View` has no part and no testID.
- **Nested**: none.
- **Tokens**: `tokens` go to the `splitter` recipe. There are no nested tokens.
- **Variants**: `orientation`.
- **Inconsistencies**
    - R/S take `resizeLabel`. N does not mention one.
    - N has `anchors` and `keyboardResizeBy` props.
    - N per-render allocations: `{ flexGrow: 1, ...s.root }` (splitter.tsx:326), panel style objects per pane, `{...s.resizeTrigger, ...unselectable}`.

### tabs

- **Props**
    - R `TabsProps` (react/src/tabs/tabs.tsx:287): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - Anatomy is `tabsCompositeAnatomy` (react/src/tabs/tabs.tsx:7). It has parts `root`, `list`, `tab`, `tabContent`, `icon`, `label`, `indicator`, `content`. The `tabsAnatomy` recipe omits `list` and `content`.
    - S: the same, with `class`.
    - N: **no ready-made** (only index.ts).
- **Own parts**
    - R/S: all 8 reachable. `slot("tab")`, `icon`, `label` and `indicator` apply to every tab.
    - `tabContent` is the wrapper inside each tab, reachable through `tabContentProps={slot("tabContent")}`.
    - `content` (the panel) is reachable. In transition mode it goes through `TransitionPanels` with `slot("content")`.
- **Nested**: `FadeThrough`/`HorizontalSharedAxis` for `transition`: not reachable (`transitionScrim` is a bool).
- **Tokens**: `tokens` go to the `tabs` recipe. There are no nested tokens.
- **Variants**
    - `variant`, `icon`, `inlineIcon`, `scrollable`, `color`.
    - `icon` defaults to `tabsHaveIcons(items)` (R :306).
- **Inconsistencies**: none within R/S. N: not applicable.
- **Note**: `tabs` recipe vs `tabsComposite` anatomy: the part sets differ.

### navigation-bar

- **Props**
    - R `NavigationBarProps = NavigationProps<"navigationBar">` (react/src/navigation.tsx, built by `createNavigation`): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N: **no ready-made**.
- **Own parts** (`root`, `item`, `indicator`, `activeIndicator`, `icon`, `label`)
    - R/S: all reachable. `item`, `indicator`, `activeIndicator`, `icon` and `label` apply to every destination.
    - `icon` renders only when the item has one.
- **Nested**: none.
- **Tokens**: `tokens` go to the `navigationBar` recipe (`navigationSelection`, binding-core navigation.ts:170).
- **Variants**: `color`, `itemLayout`.
- **Inconsistencies**: none between R/S (the shared `createNavigation`). N: not applicable.

### navigation-rail

- **Props**
    - R `NavigationRailProps = NavigationProps<"navigationRail">`: `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N: **no ready-made**.
- **Own parts** (`root`, `item`, `indicator`, `activeIndicator`, `icon`, `label`, `header`, `sectionLabel`)
    - R/S: all reachable. `header` renders only when `header` content is given. `sectionLabel` renders per section (items with `section`).
- **Nested**
    - A modal rail (`modal`) renders a scrim (`scrimAnatomy`) and a dialog (R navigation.tsx:117-164).
    - The scrim gets only `testId`: when the rail's `testId` is a string it becomes `{ root: `${testId}-scrim` }`. If it is keyed, the scrim gets none.
    - className, style, slotProps and unstyled are NOT forwarded to the scrim, and the dialog `<div>` positioner/content have no props.
    - The `header` is a content node, so the app's own components keep their own props.
- **Tokens**: `tokens` go to the `navigationRail` recipe. The scrim has no token prop.
- **Variants**: `color`, `itemLayout`, `expanded` (defaults to `modal`), `modal`.
- **Inconsistencies**: none between R/S. Same-named part: the scrim's `root` vs the rail's `root`. N: not applicable.

### accordion

- **Props**
    - R `AccordionProps` (react/src/accordion/accordion.tsx:219): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `AccordionProps` (react-native/src/accordion/accordion.tsx): `testId` keyed own only, no style/className/slotProps/unstyled.
- **Own parts** (`root`, `item`, `trigger`, `leading`, `text`, `title`, `description`, `indicator`, `content`)
    - R/S: all reachable. `item`, `trigger`, `leading`, `text`, `title`, `description`, `indicator` and `content` apply to every item. `leading` and `description` render only when given.
    - N: via `testId`.
- **Nested**: none.
- **Tokens**: `tokens` go to the `accordion` recipe.
- **Variants**: `density`.
- **Inconsistencies**
    - N hardcodes the indicator glyph as `"⌄"` (R/S have a real Indicator part).
    - N `Item` gets `selection={props}` (the whole props object).
    - N has no Zag machine. It keeps `value` as React state.
    - N per-render allocations: `{...s.trigger, ...unselectable}` per item, `toggle` closures.

### tree

- **Props**
    - R `TreeProps` (react/src/tree/tree.tsx:296): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `TreeProps` (react-native/src/tree/tree.tsx:42): `testId` keyed own only. N also has `translations`.
- **Own parts** (`root`, `label`, `tree`, `branch`, `node`, `leading`, `text`, `indicator`, `group`)
    - R/S: all reachable. `slot("node")` is used for BOTH leaf `Item`s and branch `BranchControl`s (R :343, :358), so leaf and branch rows cannot be told apart.
    - `label` renders only when `label` is given.
    - N: via `testId`.
- **Nested**: none.
- **Tokens**: `tokens` go to the `tree` recipe.
- **Variants**: `density`, `color`.
- **Inconsistencies**
    - N `items` is required; R/S are optional.
    - N has `translations`. R/S do not.
    - N: `style={{ ...s.node, ...unselectable }}` per row.

### table

- **Props**
    - R `TableProps<Row>` (react/src/table/table.tsx:299): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `TableProps` (react-native/src/table/table.tsx:42): `Omit<TableRootOwnProps, "unstyled" | "rowValues">`, so it has `testId` (and `striped`, selection props). No style/className/slotProps/unstyled.
- **Own parts** (15)
    - R/S reachable: `root`, `header`, `body`, `footer`, `headerRow`, `row`, `alternateRow`, `headerCell`, `cell`, `footerCell`, `footerRow`, `selectionCell`, `sortHeader`.
    - R/S **not** reachable (rendered inside `SortHeader` with no user props, R :275-283): `sortLabel`, `sortIndicator`. They are reachable only through Root's `unstyled`/`testId`.
    - Striped tables: `slot(tableRowPart(index, striped))` (R :382) applies `slotProps.row` only to odd-position rows. Alternate rows get `slotProps.alternateRow` only.
    - `selectionCell` is shared by the header and the body rows.
    - N: all parts via `testId`, including `sortLabel` and `sortIndicator`.
- **Nested**
    - `Checkbox` in `SelectionCell` (R :228, :235): gets only `aria-label`, `checked` and `onCheckedChange`.
    - Not reachable: Checkbox `tokens`, `slotProps`, `className`, `testId`. The same applies in S. N also uses Checkbox (table.tsx ~:171, ~:289).
    - `ArrowUpwardIcon` for the sort indicator: not reachable.
- **Tokens**: `tokens` go to the `dataTable` recipe. There are no nested tokens.
- **Variants**: `stickyHeader` (not on N), `density`, `striped` (a Root prop, not a variant).
- **Inconsistencies**
    - N's `testId` reaches `sortLabel`/`sortIndicator` and R/S's slot props do not.
    - N has no `unstyled`.
    - `stickyHeader` is "not on React Native" (binding-core table.ts:34).
    - Recipe name `dataTable` vs component `Table`.

### paginator

- **Props**
    - R `PaginatorProps` (react/src/paginator/paginator.tsx:225): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `PaginatorProps` (react-native/src/paginator/paginator.tsx): `Omit<PaginatorRootOwnProps, "id"|"unstyled">`, so `testId` (and the behavior props, translations, `density`, `tokens`), plus `aria-label`. No style/className/slotProps/unstyled.
- **Own parts** (`root`, `pageSize`, `pageSizeLabel`, `pageSizeSelect`, `rangeLabel`, `actions`, `firstTrigger`, `prevTrigger`, `nextTrigger`, `lastTrigger`)
    - R/S: all reachable.
    - `firstTrigger`/`lastTrigger` only when `showFirstLastButtons`.
    - `pageSize*` omitted when `hidePageSize`.
    - The triggers are `as={IconButton}` (R :266-272). Their `slotProps`/`className`/`style` therefore go to the IconButton as ordinary props. IconButton's own parts are not reachable by key.
    - N: parts via `testId`. In N each trigger is a View part (`Slot.View style={s[part]}`) that WRAPS an `IconButton` (paginator.tsx ~:102-106), whereas in R/S the trigger part is the IconButton.
- **Nested**
    - `Select` (variant `outlined`, `density={root.density}`, `aria-label`, `items`, `value`, `disabled`) in `pageSizeSelect`. Nothing else is reachable (no `selectSlotProps`, tokens or menu). The same goes for S/N.
    - `IconButton` ×2-4: reachable only through the per-trigger plain props on R/S. N: none.
    - N applies the recipe's provided tokens to the nested Select and the actions with `<ProvidedTokens tokens={providedTokensFromPaths(selected.providedTokens[...])}>` (paginator.tsx:134, :171).
    - Web uses the same provided tokens as inherited CSS custom properties.
- **Tokens**
    - `tokens` go to the `paginator` recipe.
    - The recipe's provided tokens flow to the nested Select and IconButtons. There is no direct token prop for them.
- **Variants**: `density` (also passed to the nested `Select`).
- **Inconsistencies**
    - Trigger structure (IconButton as the part vs wrapper View).
    - N per-render allocations: `providedTokensFromPaths(...)` builds a new object each render when the tokens are non-empty (so `ProvidedTokens` context consumers re-render). Also `paginatorSizeItems(...)` and the `onValueChange` closures.

### carousel

- **Props**
    - R `CarouselProps` (react/src/carousel/carousel.tsx:275): `className`/`style`/`slotProps` keyed own, `testId` and `unstyled` keyed own.
    - S: the same, with `class`.
    - N `CarouselProps` (react-native/src/carousel/carousel.tsx:41): `testId` keyed own only. No style/className/slotProps/unstyled.
- **Own parts** (`root`, `itemGroup`, `item`, `mask`, `content`)
    - R/S: all reachable. `item`, `mask` and `content` apply to every entry.
    - Per-item data: `aspectRatio`, `aria-label`, `disabled`, `interactionSource`.
    - N: all via `testId`.
- **Nested**: none (item `content` is a node).
- **Tokens**: `tokens` go to the `carousel` recipe.
- **Variants**: `layout`.
- **Inconsistencies**
    - N has `itemWidth` as a prop. R/S take it through Root's behavior props (`itemWidth` on `CarouselBehaviorProps`).
    - N adds `onItemPress`.
    - N lacks `allowMouseDrag`.
    - N per-render allocations: `style={{ ...s.item, width: size.slot }}` per item, the mask's inline style, `rowStyle`.

### grid-list

- **No ready-made in any renderer.** `GridList` is `Root` plus parts (`Object.assign(Root, { Root, Tile, Content, Media, Header, Footer, Headline, Subhead })`, react/src/grid-list/grid-list.tsx:118, N grid-list.tsx:~150).
- **Props**
    - R/S: Root takes `PartProps` (className/class, style, element props), `as`, `testId` (keyed own), `unstyled` (keyed own), and the variants. Each part takes its own `PartProps` (R/S `Tile`/`Media` also take `as` and `unstyled`). There is no `slotProps`.
    - N: `GridListRootProps` has `testId`, `aria-label` and variants. `GridListPartProps` is only `children`. `Media` takes `source` and `alt`. No style, className or unstyled.
- **Own parts** (`root`, `tile`, `content`, `media`, `header`, `footer`, `headline`, `subhead`)
    - R/S: each reachable through its own component's props.
    - N: `testId` only. In N the root `testId` is stored in context and every part reads it.
- **Nested**: none.
- **Tokens**: `tokens` go to the `gridList` recipe. `columns`, `gutter` and `aspect` are variants (and also tokens).
- **Variants**: `columns`, `gutter`, `aspect`. They are Root props and nothing is passed to the parts.
- **Inconsistencies**
    - N `Media` destructures `objectFit` out of the recipe style on every render: `{ objectFit, ...style } = styles.media` (grid-list.tsx:131).
    - R/S `Root` skips the `role="list"` when `as` is `ul`/`ol`. N always sets `role="list"`.

---

### Gaps (group D)

1. **N has no part styling API at all**, except `style` on Checkbox/Switch/Radio/RadioGroup. Every other N component here (List, ListItem, SelectionList, Slider, Rating, Stepper, Splitter, Accordion, Tree, Table, Paginator, Carousel, GridList) takes only `testId`. No `style`, `className`, `slotProps` or `unstyled`.
2. **N `style` is root-only and a plain `ViewStyle`** (`RootStyleProps`), while R/S `style` is keyed by part. The shapes are incompatible, and N `RadioGroup` has no `testId`.
3. **Child-keyed props.** List, SelectionList and RadioGroup key `slotProps`/`unstyled` by the CHILD's parts (ListItemPart, RadioPart). Their own `item`/`root` parts are reachable only through plain `className`/`style` or `testId`. R/S List's `<li>` has no styling path.
4. **`unstyled`/`slotProps` not forwarded** to nested scopes:
    - R/S ListItem `frame`/`action`/`region` (Expandable and Frame scopes get only `testId`).
    - Navigation rail scrim and dialog (only a `testId` prefix, and only for string `testId`).
    - Tabs/Stepper transition wrappers (`transition`, `transitionScrim`).
5. **Unreachable own parts in R/S**: splitter `resizeTriggerIndicator`; table `sortLabel`, `sortIndicator` (but reachable by `testId` in N); table SelectionCell `Checkbox`; paginator `Select`, `IconButton`s; tree `node` is shared by leaf and branch rows; list `item`.
6. **No per-instance addressing**: slot props on repeated parts (slider handles/markers, rating stars, stepper steps, tabs, tiles/cells) apply to all instances. Striped table rows split only `row`/`alternateRow`.
7. **Inconsistent token props**: `tokens` means "the items'" on List/SelectionList (with `listTokens` for the list), "the radios'" on RadioGroup (no group recipe), and "the component's" elsewhere. Nested components (Select, IconButton, Checkbox) have no token props. Only provided tokens (the recipe's) reach paginator's Select and IconButtons.
8. **Renderer drift**
    - Switch: R/S `icon` (optional) vs N `checkedIcon` (default "✓").
    - Rating: star glyph differs.
    - Slider `aria-label`: R/S per-thumb array, N string.
    - R/S SelectionList sets no `position` for `variant="segmented"`, N does.
    - Paginator trigger structure differs.
    - N has no `input` part for checkbox/radio/switch/slider.
    - Accordion indicator: N hardcoded `⌄`.
    - Tree: N `translations`, `items` required.
    - Splitter: N `anchors`/`keyboardResizeBy` and `resizeLabel` differences.
    - N has no Tabs, NavigationBar or NavigationRail.
9. **Typing gap**: ListItem `slotProps.<part>.unstyled` works at runtime (parts take `unstyled`), but the ListItem ready-made types it as plain `PartProps`. The List/SelectionList/RadioGroup types do include `unstyled`.
10. **N per-render allocations**: `{...s.x, ...unselectable}` styles per Pressable (every N component here), `withUserStyle` copies, `providedTokensFromPaths` in paginator, `{flexGrow:1,...s.root}` in splitter, and `item.map` closures. None of these are memoized.

## Appendix E: Pickers, progress, motion, mechanics

Paths are relative to `packages/`. R = react, S = solid, N = react-native. All read from source; items marked (unverified) were not run.

Scope: date-picker, docked-date-picker, time-picker, color-picker, calendar-parts/calendar, circular-progress, linear-progress, loading-indicator, progress.tsx, fade-through, horizontal-shared-axis, ripple, page-transition, single-part, expand, engines, internal, and the rest of src not in groups A-D.

### Mechanics

#### React/Solid ready-made slot props

- `SlotKeyedProps<A>` (R `react/src/parts.tsx:380`, S `solid/src/parts.tsx:320`) has these shapes:
    - className (R) / class (S): keyed by own part, value `ClassValue`.
    - style: keyed by own part. R `CSSProperties`; S `CSSProperties | string`.
    - slotProps: keyed by own part, value `PartProps`.
    - testId: `TestIdOverride<Part>`, either a string prefix or an object by part.
    - unstyled: `boolean | {part: boolean}`.
- Renderer difference: **R prop is `className`, S prop is `class`**. S `style` may also be a string.
- A part's props are `slotProps[part]` combined with `{className|class, style}[part]` (`slotPartProps`, R:390, S:331).
- `testId` and `unstyled` go whole to Root (`useComponent` options), not per part.
- R `useSlotProps` (R:409) is memoized on `[slotProps, className, style]`. It returns a frozen shared `NO_PROPS` for parts that no key names.
- S `createSlotProps` (S:~345) builds plain objects once if the props are static literals. Otherwise it returns a live `Proxy` per part (`SlotView`) over one memo.
- Slot-keyed props only reach the parts the ready-made forwards `slot("x")` to. Parts not forwarded are unreachable except by composing the parts under `.Root`.
- Merge order inside a part (`partSources`, `binding-core/src/parts.ts:155`):
    1. machine props
    2. `data-scope`, `data-pf-part`, `data-testid`
    3. state attributes
    4. registry class and token style (skipped if unstyled)
    5. provider `slotProps`
    6. user props

#### Provider-level slotProps

- Type: `ProviderSlotProps<P>` = `{ [ComponentName]?: { [SlotOf<N>]?: P } }` (`binding-core/src/provider.ts:33`). It is keyed **component → slot → part props**.
- Lookup is `slotProps?.[anatomy.name]?.[slot]` where `slot = partSlot(spec) = spec.slot ?? part.name` (`attributes.ts:95`, `binding-core/src/parts.ts:158-172`).
- A part with `slot: null` gets no provider props. A part may map to a different slot name.
    - Modal date picker (`composites.ts:734`): `root` has `slot: null`, so provider `datePicker.root` does not reach it. `content` has `slot: "root"`, so provider `datePicker.root` is applied to **content**.
    - The picker's backdrop uses a separate anatomy named `scrim`, so provider `slotProps.scrim.root` applies.
    - Calendar cell is its own component, `calendarCell.{root,trigger}`.
- Merging: `mergeSlotProps(base, own, merge)` (`provider.ts:194`) merges per component then per slot, nested providers over outer.
- In a part, provider props sit below the user's props (user wins).
- R passes `state.slotProps` in `useComponent` (`R parts.tsx:361`). S reads `state().slotProps` (`S parts.tsx:163`).
- **RN has no provider `slotProps`.** `react-native/src/provider.tsx` has `defaults`, `overrides` and `engine`, and no `slotProps` (grep).
- Provider `defaults[component]` is `Selection` defaults (variants and tokens). RN applies it in `useStyles` and `useComponentSlots` via `withDefaults`.

#### RN mechanics (`react-native/src/styles.ts`, `parts.tsx`)

- **`useComponentSlots(name, selection, state?, velocities?)`** (styles.ts:~170) works like this:
    1. Reads `provider = usePureform()` and `factory = useEntryFactory(name)`. A lazy registry entry suspends via `use()`.
    2. `withDefaults(provider.defaults[name], selection)`.
    3. `splitSelection` splits the result into `variants` and `tokens`, mapping token names through `factory.tokens[token] ?? token` to theme keys.
    4. `provider.engine.useStyles(name, variants, state, tokens, keyed)` returns `MotionStyles`, the per-slot styles from the engine, including animated values.
    5. `useComponentState(...)` returns `selected` (drawings, icon fills, rest styles).
    6. Returns `{ styles, selected, views }`.
- `views` is a per-slot `{View, Text, TextInput, Pressable}` map. It is a `Proxy` cached in a `WeakMap<engine, WeakMap<factory, …>>` (`viewsOf`).
    - Slots in `factory.moving` get the engine's animated views. Others get plain RN views (`STILL`; Pressable is wrapped by `pressNow`).
    - It is chosen per component, not per state.
- Per-render allocations in `useComponentSlots`:
    - `withDefaults` result and `splitSelection` (variants object, keyed token object) are new each render.
    - `Object.fromEntries` runs when `velocities` is passed.
    - Callers also build selection objects each render (`xSelection(props)` or `{...props, …}`).
    - Only `viewsOf` is cached. Whether the engine and `useStyles` dedupe by value is outside this audit.
    - `useStyles` (plain, `styles.ts:~72`) builds `{reducedMotion, rtl?, ...selected}` per call. Its doc says "same selection returns the same frozen object", so the factory caches by value.
- **No user-style merge for parts.** The only user style hook is `RootStyleProps { style?: StyleProp<ViewStyle> }` (styles.ts:230) with `withUserStyle(root, style) = style ? {...root, ...StyleSheet.flatten(style)} : root` (styles.ts:235).
    - It allocates a new object per render and **flattens**, so user keys override engine-supplied values on the root. If `s.root` holds animated values, the user key replaces them.
    - It is used only by the group A/D components (button, chip, checkbox, switch, fab, icon-button, radio-group, badge via single-part). **None of the group E components use it.**
    - Other places with `StyleProp` or `style` props: `FadeThrough.style` (array style, not flattened), `single-part.tsx:69` `Text` (`StyleProp<TextStyle>`), `modal.tsx:119` `positionerStyle` (internal).
- Types in RN: root style is `StyleProp<ViewStyle>`. Per-part styles are not typed for users because they do not exist. Internal part styles are cast `s.page as StyleProp<ViewStyle>`.
- Per-render style allocations inside components (not user-facing):
    - `{ ...s.viewTrigger, ...unselectable }` (date-picker:~112, docked:94, color-picker:193 etc.)
    - `inFlowInline(s.root ?? {})` (time-picker:207)
    - `slots={{ styles: s, views: v, id }}` (date-picker:~134)
    - inline `<View style={{flexDirection…}}>` (docked:128, 137)
    - closure `id = (part) => …` per render
- **`testIdOf(anatomy, part, testId)`** (`parts.tsx:~35`) = `partTestId` (`anatomy/src/attributes.ts:29`):
    - string `testId` gives `` `${testId}-${part.attribute}` `` (note: `attribute`, not part name; they can differ, e.g. backdrop's attribute is `backdrop`).
    - object `testId` gives `testId[part] ?? default` (`pf-<component>-<part>`).
    - It throws for an unknown part.
    - RN has `partId` (`text-input.tsx:239`) as the same function with a loose part type for the field family.
    - **`testId` is the only per-part RN prop.** No `slotProps`, `className` or `unstyled` exists on RN components. `unstyled` is omitted: DatePicker and DockedDatePicker explicitly `Omit<…, "unstyled">`, and no RN Props include it.
- RN components are wrapped `withEngine(Impl, name)` (`parts.tsx`), which adds `key = engine.name` to restart state on engine change. Exceptions in this group:
    - `DatePicker` and `DockedDatePicker` are plain functions. Only the inner Surface/Popup is engine-keyed, and DockedDatePicker's Popup is not wrapped.
    - `FadeThrough` is a plain function with no `withEngine`.
    - `Expanding` is a plain function.

### Non-component files

Not applicable (no per-part props):

- React: `parts.tsx`, `props.ts`, `part-context.ts`, `controllable.ts`, `machine.ts`, `motion.ts`, `presence.ts`, `pressable.ts`, `interaction.ts`, `indication.tsx`, `classes.ts`, `env.ts`, `form.ts`, `glyphs.tsx`, `icon-style.ts`, `provider.tsx`, `provided-tokens.tsx`, `navigation.tsx`, `time.tsx`, `text-input.tsx`, `dialog-parts.tsx`, `select-field-parts.tsx`, `error-supporting-text.tsx`, `index.ts`, `__fixtures__/`, `testing/`, `storybook/`.
- `picker-actions.tsx`: `PickerActionProps` for CancelTrigger/ConfirmTrigger, a part helper only.
- `calendar-parts.tsx` is a part helper, not a ready-made. It is covered under "calendarCell" below.
- `single-part.tsx` (R/S) is a factory (`createSinglePart`) for group A components. `ownProps` stay off the element. The only per-part prop is Root's `testId`/`unstyled` (`R single-part.tsx:46`). Nothing here is keyed.
- `page-transition.tsx` (R/S) and `page-transition.ts` (N) are the shared page-state hook `useTransitionPages`.
- Solid: same set, plus `internal/zag` (vendored machine glue).
- RN: `styles.ts`, `parts.tsx`, `engine.ts`, `engines/*`, `env.ts`, `interaction.ts`, `layer.ts`, `indication*.ts(x)`, `icon-style.tsx`, `check-keys.ts`, `modal.tsx`, `overlay.tsx`, `portal*.tsx`, `presence.ts`, `provider.tsx`, `provided-tokens.tsx`, `navigation.tsx`, `time.tsx`, `text-input.tsx`, `surface-button.tsx`, `tab-indicator.ts`, `touch-slop.ts`, `sideways-pan.ts`, `tooltip-overlay.tsx`, `testing/`, `storybook/`, `index.ts`.
- `expand.tsx` (N only): `Expanding` takes `{open, children}` only. No style, no testId, no tokens. It has no R/S counterpart in these dirs (web uses CSS transitions). Not a ready-made; used by accordion, tree and others.
- `engines/` (`reanimated*.ts`, `svg.ts`): motion engines with no component props.

### Components

#### DatePicker (modal) — `date-picker/`

R `date-picker.tsx:337`, S `date-picker.tsx:357`, N `date-picker.tsx:48`. Ready-made is `Object.assign(ReadyMade, {Root, …})` in R/S, a plain function in N.

- **Props taken**

| prop              | R                                                   | S                                | N                                                                                                                   |
| ----------------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| className / class | keyed by own parts                                  | `class`, keyed by own parts      | absent                                                                                                              |
| style             | keyed, `CSSProperties`                              | keyed, `CSSProperties` or string | absent                                                                                                              |
| slotProps         | keyed by own parts                                  | keyed by own parts               | absent                                                                                                              |
| unstyled          | `boolean` or by part                                | `boolean` or by part             | absent (explicit `Omit`, N:48)                                                                                      |
| testId            | prefix or by part, `TestIdOverride<DatePickerPart>` | same                             | same (prefix or by part). The trigger Button's id is hard-coded `pf-date-picker-trigger` (N:~232), not overridable. |

- **Own parts**
    - Web anatomy `datePickerOverlayAnatomy` (composites.ts:734): root, trigger, positioner, content, header, headline, selectedDate, modeToggle, divider, controls, viewTrigger, prev, next, weekdays, weekday, grid, week, yearList, actions.
    - The N anatomy is the generated `datePickerAnatomy` (generated.ts:2091). It lacks trigger, positioner and content.
    - R reachable: root, trigger (only when `trigger` given), positioner, content, header, headline, selectedDate, modeToggle (only with `onModeToggle`), divider, controls, viewTrigger, prev, next, weekdays, grid, yearList, actions.
    - R not reachable: weekday, week (default Grid/Weekdays children). Cell is not in this anatomy. Also not reachable: Backdrop (`<Backdrop />` gets no slot props and its anatomy is `scrim`), and CancelTrigger/ConfirmTrigger (no `slot()` forwarded).
    - S reachable: root, trigger, positioner, content, header, headline, selectedDate, modeToggle, divider, controls, viewTrigger, prev, next, yearList, actions.
    - **S not reachable: `weekdays`, `grid`, `weekday`, `week`.** `calendar.DayCalendar()` takes no props (`S calendar-parts.tsx:313`), whereas R forwards `slot("weekdays")` and `slot("grid")` (R:~418).
    - N: `testId` only, all parts including weekday/week (duplicate id per element, e.g. `id("weekday")` repeated).
- **Nested components (ready-made form)**
    - `Trigger as={Button}`, `ModeToggle as={IconButton}`, `Prev/Next as={IconButton}`, `Cancel/ConfirmTrigger as={Button}`.
    - Reachability: `slot("trigger")` etc. spread onto the `as` component. There are no dedicated props (no `buttonProps` / `iconButtonProps`).
    - **Possible issue (unverified at runtime):** R `scope.render` passes the merged `className` (a plain string) as a prop to the `as` component. R's Button/IconButton ready-made `className` is _keyed by part_, and `useSlotProps` skips non-object keyed values (`parts.tsx:418`). So per-part `className` and `style` for trigger, modeToggle, prev and next may be dropped when `as` is a ready-made. `slotProps` entries with plain keys pass through, but `slotProps` on these `as` targets is keyed too.
    - Cancel/ConfirmTrigger `Button`s get only `variant="text"` and `label`.
    - Calendar Cell (a separate `calendarCell` component) is not reachable (see calendarCell).
    - N: `IconButton` (mode toggle, prev, next) and `Button` (trigger, cancel, OK) are fixed. Each IconButton sits inside a `v.<part>.View` wrapper that gets `s.<part>` style. The inner button is not reachable, and the trigger Button gets only `testId={{root: …}}`.
- **Tokens**
    - Plain `tokens` go to the `datePicker` recipe (`datePickerSelection = {tokens}`, binding-core `date-picker.ts:458`), in R/S/N.
    - No prefixed token props. Nested Button/IconButton/Cell tokens are not reachable in R/S/N.
- **Variants passed down**: none. `datePicker` has no variants, and Button gets `variant="text"` in R/S/N.
- **Inconsistencies**
    - `className` vs `class` and string `style`.
    - S misses `weekdays`/`grid` slots. R has them.
    - R ready-made reads `open`/`closeOnEscape` etc. as Root props. N takes them via `DatePickerRootOwnProps` minus `restoreFocus`.
    - N has no slotProps/className/style/unstyled.
    - N part set lacks trigger/positioner/content.
    - N does not render `modeToggle` as a part when no `onModeToggle`. All three agree on that.
    - N `view` is only `day | year`.
- **Notable**: two parts named "trigger" exist in the web picker (datePicker `trigger` and `calendarCell.trigger`). Two roots exist (datePicker root, scrim root). Provider `datePicker.root` applies to _content_ (slot remap), while `root` has `slot: null`. N allocs per render: `{...s.viewTrigger, ...unselectable}`, `slots={{...}}`, `cells.map(...)`.

#### DockedDatePicker — `docked-date-picker/`

R:334, S:351, N:45 (`DockedDatePickerProps`).

- **Props taken**
    - R/S: same as DatePicker (keyed className|class, style, slotProps; unstyled by part; testId prefix or by part). `aria-label`/`aria-labelledby`/`aria-describedby` go to the input. `leadingIcon`, `prefixText`, `suffixText` are content props.
    - N: `testId` only (`DockedDatePickerRootOwnProps` minus unstyled, leadingIcon, prefixText, suffixText, plus `DockedDatePickerContentProps`). The calendar trigger id is hard-coded `pf-docked-date-picker-trigger` (N:295).
- **Own parts (anatomy `dockedDatePickerOverlayAnatomy`, composites.ts:964)**
    - Parts: root, container, leadingIcon, prefixText, input, suffixText, label, trailingIcon, supportingText, positioner, content, controls, prev, monthButton, next, yearButton, weekdays, weekday, grid, week, monthList, yearList, actions.
    - R reachable: root, container, leadingIcon (if given), prefixText (if given), input, suffixText (if given), label (if given), trailingIcon, supportingText, positioner, content, controls, prev, monthButton, next, yearButton, weekdays, grid, monthList, yearList.
    - S reachable: same except `weekdays` and `grid`, which are not forwarded (`DayCalendar`). Also `label` is always rendered in S. R renders it only when `label` is present (R:~407, S ready-made).
    - **Never reachable in R/S/N: `actions`.** The part is in the anatomy and the Root, but no ready-made renders `Actions`. Also unreachable: `weekday`, `week`, and Cell.
    - **Shared keys:** `prev` and `next` each style _two_ buttons (month and year) with the same slot (R:354,372; S:424-441).
    - N: all through `testId`. N has no `positioner` or `trigger` parts (generated anatomy). The `prev`/`next` testId is given only to the first pair (`withId`).
- **Nested components**
    - `Prev/Next as={IconButton}` (`icon`, `unit`, `mirror`), reachable by `slot("prev")` etc. The same `className`-to-keyed-ready-made concern as DatePicker applies (unverified).
    - N: `Field` (the shared text-field engine, `text-input.tsx`) renders container/input/label etc. Docked `testId` goes through the `testId` function. `IconButton` in `v.prev.View` wrappers, a raw `Pressable` for the calendar trigger, and an `engine.View` popup. Field `inputProps` is hard-coded (`onBlur`, `onSubmitEditing`, `placeholder`, `inputMode`), with no user `inputProps` escape.
    - The calendar-cell `Cell`s are not reachable.
- **Tokens**
    - Plain `tokens` go to the `dockedDatePicker` recipe (`dockedDatePickerSelection`: variant, color, density, leadingIcon, prefixText, suffixText, tokens; binding-core `date-picker.ts:528`).
    - No prefixed token props in any renderer. Nested IconButton tokens are not reachable.
- **Variants down**: none to children. `variant/color/density` apply to the docked recipe only. In N they also go to `Field` via `selection`.
- **Inconsistencies**
    - The `className`/`class`/string-style split.
    - Missing S slots `weekdays` and `grid`.
    - Controls order differs. R renders prev/month/next/prev/year/next with both steps shown in all views. S renders prev, month, next, prev(year), year, next(year) and wraps prev/next in `view === "day"`, hiding them in the month and year views.
    - S always renders Label. R renders it only when `label` is present.
    - N `trailingIcon="📅"` is hard-coded. R/S use `CalendarIcon` (R) or the `TrailingIcon` part (S).
- **Notable**: N per-render allocs `{...s[part], ...unselectable}`, inline `View` styles, `slots = {…}`, `dockedDatePickerSelection({...props,…})` twice. N has `error` content prop (R/S: not verified).

#### TimePicker — `time-picker/`

R:~275 `TimePickerProps`, S:256, N:56.

- **Props taken**
    - R/S: keyed className|class, style, slotProps; unstyled by part; testId prefix or by part (`TimePickerRootOwnProps`, binding-core `time-picker.ts:83`).
    - N: `testId?: TestIdOverride<TimePickerPart>` only (N:68). Note N also exposes `indication`.
- **Own parts**: root, headline, body, hourSelector, separator, minuteSelector, scrollItem, periodSelector, period, dial, dialTrack, dialHandle, dialCenter, dialLabel, actions.
    - R/S reachable: root, headline, body, hourSelector, separator, minuteSelector, periodSelector (12-hour), period (shared by both am and pm), dial (dial mode), actions (only when `actions` given).
    - **R/S not reachable: scrollItem, dialTrack, dialHandle, dialCenter, dialLabel.** They are in the anatomy and render inside HourSelector, MinuteSelector and Dial. Only the Dial wrapper is keyed.
    - N: every part has a test id, including scrollItem and dial parts. The `dialLabel` id is passed down as `testId`.
- **Nested components**: none as ready-made components. N uses an internal `TimeButton` (`time.tsx`) with `anatomy`, `component="timePicker"`, `testId`.
- **Tokens**: plain `tokens` go to the `timePicker` recipe. `timePickerSelection = {mode, color, tokens}` (`time-picker.ts:172`). No prefixed props, no nested.
- **Variants down**: `mode` (dial/input) and `color` apply to the recipe only. N passes `selection` to `TimeButton`. R/S use `mode` only to pick the Dial.
- **Inconsistencies**: className/class and string-style differences only. N has no keyed props. N root style uses `inFlowInline(s.root ?? {})`, an alloc per render. `timeInput` is group B.

#### ColorPicker — `color-picker/`

R:~383 `ColorPickerProps`, S:442, N:47.

- **Props taken**
    - R/S: keyed className|class, style, slotProps; unstyled by part; testId prefix or by part.
    - N: `testId?: TestIdOverride<Part>` (N:63) only.
- **Own parts (anatomy `colorPickerAnatomy`, generated.ts:4930)**: root, label, content, area, areaBackground, areaThumb, channelSlider, transparencyGrid, channelSliderTrack, channelSliderThumb, control, valueSwatch, swatchGroup, swatchTrigger, swatch.
    - R/S reachable: root, label (when `label` given), content, area, channelSlider (shared by hue and alpha), control, valueSwatch, swatchGroup, swatchTrigger (each swatch).
    - **R/S not reachable: areaBackground, areaThumb, transparencyGrid, channelSliderTrack, channelSliderThumb, swatch.** They render inside Area, ChannelSlider and SwatchTrigger.
    - N: all by `testId` (swatchTrigger/swatch ids repeat per swatch).
- **Nested components (ready-made)**
    - `HexField` renders `TextField` (R:295). `HexField label=…` is the only prop forwarded by the ready-made (`inputLabel`). No slot props or tokens for it, so the TextField's parts and tokens are not reachable from ColorPicker props.
    - `EyeDropperTrigger` renders `IconButton`, forwarding only `aria-label` (`eyeDropperLabel`). It is not reachable otherwise. Rendered only where the browser supports `EyeDropper`.
    - N: `TextField` (outlined, `inputProps` fixed) and `IconButton` are fixed the same way.
    - Composed form takes `ColorPickerHexFieldProps = Omit<TextFieldProps, value|defaultValue|onValueChange>` and `ColorPickerEyeDropperTriggerProps = Omit<IconButtonProps, …>`, so the nested components are fully reachable only in composed form.
- **Tokens**: plain `tokens` go to the `colorPicker` recipe (`colorPickerSelection = {tokens}`, `color-picker.ts:106`). No variants. Nested TextField/IconButton tokens are not reachable.
- **Variants down**: none. The hex TextField is hard-coded `variant="outlined"`.
- **Inconsistencies**: className/class and string-style differences. N has no keyed props. N calls `useComponentSlots("colorPicker", colorPickerSelection(picker))` _four_ times (Area, ChannelSlider, SwatchTrigger, Impl), each with a new selection object per render (N:139, 257, 366, 392). N per-render style spreads are everywhere (`{...s.area, ...unselectable}`).

#### calendarCell (calendar-parts.tsx / calendar.tsx)

Not a ready-made on its own; the cells are rendered inside the pickers. R `calendar-parts.tsx:285` `Cell`, S `calendar-parts.tsx` (similar), N `calendar.tsx`.

- **Props taken**
    - R/S `CalendarCellProps` (`R calendar-parts.tsx:68`): `value`, `view`, `columns`, `tokens`, `testId`, `unstyled`, `interactionSource`, `children`, plus element props.
    - `className`/`style` are plain element props (Root div). Nothing is keyed by part (`root`, `trigger`). `testId`/`unstyled` take the `calendarCell` part override shape.
    - N: no props at all. `testIdOf(calendarCellAnatomy, part, undefined)` (calendar.tsx:71), with no tokens, testId or style.
- **Own parts**: `calendarCell.root`, `calendarCell.trigger` (anatomy generated.ts:2044). The `trigger` is distinct from datePicker's `trigger`.
- **Nested components**: none. The cell renders its own `scope.render("root"…{trigger})`.
- **Tokens**: its own `tokens` prop goes to the `calendarCell` recipe (`calendarCellSelectionOf`). Pickers never pass it (R/S ready-made make Cells by default). So cell tokens, className, style and testId are **not reachable from DatePicker/DockedDatePicker ready-mades** (only via composed `Grid`/`YearList` children).
- **Variants**: the cell derives `view`, `selection` (none/selected/rangeStart/rangeMiddle/rangeEnd), `today`, `outside` from the machine. They are not user props.
- **Inconsistencies**: N has no props at all. R/S have `tokens`, `testId`, `unstyled`.
- **Shared parts (R/S `calendar-parts.tsx`)**: the pickers' `weekdays`, `weekday`, `grid`, `week`, `monthList`, `yearList`, `prev`, `next` are _the picker's_ parts (recipe is the picker's). In composed form these take `CalendarPartProps` (+`unstyled`). `CalendarStepProps` has `[prop: string]: unknown`, so it is open. `YEAR_COLUMNS`/`MONTH_COLUMNS` = 3.

#### LinearProgress — `linear-progress/` (N: `progress.tsx`)

R:~70 `LinearProgressProps`, S: same file layout, N `progress.tsx:21`.

- **Props taken**
    - R/S: keyed className|class, style, slotProps; unstyled by part (`ProgressRootOwnProps<"linearProgress">`); testId prefix or by part.
    - N: **only `testId`**, `aria-label` and variants. No `style`, no `unstyled`.
- **Own parts**: root, track, trackBefore, trackAfter, indicator, stopIndicator.
    - R/S reachable: all six. `track`, `trackBefore`, `trackAfter` and `stopIndicator` render only when `track !== false`.
    - N: all by `testId`.
- **Nested components**: none.
- **Tokens**: plain `tokens` go to the `linearProgress` recipe through `progressSelection`, which also merges a `value` token computed from `value`/`min`/`max` (progress.ts:117). No prefixed tokens.
- **Variants down**: none to children. Selection: `indeterminate`, `color`, `thickness`, `shape`.
- **Inconsistencies**
    - className/class and string-style split.
    - N has no style or unstyled.
    - N omits `as`, aria-labelledby and other element props. It takes only `aria-label` (N:52).
    - N accepts `shape="wavy"` and draws the indicator through `engine.Drawing` only when an SVG engine is present.
- **Notable**: N `valueProps` builds a new object per render.

#### CircularProgress — `circular-progress/` (N: `progress.tsx`)

Identical structure to LinearProgress.

- **Props taken**: R/S keyed className|class, style, slotProps, unstyled, testId. N `testId` only (N:30).
- **Own parts (14)**: root, track, trackEndHalf, trackEndArc, trackStartHalf, trackStartArc, trackTailCap, trackHeadCap, endHalf, endArc, startHalf, startArc, tailCap, headCap.
    - R/S reachable: all. The `track*` parts render only when `track !== false`.
- **Nested**: none.
- **Tokens**: plain `tokens` go to the `circularProgress` recipe with `value` added by `progressSelection`.
- **Variants down**: none.
- **Inconsistencies**: same as LinearProgress. N has no `Drawing`. N uses `useComponentSlots` without `selected`.

#### LoadingIndicator — `loading-indicator/`

R:~83, S, N `loading-indicator.tsx:19`.

- **Props taken**
    - R/S: keyed className|class, style, slotProps; unstyled by part (`LoadingIndicatorRootOwnProps`); testId prefix or by part.
    - N: `testId?: TestIdOverride<LoadingIndicatorPart>` and `aria-label` only. No style, no unstyled.
- **Own parts**: root, container, indicator. R/S reach all three. N reaches all three by testId.
- **Nested**: none.
- **Tokens**: plain `tokens` go to the `loadingIndicator` recipe (`loadingIndicatorSelection = {variant, color, tokens}`).
- **Variants down**: none. Selection: `variant` (contained/uncontained), `color`.
- **Inconsistencies**: className/class and string-style split. N has no style/unstyled. N draws `selected.drawings.indicator` via `engine.Drawing`.

#### FadeThrough — `fade-through/`

R:~34 `FadeThroughProps`, S:31, N:37. Not slot-keyed; a single flat component.

- **Props taken**
    - R/S: `PartProps` of Root (plain className|class and style apply to the root element only, **not keyed**), `testId` (`TestIdOverride<FadeThroughPart>`), `unstyled` (`Unstyled<FadeThroughPart>`), `as`, `value`, `children` (node or function).
    - N: `style?: StyleProp<ViewStyle>`, `testId`. No `unstyled`, no tokens. `children` is a node or function.
    - `className`/`slotProps` are absent in N. R/S have `slotProps`? **No** (not in `Omit<PartProps, …>`; `slotProps` is an ordinary `PartProps` key only if `PartProps` defines it, unverified).
- **Own parts**: root, page. Via `className/style`: root only. `page` is reachable only via `unstyled`/`testId`. N: `testId` for root and page. **Every page shares one id** (`pageTestId`).
- **Nested**: none (the content is children).
- **Tokens**: **none**. `fadeThroughSelection()` is `{}`.
- **Variants down**: none.
- **Inconsistencies**
    - N `style` is the root's (array composition, not flattened: `[s.root, CLIP, props.style]`, N:~110). R/S `style` also targets root.
    - R/S can disable styles per part with `unstyled`. N cannot.
    - Provider `slotProps` (`fadeThrough.root/page`) work in R/S only.

#### HorizontalSharedAxis — `horizontal-shared-axis/`

R:~27 `HorizontalSharedAxisProps`, S:31, N:43.

- **Props taken**
    - R/S: `PartProps` on Root (plain className|class, style → root element only), `index`, `scrim`, `tokens`, `testId`, `unstyled` by part (`HorizontalSharedAxisRootOwnProps`), `as`, `children`. S `children` can also be a function `(index) => JSX.Element`. R children is plain.
    - N: `index`, `scrim`, `tokens`, `children`, `testId`. **No `style`** (unlike N FadeThrough), no `unstyled`.
- **Own parts**: root, page, scrim. R/S/N reach root via className/style (R/S) and all three by testId.
    - N `page` has a single id shared by every page. The `scrim` renders only when `scrim && leaving && entering.direction`.
- **Nested**: none.
- **Tokens**: plain `tokens` go to the `horizontalSharedAxis` recipe (`{tokens}`, horizontal-shared-axis.ts:55). N also reads `props.tokens` over provider `defaults[...].tokens` for the spring (N:~256).
- **Variants down**: none.
- **Inconsistencies**: S `children` as a function. N has no `style` and no `unstyled`, but R/S have both. N root `style=[s.root, pagesMoving ? CLIP : null]` allocates per render.

#### Ripple — `ripple/` (R/S only)

R `ripple.tsx:~14`, S `ripple.tsx:24`; **N: none** (no ripple component; indication in N is `indication.tsx`).

- **Props taken**
    - R/S: `RippleProps` = `PartProps` on Root (the `span`) + `RippleRootOwnProps` (machine props `disabled`, `centered`, `effect`, …, `tokens`, `testId`, `unstyled`) + `as`. className|class and style are plain element props.
- **Own parts (generated.ts:6474)**: root, ripple. `ripple` is not an element Root renders; the machine adds ripple elements classed with the registry's `ripple` slot (`scope.classes.ripple?.class`, skipped when `isUnstyled(unstyled,"ripple")`). So `unstyled.ripple`/`testId.ripple` exist, but className/style/slotProps cannot reach `ripple` elements.
- **Nested**: none.
- **Tokens**: plain `tokens` go to the `ripple` recipe (`{tokens}`, ripple.ts:67). Per the doc, its timing is the layer's transition tokens.
- **Variants down**: none.
- **Inconsistencies**: no RN. R/S same shape.

#### Other components/dirs in R/S not in groups A-D

- `ripple`, `fade-through`, `horizontal-shared-axis`, `date-*`, `time-picker`, `color-picker`, `*-progress`, `loading-indicator` are the whole set (listed above). Nothing else was found outside the groups. `provider.tsx` has no part props.

### Summary table (props per renderer)

| component               | R                                                                      | S                  | N                                        |
| ----------------------- | ---------------------------------------------------------------------- | ------------------ | ---------------------------------------- |
| DatePicker              | className, style, slotProps keyed (own parts), unstyled/testId by part | same with `class`  | testId only                              |
| DockedDatePicker        | same                                                                   | same               | testId only                              |
| TimePicker              | same                                                                   | same               | testId only                              |
| ColorPicker             | same                                                                   | same               | testId only                              |
| Linear/CircularProgress | same                                                                   | same               | testId only                              |
| LoadingIndicator        | same                                                                   | same               | testId only                              |
| FadeThrough             | plain className/style on root, `unstyled`/`testId`                     | `class`, same      | `style` (`StyleProp<ViewStyle>`), testId |
| HorizontalSharedAxis    | plain className/style on root, unstyled/testId                         | same + fn children | testId only (no style)                   |
| Ripple                  | plain, unstyled/testId                                                 | same               | absent                                   |
| calendarCell            | element props + tokens/testId/unstyled (composed only)                 | same               | none                                     |

### Gaps (group E)

1. N has no `style`, `className`, `slotProps` or `unstyled` on **any** group E component except FadeThrough's root `style`. `HorizontalSharedAxis` has none (inconsistent with FadeThrough).
2. S `DatePicker`/`DockedDatePicker`: `weekdays`, `grid`, `weekday` and `week` cannot be keyed (`calendar.DayCalendar` takes no props). R forwards `weekdays` and `grid`.
3. Docked picker: `actions` is an anatomy part never rendered by R, S or N, so its slot props are dead. `prev` and `next` each style two buttons. S hides the month and year steps outside the day view, which R does not. S always renders Label.
4. Modal picker Backdrop (anatomy `scrim`) gets no slot forwarding. The Cancel/Confirm buttons and calendar Cells cannot be styled, tokenized or tested by prop from ready-mades (only composed).
5. Nested ready-made components (`Button`, `IconButton`, `TextField`) have **no** token or slot prop (`ColorPicker` HexField/EyeDropper, pickers' as-targets). Only `inputLabel` and `eyeDropperLabel` are forwarded. No prefixed token props exist in the group, only the plain `tokens` for the own recipe.
6. R/S spread a plain string `className` into `as={IconButton|Button}` whose own `className` is part-keyed and is skipped by `useSlotProps` when not an object. Per-part className/style on trigger, modeToggle, prev, next and Cancel/Confirm may be dropped (unverified).
7. TimePicker: scrollItem and dial subparts (dialTrack, dialHandle, dialCenter, dialLabel) are unreachable. ColorPicker: areaBackground, areaThumb, transparencyGrid, channelSliderTrack/Thumb and swatch are unreachable. Several parts are shared across instances (`channelSlider` for hue/alpha, `period` for am/pm, `swatchTrigger`).
8. N testIds repeat across instances: weekday, week, swatch, swatchTrigger, page. Trigger test ids (`pf-date-picker-trigger`, `pf-docked-date-picker-trigger`) are hard-coded and ignore `testId`.
9. N part sets differ from web: the generated anatomy omits trigger, positioner and content for date pickers.
10. Provider `slotProps` are keyed by `anatomy.name` then `slot`, which can differ from the part name (`datePicker.content` → slot `root`; datePicker `root` has `slot: null`). There is no RN provider `slotProps`.
11. N allocates per render: `withUserStyle` (not used in group E), selection objects, `{...s.x, ...unselectable}`, `slots={{…}}`, `inFlowInline(...)`, `id` closures. `ColorPicker` calls `useComponentSlots` four times per render tree.
12. RN root styles in group E have no user `style` merge (only FadeThrough composes `props.style`). A `withUserStyle`-like merge exists only for group A/D components.
13. Not checked: whether R/S `slotProps` is a declared `PartProps` key on FadeThrough, HorizontalSharedAxis or Ripple. These are flat components with no `slot()` use.
