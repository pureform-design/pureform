# @pureform/binding-core

The framework-free half of pureform's bindings. Everything `@pureform/solid`,
`@pureform/react`, and `@pureform/react-native` would otherwise write twice lives here:
what `PureformProvider` takes and how nested providers combine, runtime themes and token
overrides as CSS, selections over the provider's defaults, a part's state attributes and how its props merge, controllable state, reduced
motion, an icon slot's measured style, and each component's contract: the props Root takes and
how they map onto the selection and the machine.

## Where it sits

```
@pureform/core, styling, anatomy, js-effects   (framework-free; types, registry, part names, the ripple)
                 │
@pureform/binding-core   (this package; no framework)
                 │
@pureform/solid, @pureform/react, @pureform/react-native   (hooks and components)
```

It's in the core train (`cog.toml`'s `core-train`). A binding adds only what needs its
framework: context, memos, effects, and rendering. `@pureform/bundler` reads its `/usage` subpath
to prune builds.

## Architecture

| Module                   | What it holds                                                                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.ts`            | `ProviderOptions`, `ProviderState`, `resolveProvider` (nesting), `providerAttributes`, `themeAttributes`, `requireRegistry`                                                                                                            |
| `selection.ts`           | `withDefaults`: a selection over the provider's defaults; `selectionSignature` to memoize on one                                                                                                                                       |
| `entries.ts`             | `classEntry` (the provider registry's entry), and the class hooks' errors about lazy entries                                                                                                                                           |
| `parts.ts`               | `partSources` (a part's props, in merge order), `stateAttributes`, `partClasses`, `forSlot`, `isUnstyled`, `isIconPart`                                                                                                                |
| `props.ts`               | `combineProps`: one part's props from several sources, with the binding's rules for classes and styles                                                                                                                                 |
| `class-names.ts`         | `cx`: a `clsx`-compatible class joiner, for bindings whose class prop is a string (React)                                                                                                                                              |
| `controllable.ts`        | `Controllable<N, T>`, the controlled/uncontrolled warning, and `reason: "reset"` tracking                                                                                                                                              |
| `components/`            | One file per component's contract (`button.ts`, `checkbox.ts`, `switch.ts`, `radio-group.ts`, `chip.ts`, `icon-button.ts`, `fab.ts`), what ready-made components share about content (`content.ts`), and `VariantProp` (`variants.ts`) |
| `motion.ts`              | `resolveReducedMotion`, `REDUCED_MOTION_QUERY`                                                                                                                                                                                         |
| `icon-style.ts`          | `IconStyle`, `DEFAULT_ICON_STYLE`                                                                                                                                                                                                      |
| `version.ts`             | `trainVersionMismatch`: the generated registry's recorded train version against the running `@pureform/styling`'s `VERSION`                                                                                                            |
| `warn.ts`                | `warnOnce`                                                                                                                                                                                                                             |
| `web-theme.ts`           | Runtime themes' `<style>` blocks, overrides as vars, and when to generate or keep the server's block (on `/dom`)                                                                                                                       |
| `usage.ts`               | `COMPONENT_USAGE` and the hook and provider names the bundler's pruning scan reads (on `/usage`)                                                                                                                                       |
| `interaction.ts`         | The interaction source (on `/interaction`): `InteractionKinds`, `Interaction`, `InteractionState`, `createInteractionSource` and the state it keeps                                                                                    |
| `indication.ts`          | The `Indication` interface (on `/indication`): what an indication sets and draws, `defineIndication`; re-exports the three modules below                                                                                               |
| `indication-material.ts` | The web halves of `materialIndication({ ripple })` (the ripple from the source's presses, over `createRipple` from `@pureform/js-effects`) and `noIndication`; `rippleClasses(registry)`                                               |
| `indication-tokens.ts`   | An indication's tokens as CSS: theme-level overrides for a provider, instance tokens for a component, the focus indicator check                                                                                                        |
| `indication-host.ts`     | `IndicationHost`: what the web bindings share to tie an anatomy's indication entries to a component's elements, run the effect after mount, and track hover and press forwarded from another origin                                    |
| `dom.ts`                 | The web half, on its own subpath: reduced motion, measuring an icon slot, checkbox and radio inputs kept in step, `web-theme.ts`                                                                                                       |

The root entry uses no DOM API and no CSS lowering, so React Native can import it.

## Public API

### `@pureform/binding-core`

```ts
// Provider
type Direction = "ltr" | "rtl";
interface ProviderOptions<P> {           // P: the binding's props for one part
    registry?; dir?; motion?; defaults?; slotProps?;
    theme?: ProviderTheme;               // a name from the config, or a RuntimeTheme
    overrides?: ThemeOverrides;          // { "colors.primary": "#006a60" }: vars in the element's style
    hydrate?: "reuse" | "regenerate";    // how the client gets a server-rendered runtime theme
}
interface ProviderState<P> { registry; dir; motion; defaults; slotProps; theme; overrides; hydrate }
const ROOT_PROVIDER: ProviderState<never>;           // ltr, system, reuse, nothing else
resolveProvider(parent, own, merge?): ProviderState<P>;
providerAttributes(own, state): { dir; "data-pf-motion": "reduce" | "full" | undefined; ...themeAttributes };
themeAttributes(theme, registry);        // { "data-theme": "teal" } or { "data-theme": "pf-1x2y3z" }
themeAttributeOf(registry): string;      // the registry's theme attribute, else "data-theme"
requireRegistry(state): AnyRegistry;     // throws, naming PureformProvider, when there's none
withDefaults(defaults, selection): Selection<C>;
selectionSignature(selection): string;   // equal exactly when two selections select the same
classEntry(state, name): RegistryEntry<ClassFactory<N>>;
lazyFactoryError(name): Error; serverLazyFactoryMessage(name): string;

// Parts
stateAttributes({ pressed: true, hover: false }) // { "data-pf-active": "", "data-pf-hover": undefined }
partClasses(anatomy, part, slots, unstyled?): SlotClasses | undefined; // by the part's slot
partSources({ anatomy, part, machine, states, testId, unstyled, partUnstyled, classes, slotProps, props })
    // [machine, part attributes, state attributes, registry, provider slotProps, user props]
    // the registry's classes and the provider's slotProps are the part's slot's (partSlot):
    // a menu's `content` part reads the menu's `root` slot
spreadableProps(props);                  // without children and ref
cx("a", ["b", { c: true }]);             // "a b c", as clsx joins
forSlot(slotKeyed, slot); isUnstyled(unstyled, part); isIconPart(anatomy, part);
combineProps(sources, rules): Record<string, unknown>;
outsideRootMessage("Button", "Label");   // the error for a compound part outside its Root

// Controllable state
type Controllable<"checked", boolean>    // checked, defaultChecked, onCheckedChange({ checked, reason? })
type ControllableMachineProps<"checked", boolean, D> // what a binding hands the machine
controllableNames("checked")             // { value, defaultValue: "defaultChecked", onChange: "onCheckedChange" }
createControlTracker(component, name, initiallyControlled, warn): (controlled: boolean) => void;
createChangeReason(): { during(update); untilNextTask({ drop? }); report(callback, details) };

// Motion and icons
resolveReducedMotion(setting, systemReduces): boolean;
DEFAULT_ICON_STYLE; // { size: undefined, color: "currentColor", filled: false }
```

How a provider resolves: the registry, `dir`, `theme`, and `hydrate` are inherited unless set;
`motion` is the nearest `"reduce"` or `"full"`, else `"system"` (the CSS does the same, since a
`"system"` provider writes no attribute); `defaults` merge per component, the inner provider's
defined values winning, tokens too; `slotProps` merge per component and slot through the
binding's `merge`; `overrides` merge by key.

`combineProps` takes sources in order (machine, part attributes, states, registry, provider,
user): classes collect under the first of `rules.classKeys` and join with `rules.joinClasses`
(Solid: an array; React: a string), styles join with `rules.joinStyles`, `on*` handlers all
run in order, and any other key takes the last value that isn't `undefined`.

### Component contracts

Each component the bindings build has a file in `src/components/` that both bindings read, so
their props and behavior can't drift:

```ts
// A variant group's prop: the registry's values once an app's declarations augment it
type VariantProp<"button", "variant">    // "filled" | "tonal" | … ; any value while unregistered

// Button
interface ButtonRootOwnProps             // color, variant, size, density, tokens, disabled, type,
                                         // name, value, form, toggle, id, ids, selected,
                                         // defaultSelected, onSelectedChange, testId, unstyled
BUTTON_ROOT_PROPS                        // its keys, kept off the root element
buttonSelection(props): Selection<"button">;
buttonMachineProps(props);               // the machine's props; Root's `id` is the root's id
interface ButtonContentProps<Node>       // the ready-made button's label, icon, mirrorIcon
BUTTON_CONTENT_PROPS

// Checkbox
type CheckedState = boolean | "indeterminate";
interface CheckboxRootOwnProps           // color, density, tokens, disabled, invalid, required,
                                         // readOnly, name, form, value, id, ids, checked,
                                         // defaultChecked, onCheckedChange, testId, unstyled
CHECKBOX_ROOT_PROPS; CHECKBOX_INPUT_LABEL_PROPS; // aria-label, -labelledby, -describedby
checkboxSelection(props); checkboxMachineProps(props, fieldsetDisabled);
checkboxNativeDefault(resetsTo): boolean;          // what a form reset shows natively
checkboxResetState(defaultChecked): CheckedState;  // what the binding sends after a reset
checkboxInputProps(zagHiddenInputProps, readOnly); // without Zag's style and aria-labelledby
checkboxMarkProps(zagIndicatorProps);              // without `hidden`: the CSS shows each mark

// Switch: the checkbox's shape on Zag's switch, without indeterminate
SWITCH_ROOT_PROPS; SWITCH_INPUT_LABEL_PROPS; SWITCH_CONTENT_PROPS; // icon
switchSelection(props); switchMachineProps(props, fieldsetDisabled); switchNativeDefault(resetsTo);
switchInputProps(zagHiddenInputProps, readOnly);   // role="switch", without style, aria-labelledby

// Radio group: the group (unstyled, radioGroupAnatomy) and each radio (the preset's radio)
interface RadioGroupRootOwnProps         // color, density, tokens (every radio's defaults), disabled,
                                         // invalid, required, readOnly, name, form, orientation,
                                         // id, ids, value, defaultValue, onValueChange, testId
interface RadioOwnProps                  // value, disabled, invalid, color, density, tokens,
                                         // testId, unstyled
RADIO_GROUP_ROOT_PROPS; RADIO_PROPS; RADIO_INPUT_LABEL_PROPS; RADIO_GROUP_CONTENT_PROPS; // items
interface RadioGroupItem { value; label; disabled?; invalid?; testId? }
radioSelection(groupVariants, radioVariants);       // the radio's own win
radioGroupMachineProps(props, fieldsetDisabled); radioGroupResetValue(defaultValue);
radioGroupRootProps(p); radioItemProps(p); radioInputProps(p); radioRingProps(p);
                                         // without aria-labelledby, Zag's inline style, data-ssr

// Button group: the row (buttonGroupAnatomy) on Zag's toggle group when selectable; its buttons
// are the preset's buttons and icon buttons
interface ButtonGroupRootOwnProps        // size, connected, groupTokens, the buttons' color,
                                         // variant, corner, density, selectable ("single" |
                                         // "multiple"), deselectable, disabled, id, value,
                                         // defaultValue, onValueChange, testId
interface ButtonGroupItem { value?; label?; icon?; "aria-label"?; disabled?; width?; onClick?; testId? }
BUTTON_GROUP_ROOT_PROPS; BUTTON_GROUP_CONTENT_PROPS; // items
buttonGroupSelection(props); buttonGroupMachineProps(props);
buttonGroupPosition(index, count, connected); // "single" unless connected, then tilePosition
groupedButtonVariants(group, button, position); // the button's own win
buttonGroupRootProps(p); buttonGroupItemProps(p); // without Zag's style; without id, disabled, type

// Chip set: the row (chipSetAnatomy) on the button group's toggle group when selectable.
interface ChipSetRootOwnProps  // singleLine, setTokens, the chips' variant, corner, color,
                               // density, tokens; selectable, deselectable, disabled, id, value
interface ChipSetItem { value?; label?; icon?; trailingIcon?; disabled?; onClick?; testId? }
chipSetSelection(props); chipSetMachineProps(props); chipSetChipVariants(set, chip);

// Selection list: a list on Zag's listbox; `single` by default.
interface SelectionListRootOwnProps // the list's props, selectionMode, deselectable, loopFocus,
                                    // disabled, id, value
interface SelectionListItem         // a list item's content and variants, value, textValue?, disabled?
selectionListOptions(items); selectionListMachineProps(props);
revealInRow(item); // (dom) scrolls an item's scrolling row, never the page

// Chip, icon button, FAB: on the button machine (buttonMachineProps, or fabMachineProps)
CHIP_ROOT_PROPS; chipSelection(props);
ICON_BUTTON_ROOT_PROPS; ICON_BUTTON_CONTENT_PROPS; iconButtonSelection(props); // sets `toggle`
isToggle(props);                         // toggle ?? (selected or defaultSelected given)
FAB_ROOT_PROPS; FAB_CONTENT_PROPS; fabSelection(props); fabMachineProps(props); // never a toggle

// Text field and text area: on pureform's text field machine; one contract for both
interface TextFieldRootOwnProps          // variant, color, density, leadingIcon, trailingIcon,
                                         // prefixText, suffixText (room for them), secure, counterMax,
                                         // revealLabel, tokens, disabled, invalid, error,
                                         // validate, required, readOnly, placeholder, name, form,
                                         // id, ids, value, defaultValue, onValueChange, testId, unstyled
interface TextAreaRootOwnProps           // the same without affixes and secure, and autoGrow
TEXT_FIELD_AFFIX_PROPS;                  // prefixText, suffixText: the ready-made text field's and select's
TEXT_FIELD_ROOT_PROPS; TEXT_AREA_ROOT_PROPS; TEXT_FIELD_CONTENT_PROPS; // label, supportingText,
                                         // leadingIcon, trailingIcon, mirrorLeadingIcon, mirrorTrailingIcon
TEXT_FIELD_INPUT_PROPS; TEXT_AREA_INPUT_PROPS; // the ready-made's props that go on the input,
                                         // spelled alike in both frameworks (each binding adds its own)
textFieldSelection(props); textAreaSelection(props); textFieldMachineProps(props);
textFieldNativeDefault(resetsTo): string;

// Select: Zag's select; the list is drawn as a menu (selectMenuAnatomy)
interface SelectRootOwnProps             // variant, color, density, leadingIcon, tokens, items,
                                         // disabled, invalid, error, required, readOnly, name, form,
                                         // autoComplete, positioning, id, ids, value, defaultValue,
                                         // onValueChange, open, defaultOpen, onOpenChange, testId, unstyled
interface SelectItem { value; label; disabled?; group? }
selectItemGroups(items); selectGroupedItems(items); // option groups, in the order each first appears
SELECT_ROOT_PROPS; SELECT_INPUT_LABEL_PROPS; SELECT_CONTENT_PROPS; SELECT_COLLECTION;
selectSelection(props);                  // trailingIcon always on: the arrow
selectMenuSelection(props);              // the menu's color and density
toZagValue(value); fromZagValue(list);   // one value or null <-> Zag's list
selectValueProps(controllableMachineProps); selectMachineProps(props, fieldsetDisabled);
                                         // the list as wide as the field, but inside the viewport
selectSupportingTextId(props, id);
selectInputProps(zagTriggerProps, valueText, dir); // a read-only <input>; rtl swaps the sideways arrows
selectPositionerProps(p, present);       // hidden once gone (closed, and its exit animation over)
selectHiddenSelectProps(p);              // without aria-labelledby

// Overlays: the menu, tooltip, and dialog render in place, inside an unstyled Root (no portal)
type OverlayPlacement; interface OverlayPositioning { placement; gutter; sameWidth; strategy; flip }
overlayPresent(open, present);           // open, or still animating out (Zag's presence)
presentProps(p, present);                // hidden once gone, over Zag's hidden-at-close
overlayPositionerProps(p, present);      // the same, for a positioner

// Menu: Zag's menu; menuOverlayAnatomy (root, trigger, positioner, content, item, …)
interface MenuRootOwnProps               // color, density, vibrant, grouped, tokens, onSelect, closeOnSelect, loopFocus,
                                         // typeahead, positioning, aria-label, ids, open,
                                         // defaultOpen, onOpenChange, testId, unstyled
interface MenuItem<Node> { value; label; valueText?; disabled?; closeOnSelect?; type?; checked?;
                           onCheckedChange?; supportingText?; leadingIcon?; trailingIcon?;
                           trailingText?; mirrorLeadingIcon?; mirrorTrailingIcon? }
interface MenuGroup<Node> { id; label?; items }
MENU_ROOT_PROPS; MENU_CONTENT_PROPS;     // trigger, items, groups
MENU_ITEM_PROPS; menuItemMachineProps(api, item); // a toggleable item (type) takes Zag's option item
menuGrouped(props);                      // grouped, else whether there are groups
menuSelection(props); menuMachineProps(props); // placement "bottom-start" unless given
menuItemProps(item);                     // Zag's item props from an item's data

// Tooltip: Zag's tooltip; tooltipOverlayAnatomy
interface TooltipRootOwnProps            // tokens, openDelay, closeDelay, disabled,
                                         // interactive, closeOnEscape, closeOnClick, positioning,
                                         // ids, open, defaultOpen, onOpenChange, testId, unstyled
TOOLTIP_ROOT_PROPS; TOOLTIP_CONTENT_PROPS; // trigger, supportingText, caret
tooltipSelection(props);
isInteractiveTooltip(props, byDefault);  // `interactive`, else `byDefault` (false); otherwise
                                         // it lets the pointer through, positioner and all
tooltipMachineProps(props, interactive); // placement "bottom"
CARET_STYLE;                             // `--arrow-background: currentColor`, for the caret

// Rich tooltip: Zag's tooltip, interactive; richTooltipOverlayAnatomy
RichTooltipRootOwnProps; RICH_TOOLTIP_ROOT_PROPS; RICH_TOOLTIP_CONTENT_PROPS; // + subhead, actions
richTooltipSelection(props); isInteractiveRichTooltip(props); richTooltipMachineProps(props);
// Popover: Zag's popover, rendered in place; popoverOverlayAnatomy
PopoverRootOwnProps; POPOVER_ROOT_PROPS; POPOVER_CONTENT_PROPS; // heading, body, actions, caret
popoverSelection(props); popoverMachineProps(props); // placement "bottom-start" unless given

// Dialog: Zag's dialog; dialogOverlayAnatomy, and dialogBackdropAnatomy (the scrim)
type DialogPart                          // the overlay's parts, and "backdrop"
interface DialogRootOwnProps             // icon (the variant), tokens, modal, role, onClose (OverlayCloseProps),
                                         // closeOnInteractOutside, closeOnEscape, restoreFocus,
                                         // initialFocusEl, finalFocusEl, aria-label, ids (headline,
                                         // body: Zag's title and description), open, defaultOpen,
                                         // onOpenChange, testId, unstyled
DIALOG_ROOT_PROPS; DIALOG_CONTENT_PROPS; // trigger, mirrorIcon, headline, body, actions (and icon)
dialogSelection(props); dialogMachineProps(props);
dialogPositionerLayout(present);         // hidden once gone; fixed over the viewport, centering
dialogBackdropLayout(present);           // hidden once gone; the scrim fixed over the viewport
interface OverlayCloseProps              // onClose, for the dialog, full-screen dialog and both sheets: asked before
                                         // any close of its own (Escape, scrim, close trigger, a bottom sheet's handle
                                         // press or drag): a boolean, or a promise; a controlled `open` closing it doesn't
                                         // ask, by design. An app's Cancel button asks it by being a CloseTrigger. In React
                                         // Native a surface alone (no trigger) accepts it but never calls it
type CloseQuestion                       // () => boolean | Promise<boolean>
closeTriggerProps(close, onClose, requestClose); // Zag's close props, its click asking onClose when there is one

// Full-screen dialog: the same Zag dialog machine (`dialogMachineProps`); fullscreenDialogOverlayAnatomy,
// no backdrop and no variants
type FullscreenDialogPart                // the overlay's parts
interface FullscreenDialogRootOwnProps   // tokens, onClose, and the dialog's behavior props, testId, unstyled
FULLSCREEN_DIALOG_ROOT_PROPS; FULLSCREEN_DIALOG_CONTENT_PROPS; // trigger, closeLabel, closeIcon,
                                         // headline, confirmAction, body
fullscreenDialogSelection(props);
fullscreenDialogPositionerLayout(present); // hidden once gone; fixed over the viewport, stretching

// Sheets: the dialog's Zag machine; bottomSheetOverlayAnatomy, sideSheetOverlayAnatomy
type BottomSheetPart; type SideSheetPart  // the overlays' parts, and "backdrop"
interface BottomSheetRootOwnProps        // modal, dragHandle (false pads the content), tokens, onClose, the dialog's behavior props (no role), testId, unstyled
closeAsker();                            // asks an overlay's onClose for every way it closes; a later question makes an earlier answer moot
askingDismissProps(onClose, props, asker, close); // Zag dialog props: Escape and a press outside ask onClose first
interface SideSheetRootOwnProps          // modal, coplanar, tokens, onClose (OverlayCloseProps), and the same
BOTTOM_SHEET_ROOT_PROPS; BOTTOM_SHEET_CONTENT_PROPS; // trigger, dragHandleLabel, body
SIDE_SHEET_ROOT_PROPS; SIDE_SHEET_CONTENT_PROPS;     // trigger, headline, onBack, backLabel, backIcon,
                                         // closeLabel, closeIcon, body, actions
sheetModal(props);                       // modal unless `modal: false`
bottomSheetSelection(props); sideSheetSelection(props); // a modal side sheet isn't coplanar
sheetMachineProps(props);                // modal by default; a click outside closes only a modal sheet
bottomSheetPositionerLayout(present, modal); // fixed to the bottom; a standard one lets presses through
sideSheetPositionerLayout(present, modal, coplanar); // fixed to the end edge, or in the page's layout
sheetContentLayout;                      // the surface takes presses back
dragToDismiss(handle, sheet, dismiss, onClose?, asker?, { partial?, opening?, onRest? }); // from /dom: drag a sheet by its handle; closes it, or with `partial`, moves it between partly and fully open (re-placed on a resize); returns stop, with stop.rest(rest) for a controlled `expanded`; dismiss(kept) calls kept once rendered if the app kept it open
sheetPartiallyExpandable(props); sheetOpeningRest(props); // partly open unless `partiallyExpandable: false`; where it opens (`expanded` ?? `defaultExpanded`)
SHEET_POSITIONAL_THRESHOLD; SHEET_VELOCITY_THRESHOLD; // Compose's 56px and 125dp/s (0.125px/ms); replace SHEET_DISMISS_SHARE and SHEET_FLICK_SPEED
sheetRelease({ offset, velocity, height, partial? }); // where a let-go sheet goes: "expanded" | "partial" | "closed", by chooseAnchor (shared with React Native)
sideSheetDragToDismiss(sheet, rtl, dismiss, onClose?, asker?, draggable?); // from /dom: a touch or pen drags a side sheet toward its edge (pan-y keeps vertical scroll native); closes it or settles it back; returns stop
SIDE_SHEET_VELOCITY_THRESHOLD; sideSheetRelease({ offset, velocity, width }); // MDC-Android's SideSheetBehavior: 500px/s (0.5px/ms) or halfway out closes; "open" | "closed" (shared with React Native)
sheetPartialOffset(height, screen); sheetDragHandleLabel(rest, movable); // partly open's offset (top at half the screen); the handle's default name
settleTransition(element, property, distance, velocity); // from /dom: starts an element's spring transition at a release's speed (core's springFromCurve + sampleSpring's `velocity`)
settleOnSpring(elements, property, spring, distance, velocity); // from /dom: the same on a given spring (the splitter's panes on SPLITTER_SETTLE)
focusableWhileOverflowing(element);      // from /dom: tabindex="0" only while its content overflows (the bottom sheet's body)
createDragVelocity();                    // a drag's speed (px/s) over its last 100ms (drag.ts; the sheet and the splitter)
chooseAnchor({ anchors, at, velocity, velocityThreshold, positionalThreshold? }); // Compose's anchored-drag target: the next one on a fling, else the nearest or past a positional threshold
markMenuGroupEdges(content);             // from /dom: marks a menu's first and last groups data-first/data-last, from DOM order; a group's data-pf-first/data-pf-last (its explicit first/last) wins
swallowNextClick(row);                   // from /dom: drop the click a drag ends with
whenAnimationsEnd(element, done);        // from /dom: done once every animation running on it ends (at once with none); returns what stops waiting

// Drag handle: dragHandleAnatomy
interface DragHandleRootOwnProps         // orientation, tokens, testId, unstyled
DRAG_HANDLE_ROOT_PROPS; dragHandleSelection(props);

// Splitter: splitterAnatomy (Zag's splitter)
interface SplitterRootOwnProps           // orientation, tokens, panels, size/defaultSize/onSizeChange, anchors, keyboardResizeBy, id, testId, unstyled
SPLITTER_ROOT_PROPS; splitterSelection(props); splitterOrientation(props);
splitterMachineProps(props);             // id, orientation, panels, keyboardResizeBy
splitterSizeProps(sizes, panels);        // size, defaultSize (shared out when neither is given), onResize from onSizeChange
SPLITTER_ANCHORS;                        // Compose's sample anchors: 0, 240 from the start, 50%, 240 from the end, 100%
SPLITTER_FLING_VELOCITY;                 // 200px/s: faster snaps to the next anchor that way (Compose's)
SPLITTER_SETTLE;                         // spring(0.8, 380): the snap's settle, from the release's speed (Compose's)
splitterSnap({ sizes, index, room, anchors, limits, velocity }); // the sizes once a let-go divider snaps
splitterMoveBy(sizes, index, delta, limits); splitterLimits(panels, room); splitterPercent(size, room, fallback);
splitterInitialSizes(panels, sizes, room); splitterTriggerId(before, after); splitterTriggerProps({ label, dragging });

// Color picker: colorPickerAnatomy (Zag's color picker, with valueSwatch)
interface ColorPickerRootOwnProps        // tokens, value/defaultValue/onValueChange, onValueChangeEnd, disabled, readOnly, name, form, id, testId, unstyled
interface ColorPickerContentProps<Node>  // label, area, alpha, swatches, inputLabel, eyeDropper, eyeDropperLabel
COLOR_PICKER_ROOT_PROPS; colorPickerSelection(props); COLOR_PICKER_DEFAULT; // "#6750a4", Material's baseline seed
colorPickerHex(text);                    // "#rrggbb" (or "#rrggbbaa" when not opaque) from 3, 4, 6 or 8 hex digits, else undefined
colorPickerHexText(hex); colorPickerSwatchLabel(color); colorPickerFraction(at, length, rtl);
COLOR_PICKER_THUMB_CENTRE;               // centres a slider thumb on the point Zag places it at (web)
hasEyeDropper();                         // Chromium's EyeDropper; read it once mounted

// Snackbar: pureform's snackbar machine; the generated snackbarAnatomy
interface SnackbarRootOwnProps           // layout, tokens, duration, onAction, id, ids, open, defaultOpen,
                                         // onOpenChange ({ open, reason }), testId, unstyled
SNACKBAR_ROOT_PROPS; SNACKBAR_CONTENT_PROPS; // supportingText, action, closeLabel, closeIcon
snackbarSelection(props); snackbarMachineProps(props);
interface SnackbarQueueOptions<Node>     // what a queued snackbar shows: layout, tokens, indication, the
                                         // content props, duration, onAction, onOpenChange, testId
interface SnackbarQueueApi<Options>      // show(options) → id; dismiss(id?)
interface SnackbarHostPlacementProps<L>  // offset: the room to leave below the host (a nav bar's)
// SnackbarRootOwnProps also takes onExitComplete, called once it has closed and its exit is over

// Toast: Zag's toast; the generated toastAnatomy (group outermost, then root, icon, title,
// description, actionTrigger, closeTrigger)
type ToastType                           // "info" | "success" | "warning" | "error" | "loading"
interface ToasterOptions                 // placement, max, duration, gap, overlap, offsets
TOASTER_DEFAULTS; toasterOptions(options); // bottom-end, 3, 5000 ms, 8px, stacked, 16px
interface ToasterOwnProps                // tokens, indication, label, closeLabel, testId, unstyled
TOASTER_PROPS; isToastType(type); TOAST_GLYPHS; // text glyphs by type (React Native)
toastSelection(type, props);             // an unknown type selects `info`
TOAST_STACK_STYLE;                       // Zag's --x, --y, --scale, --opacity, --height applied
toastGroupStyle(style);                  // Zag's region style, physical insets, no z-index

// Toolbar: the generated toolbarAnatomy (root); overflow.ts and toolbar-dom.ts (`/dom`)
interface ToolbarRootOwnProps            // placement, orientation, color, tokens, overflow, testId
TOOLBAR_ROOT_PROPS; toolbarSelection(props); toolbarRootProps(props); // role, aria-orientation
interface ToolbarItem<Node>              // value, label, icon?, disabled?, selected?, onClick?, …
TOOLBAR_CONTENT_PROPS; TOOLBAR_OVERFLOW_LABEL; toolbarOverflowTestId(testId);
toolbarMenuItems(items, count); toolbarMenuSelect(items, value); toolbarMenuPositioning(o);
// Time picker and time input (c5b): the generated timePickerAnatomy and timeInputAnatomy
interface TimeBehaviorProps                // value/defaultValue/onValueChange (HH:mm), hourCycle, locale, translations, disabled, readOnly, name, form, id
interface TimePickerRootOwnProps          // + mode, color, tokens, view/defaultView/onViewChange, testId, unstyled
TIME_PICKER_ROOT_PROPS; TIME_INPUT_ROOT_PROPS; TIME_CONTENT_PROPS; // headline, actions
timeMachineProps(props); timePickerSelection(props); timeInputSelection(props);
// Table (c6d): the generated dataTableAnatomy; the registry name is dataTable, the subpath table
interface TableRootOwnProps               // stickyHeader, density, tokens, sort/defaultSort/onSortChange, sortStart, sortClearable, selectionMode, selection/defaultSelection/onSelectionChange, rowValues, translations, striped, id, testId, unstyled
interface TableColumn<Row, Node>          // id, header?, footer?, sortable?, cell?(row), value?(row)
TABLE_ROOT_PROPS; TABLE_CONTENT_PROPS;    // columns, rows, rowValue
tableMachineProps(props); tableSelection(props); tableRowPart(index, striped); tableCellValue(column, row); tableRowValue(row, index, rowValue);
toolbarKeyTarget(key, index, count, orientation, dir); // arrows along the bar, Home, End
overflowCount({ sizes, available, gap, trigger }); // how many elements stay in the row
watchOverflow({ root, elements, trigger, vertical, onCount }); moveToolbarFocus(root, key, o, dir);
// Paginator (c6c): the generated paginatorAnatomy (root, pageSize, pageSizeLabel, pageSizeSelect, rangeLabel, actions, four triggers)
interface PaginatorBehaviorProps          // page/defaultPage/onPageChange, pageSize/defaultPageSize/onPageSizeChange, count, pageSizeOptions, hidePageSize, showFirstLastButtons, disabled, translations, id
interface PaginatorRootOwnProps           // + tokens, testId, unstyled
PAGINATOR_ROOT_PROPS; paginatorSelection(props); paginatorMachineProps(props); paginatorTriggerProps(props, disabled);
paginatorPageSizes(options, current); paginatorSizeItems(sizes); paginatorRange(page, pageSize, count); paginatorRangeLabel(range, translations);
paginatorTotalPages(count, pageSize); paginatorClampPage(page, count, pageSize); paginatorPageAfterSize(page, pageSize, size); // the arithmetic React Native shares

// Tabs: Zag's tabs; tabsCompositeAnatomy (root, list, tab, tabContent, icon, label, indicator,
// content)
interface TabsRootOwnProps               // variant, icon (the variant), inlineIcon, color, tokens, activationMode,
                                         // loopFocus, disabled, id, ids, value, defaultValue,
                                         // onValueChange, testId, unstyled
interface TabsItem<Node> { value; label?; "aria-label"?; icon?; mirrorIcon?; disabled?; content? }
                                         // no label: an icon-only tab, named by its aria-label
TABS_ROOT_PROPS; TABS_CONTENT_PROPS;     // items
TABS_LIST_LABEL_PROPS;                   // aria-label, aria-labelledby: on the tab list
tabsSelection(props); tabsMachineProps(props); tabsItemProps(item, tabsDisabled);
tabsTriggerProps(p, { controls });       // without data-ssr; without aria-controls when no panel
tabsDefaultValue(props, items);          // the ready-made's: the first enabled tab, unless given
tabsHaveIcons(items); tabsHavePanels(items);

// Navigation bar and rail: pureform's navigation machine; their generated anatomies
type NavigationComponent = "navigationBar" | "navigationRail"; type NavigationPart;
interface NavigationRootOwnProps<C>      // color, itemLayout (bar), expanded and modal (rail),
                                         // tokens, disabled, id, ids, value, defaultValue,
                                         // onValueChange, open/defaultOpen/onOpenChange,
                                         // closeOnEscape, closeOnInteractOutside (modal rail),
                                         // testId, unstyled
interface NavigationItemOwnProps { value; href?; disabled? }
interface NavigationItem<Node> extends NavigationItemOwnProps { label; icon?; mirrorIcon? }
NAVIGATION_ROOT_PROPS; NAVIGATION_ITEM_PROPS; NAVIGATION_CONTENT_PROPS; // items, header (rail)
navigationSelection(props);              // a modal rail is expanded unless `expanded` says no
navigationMachineProps(props);
navigationModalMachineProps(props);      // Zag dialog props for a modal rail
navigationModalPositionerLayout(open); navigationModalContentLayout(open);
navigationItemElement(item);             // "a" with an href, else "button"
navigationItemMachineProps(item);        // aria-current "page" for a link, "true" for a button
navigationItemElementProps(item, disabled); // a button's type and disabled

// List item (no machine) and list (listAnatomy: a ul, an li per item)
interface ListItemRootOwnProps           // lines, interactive, leadingType, position, density, color, tokens, selected,
                                         // disabled, testId, unstyled
LIST_ITEM_ROOT_PROPS; LIST_ITEM_CONTENT_PROPS; // headline, overline, supportingText, leading,
                                         // trailing, trailingText, mirrorLeading, mirrorTrailing
listItemElement({ href, as });           // "a" with an href, else as, else "div"
listItemSelection(props, element);       // interactive defaults to a link or a button
listItemRootProps(props, element);       // aria-current while selected; disabled or aria-disabled
listItemLines(content);                  // one, two (overline or supporting text), three (both)
interface ListRootOwnProps               // variant, listTokens; density, color, tokens, leadingType
                                         // (every item's defaults), testId
listSelection(props);                    // the list's variant (standard or segmented)
listItemPosition(index, count, segmented); // first, middle, last, single; none unless segmented
interface ListItemData<Node>             // a list item's content, variants, value, href,
                                         // selected, disabled, testId
LIST_ROOT_PROPS; LIST_CONTENT_PROPS;     // items
listItemVariants(list, item);            // the item's own over the list's; reads named props only

// Linear and circular progress (no machine)
type ProgressComponent = "linearProgress" | "circularProgress";
type LinearProgressPart; type CircularProgressPart;   // incl. track, stopIndicator, trackEnd/StartHalf/Arc
interface ProgressRootOwnProps<C>        // indeterminate, color, thickness, shape (flat, wavy),
                                         // tokens, value, min, max, testId,
                                         // unstyled
PROGRESS_ROOT_PROPS;
isIndeterminate(props);                  // indeterminate, else no value (undefined or null)
progressPercent(props);                  // the value as a clamped percentage of min to max
progressSelection(props);                // the value token from the percentage, unless indeterminate
progressRootProps(props);                // role progressbar, aria-valuemin/max, aria-valuenow

// Loading indicator (no machine): a progressbar with no value
type LoadingIndicatorPart;               // root, container, indicator
interface LoadingIndicatorRootOwnProps   // variant (uncontained, contained), color, tokens, testId,
                                         // unstyled
LOADING_INDICATOR_ROOT_PROPS; loadingIndicatorSelection(props); loadingIndicatorRootProps();

// Autocomplete: Zag's combobox; the select's field with an editable input. The list shows the
// items `filter` keeps (labels containing the text by default; `false` keeps all).
type AutocompletePart; interface AutocompleteRootOwnProps // variants, items, filter, value,
// inputValue, open, allowCustomValue, openOnClick, error, name, …
AUTOCOMPLETE_ROOT_PROPS; autocompleteSelection(props); autocompleteMenuSelection(props);
autocompleteMachineProps(props, fieldsetDisabled); autocompleteMatches(items, text, filter);

// Date pickers: ISO dates (`2026-08-17`) on every target. The web runs Zag's date picker (modal:
// inline in Zag's dialog, holding a draft until OK; docked: a popover) and date input; React
// Native draws its calendar from the same helpers, so every target shows the same weeks.
monthWeeks(month, firstDay, fixedWeeks?); weekStartOf(locale); weekdayLabels(locale, firstDay);
calendarCellSelection(date, value, mode); chooseDate(date, value, mode); isSelectableDate(date, rules);
parseDateText(text, locale); formatDateText(date, locale); dateFormatHint(locale); selectedDateText();
dateMachineProps(props, parse);          // locale, startOfWeek from the locale, min/max parsed
DATE_PICKER_ROOT_PROPS; DOCKED_DATE_PICKER_ROOT_PROPS; DATE_INPUT_ROOT_PROPS; *_CONTENT_PROPS;
datePickerSelection; dockedDatePickerSelection; dateInputSelection; calendarCellSelectionOf;

// Search view: Zag's dialog (modal; focus goes back to the search bar) and Zag's combobox (the
// query and its suggestions). The search bar is its trigger: a press, Enter, ArrowDown or a
// typed key (opensSearchView) opens it.
type SearchViewPart; interface SearchViewRootOwnProps // variant, items, filter, open, inputValue,
// onSelect, onSubmit, closeOnSelect, placeholder, …
SEARCH_VIEW_ROOT_PROPS; searchViewSelection(props); searchViewDialogProps(props, input);
searchViewComboboxProps(props, open); searchViewPositionerLayout(variant, present);

// Tags input: Zag's tags input; a text field whose values are input chips (`chip` sets their
// variants: inputChipSelection(props.chip)). Tags aren't edited in place.
type TagsInputPart; interface TagsInputRootOwnProps // variant, color, density, icons, tokens, chip,
// value (string[]), max, maxLength, delimiter, validate, removeLabel, error, …
TAGS_INPUT_ROOT_PROPS; TAGS_INPUT_CONTENT_PROPS; tagsInputSelection(props);
tagsInputMachineProps(props); tagsInputFilled(count, text); tagsInputChipTestId(testId);
// Copy button: CopyButtonBehaviorProps (onCopy, onCopyError), CopyButtonContentProps, COPY_BUTTON_OWN_PROPS, copyButtonMachineProps(props), COPY_LABEL, COPIED_LABEL,
// copyAnnouncement(props, copied) and COPY_ANNOUNCEMENT_STYLE (the visually hidden live region that announces the copy).
// Rating: RatingRootOwnProps, RatingBehaviorProps, RATING_ROOT_PROPS, ratingSelection(props), ratingMachineProps(props), starFill(itemState).
type InputChipPart; interface InputChipVariantProps; inputChipSelection(props);

// Number field (pureform's own, c9a): Zag's number input; `value` is text in the locale, its
// change details `{ value, valueAsNumber }`. Always formats (NUMBER_FIELD_FORMAT), in `locale`, else
// the browser's or platform's (numberFieldLocale; NUMBER_FIELD_LOCALE "en-US" where there's none)
type NumberFieldPart; interface NumberFieldRootOwnProps // variant, color, density, leadingIcon,
// prefixText, suffixText, tokens, min, max, step, largeStep, locale, formatOptions, error, …
NUMBER_FIELD_ROOT_PROPS; NUMBER_FIELD_CONTENT_PROPS; numberFieldSelection(props);
numberFieldMachineProps(props); numberFieldLocale(props); numberFieldPlaceholder(placeholder);
// React Native's arithmetic: numberFieldRange, numberFieldParse, numberFieldFormat,
// numberFieldStep, numberFieldClamp, numberFieldCanStep, numberFieldOutOfRange,
// NUMBER_FIELD_SPIN_DELAY (300), NUMBER_FIELD_SPIN_INTERVAL (50), NUMBER_FIELD_LABELS

// Code field (pureform's own, c9a): Zag's pin input; `value` is a character per cell, its change
// details `{ value, valueAsString }`
type CodeFieldPart; interface CodeFieldRootOwnProps // variant, color, density, tokens, length,
// type, otp, mask, onValueComplete, placeholder, cellLabel, error, …
CODE_FIELD_ROOT_PROPS; CODE_FIELD_CONTENT_PROPS; CODE_FIELD_LENGTH; codeFieldSelection(props);
codeFieldMachineProps(props);
// React Native's arithmetic: codeFieldCells, codeFieldEnter, codeFieldBackspace, codeFieldString,
// codeFieldComplete, codeFieldAccepts, codeFieldCellLabel

// File upload: Zag's file upload; a drop zone with a trigger button over a list of files, each a
// list item (with an icon button to remove it, and a linear progress while the app reports one).
// The accepted files are `value` (Zag's acceptedFiles), with defaultValue and onValueChange
// ({ value, rejectedFiles }). React Native has no picker or drop, so the app keeps `files`
// (FileUploadEntry).
type FileUploadPart; interface FileUploadRootOwnProps // color, tokens, value, accept,
// maxFiles, maxFileSize, validate, progress, errorMessage, removeLabel, error, …
FILE_UPLOAD_ROOT_PROPS; FILE_UPLOAD_CONTENT_PROPS; fileUploadSelection(props);
fileUploadMachineProps(props); fileUploadValueProps(controllable); fileUploadErrorText(errors, file, errorMessage);
fileUploadProgress(progress, file); fileUploadItemTestId(testId); isPreviewable(file);
interface FileUploadEntry; formatFileSize(bytes);

// Slider: Zag's slider machine; a value is a number or a range's numbers (SliderValue)
type SliderPart; interface SliderRootOwnProps<V> // color, handleShape, size, orientation, tokens,
                                         // min, max, step, largeStep, minStepsBetweenThumbs,
                                         // centered, stops, valueIndicator, disabled, readOnly,
                                         // invalid, name, form, id, ids, value, defaultValue,
                                         // onValueChange, testId, unstyled
SLIDER_ROOT_PROPS; SLIDER_INPUT_LABEL_PROPS; // aria-label, -labelledby, -describedby, -valuetext
sliderSelection(props, percents);        // the placing tokens from the thumbs' percents
sliderTrackTokens(percents, centered);   // value, activeStart, activeEnd, startGap, endGap
sliderThumbTokens(percent); sliderMarkerTokens(percent, active); // a thumb's, a stop's own
sliderStops(stops, range); sliderStopActive(value, values, props);
sliderMachineProps(props, machineId);    // the root is also Zag's control
sliderControllableProps(controllable);   // lists for Zag, the owner's shape back
sliderValues(value); sliderValueShape(values, given);
sliderNativeDefault(resetsTo, min);      // "20,60": a reset shows the default, else min

// Card (no machine)
type CardPart; interface CardRootOwnProps // variant, interactive, padded, actionsAlign, tokens,
                                         // disabled, testId, unstyled
CARD_ROOT_PROPS; cardElement({ href, as }); // "a" with an href, else as, else "div"
isInteractiveCard(props, element);       // interactive, else a link or a button
cardSelection(props, element); cardRootProps(props, element); // a button's type; disabled
CardContentProps<Node>; CARD_CONTENT_PROPS; // media, avatar, headline, subhead, headerAction,
                                         // supportingText, actions, footer
cardLayout(props, element);              // { sections, actionArea, headerOutside, header,
                                         //   supportingText }: the action moves to the action
                                         //   area only beside actions or a header action
cardEntryActive(rootInteractive)(entry); // the root's entry while Root acts, the action area's else

// App bar: no machine; it follows the scroll offset under it
type AppBarPart; type AppBarSize; type AppBarScrollBehavior; // "pinned" | "collapse"
interface AppBarRootOwnProps             // size, centered, tokens, scrollBehavior, scrollOffset,
                                         // scrolled, collapsed, search, testId, unstyled
APP_BAR_ROOT_PROPS; APP_BAR_CONTENT_PROPS; // leading, headline, subtitle, trailing, searchBar, mirrorLeading
appBarScrollState(offset, { size, behavior, previous }); // { scrolled, collapsed }, with hysteresis
appBarDrawnState(props, fromOffset);     // the owner's scrolled/collapsed win
appBarContentLast(props, state);         // an expanded flexible bar renders its content last
appBarSelection(props, state);           // collapsed and search select the small size
isFlexibleAppBar(size); APP_BAR_COLLAPSE_OFFSET; APP_BAR_AT_REST;
// dom: subscribeScroll(target, onOffset); scrollOffsetOf(target); type ScrollTarget

// Search bar: the text field machine
type SearchBarPart; interface SearchBarRootOwnProps // tokens, disabled, required, readOnly,
                                         // placeholder, name, form, id, ids, value, …
SEARCH_BAR_ROOT_PROPS; SEARCH_BAR_INPUT_PROPS; SEARCH_BAR_CONTENT_PROPS; // leading, trailing, mirror*
searchBarSelection(props); searchBarMachineProps(props); // the placeholder is the input's own

// Ripple: pureform's ripple machine
type RipplePart; interface RippleRootOwnProps // tokens, disabled, effect, centered,
                                         // allowPropagation, getSurfaceEl, id, testId, unstyled
RIPPLE_ROOT_PROPS; rippleSelection(props); rippleMachineProps(props); // effect → the machine's variant

// Single-part components: Root is the component
AVATAR_ROOT_PROPS; avatarSelection; avatarMachineProps(props); // id, onStatusChange (Zag's avatar)
avatarRootProps(props);                  // role img named by label, or hidden; AvatarContentProps: src, children
// List item swipe (components/list-item-swipe.ts): swipeOffsetOf, swipeSettlesOpen, swipeRestOffset,
// swipeKeyAction, swipeTokens, ListItemSwipeProps (revealed, defaultRevealed, onRevealedChange, swipeWidth)
// List item frame (components/list-item.ts): ListItemFrameOwnProps (the swipe props, actionColor), LIST_ITEM_FRAME_PROPS
BADGE_ROOT_PROPS; badgeSelection;      // size, placement
badgeRootProps(props);                   // role img named by label; a dot without one is hidden
MEDIA_ROOT_PROPS; mediaSelection;        // aspect, shape
SEPARATOR_ROOT_PROPS; separatorSelection; separatorRootProps(element); // role on anything but hr
SCRIM_ROOT_PROPS; scrimSelection;
FADE_THROUGH_ROOT_PROPS; fadeThroughSelection; // value names what's shown
fadeThroughPageProps(page);              // data-state open (entering) or closed (leaving, also aria-hidden and inert); none for the first page
SUPPORTING_TEXT_ROOT_PROPS; supportingTextSelection; // tone
TEXT_ROOT_PROPS; textSelection;          // textStyle, the preset's `style` group
ICON_ROOT_PROPS; iconSelection; iconRootProps(props); // role img named by label, or hidden
TOUCH_TARGET_ROOT_PROPS;

// Content
isPresent(node);                         // not undefined, null, or false
type IconOnlyName;                       // aria-label or aria-labelledby, required
hasAccessibleName(props); missingNameMessage(component);
```

A component's props are typed with these, so an app whose generated declarations register the
button gets `variant?: "filled" | "tonal" | …` on every binding's button.

### `@pureform/binding-core/dom`

```ts
systemReducedMotion(): boolean;
subscribeReducedMotion(onChange): () => void;  // calls at once, then on each change
readIconStyle(element): IconStyle;             // font-size, color, the FILL axis
observeIconStyle(element, onChange): () => void;
syncCheckedInput(input, checked);              // a native checkbox back to the machine's state
radioInputs(group): HTMLInputElement[];        // a radio group's native radios
syncRadioInputs(group, value);                 // the radios back to the group's value
setRadioDefaults(group, value);                // each radio's default, written only when it differs
syncTextInput(input, value);                   // a text input or text area back to its value
stackPositioner(positioner, surface): () => void; // the surface's z-index as the positioner's (the
                                               // dialog's), in the next frame; returns its cancel
slideIndicator(from, to): Animation | undefined; // the tabs' new indicator, in from the old one's
                                               // box (a Web Animation of transform, FLIP), timed
                                               // by its transform transition (design doc §9.10)
transformTiming(style); slideTransform(fromRect, toRect); // its timing and starting transform

// Runtime themes and overrides
themeCss(selector, { light, dark }): string;   // light vars, then dark ones under the scheme conditions
themeSelector("data-theme", "pf-1x2y3z");      // '[data-theme="pf-1x2y3z"]'
overrideVars({ "colors.primary": "red" }, registry); // { "--colors-primary": "red" }, the target's names
interface ThemeBlock { scope; vars; css }      // what a provider holds for a runtime theme
initialThemeBlock(theme, registry, { hydrate, server, existing }): ThemeBlock;
needsThemeLoad(block, hydrate): boolean;       // load the generator after mount?
generateThemeVars(theme, registry);            // sync, once the generator is loaded
loadThemeVars(theme, registry): Promise<ThemeSchemeVars>;
generatedBlock(theme, registry, vars): ThemeBlock;
serverThemeCss(scope): string | undefined;     // the server's block in the page (Solid's or React's)
THEME_BLOCK_ATTRIBUTE;                         // "data-pf-theme", on Solid's block
THEME_PRECEDENCE;                              // "pureform", React's precedence for the block
unloadedThemeMessage(theme);                   // the server rendered before the generator loaded
```

`syncCheckedInput` is for after a click: the browser toggles the input before the machine hears
of it, so a controlled checkbox whose owner ignores the change would otherwise show the toggle.

`observeIconStyle` re-reads after an attribute changes anywhere in the icon's component (its
`data-scope` root), after a transition there ends, and when the slot resizes.

### `@pureform/binding-core/interaction`

What happened to an interactive component, in Compose's terms (design doc §9.8). A component's
machine (`@pureform/machines`) emits interactions to the component's source; anything that draws
from them subscribes.

```ts
type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "virtual";
interface InteractionKinds {                   // open: apps augment it with prefixed kinds
    press: { id: number; origin: { x: number; y: number } | "center"; pointer: PointerKind };
    release: { id: number }; cancel: { id: number };
    hoverEnter: {}; hoverExit: {}; focus: { visible: boolean }; blur: {};
    dragStart: {}; dragStop: {};
}
type Interaction;                              // { type: K } & InteractionKinds[K], for every K
interface InteractionState { hovered; focused; focusVisible; pressed; dragged }
interface InteractionSource {
    readonly state: InteractionState;          // a new frozen object only when it changes
    subscribe((interaction, state, origin) => void): () => void;
}
interface MutableInteractionSource extends InteractionSource {
    emit(interaction, origin?): void;          // origin: the element or native view it happened on
}
createInteractionSource(): MutableInteractionSource;
createInteractionSources(): (key: string) => MutableInteractionSource; // one per key, made when first asked
IDLE_INTERACTION_STATE;
```

The state: a press holds until a `release` or `cancel` with its id; hover holds while more
enters than exits have come, and never during a touch press; focus from `focus` to `blur`; a drag
while more starts than stops have come. A kind it doesn't know (an app's) reaches subscribers and
changes nothing. An app adds a kind by augmenting the interface:

```ts
declare module "@pureform/binding-core/interaction" {
    interface InteractionKinds {
        "app:longPress": { id: number; duration: number };
    }
}
```

A source is always a value in every type; whether a component makes its own at mount or later
isn't promised (today: at mount on the client, none on the server).

### `@pureform/binding-core/indication`

The interface every indication implements, the web halves of the built-ins, and what the web
bindings share to wire them (design doc §9.8). Apps import the built-ins from their binding
(`@pureform/solid`, `@pureform/react`), which re-exports them.

```ts
interface Indication {
    readonly name: string;
    readonly tokens?: IndicationTokens;        // stateHoverOpacity, stateFocusOpacity, statePressedOpacity,
                                               // stateDraggedOpacity, focusIndicatorThickness,
                                               // focusIndicatorOuterOffset, focusIndicatorColor
    readonly layer?: boolean;                  // the surface holds a layer element
    readonly web?: (target: IndicationTarget, source: InteractionSource,
                    context: IndicationContext) => () => void; // after mount, before the first interaction
    readonly native?: NativeIndicationComponent; // (props: NativeIndicationProps) => …, React-free
}
interface IndicationTarget { trigger: HTMLElement; surface: HTMLElement; layer?: HTMLElement }
//   `layer` is found in the surface as it's read (`surfaceLayer`): read it when drawing
interface IndicationContext { centered; reducedMotion(); dir(); registry }
interface NativeIndicationProps { source; surface: { style; drawing? }; centered; reducedMotion; dir; registry }
defineIndication(indication): Indication;

// The built-ins' web halves
materialIndication(options?: { ripple?: "ink-well" | "ink-sparkle" | false }): Indication;
//   "material", layer: true, web: draws Material's ripple in the layer from the source's presses
//   (its controller made on the first press; touch waits out the scroll delay; none under reduced
//   motion). The same object for the same options. { ripple: false } has no layer and no web.
noIndication: Indication;      // "none": the four state-layer opacities at 0; keeps the focus indicator
DEFAULT_INDICATION;            // materialIndication()
rippleClasses(registry): { root?, ripple? } | undefined; // the registry's static `ripple` entry

// Tokens as the web writes them
providerIndicationOverrides(indication): ThemeOverrides | undefined;
//   theme-level paths: opacity.stateHover, …, sizes.focusIndicatorThickness, sizes.focusIndicatorOuterOffset
componentIndicationTokens(indication, providerColor): Record<string, string> | undefined;
//   the component's instance tokens: the providers' focusIndicatorColor, then the prop's tokens
indicationTokenValues(tokens); // lengths given as numbers become px, opacities percentages (0.08 → "8%")
dropsFocusIndicator(indication); droppedFocusIndicatorMessage(indication);

// What the web bindings share
indicationRoles(entries, part); // [{ entry, role: "trigger" | "surface" | "state" }], cached
surfaceLayer(surface): HTMLElement | undefined; // the surface's `:scope > [data-ripple-layer]`
class IndicationHost {          // one per component
    configure(indication, registry): void;
    instance(entry, source): IndicationInstance; // one per surface and source
}
class IndicationInstance {
    attach(role: "trigger" | "surface" | "state", element): () => void;
    subscribeForwarded(listener: (states: { hover; pressed }) => void): () => void;
}
```

The provider's `indication` (on `ProviderOptions`) resolves through nesting like `motion`:
`ProviderState.indication` is the nearest one, and `ProviderState.focusIndicatorColor` the
nearest indication's color, since the focus indicator's color has no theme-level token. Each
interactive component's contract takes `indication` and `interactionSource`
(`components/indication.ts`: `IndicationProps`, `InteractionSourceProps`, `InteractiveProps`,
`INTERACTIVE_PROPS`); a composite takes `indication` on Root and `interactionSource` per item.

A forwarded hover or press is one whose emit's origin isn't one of the surface's own elements
(its trigger, surface, or the element it marks states on): another component sharing the
source, or the app emitting with no element. Focus is never forwarded.

The bindings attach only the trigger, the surface, and the state element. The layer stays in the
markup (server HTML and hydration unchanged), but nothing tracks it as it mounts: the effect starts
once the trigger and surface are there, and the target's `layer` finds it in the surface when the
ripple draws, at a press. So a surface doesn't render again once its layer mounts.

### `@pureform/binding-core/usage`

Data for usage-based pruning (design doc §7), keyed by component subpath, the same in every
binding (`@pureform/solid/<key>`, `@pureform/react/<key>`):

```ts
COMPONENT_USAGE.select;
// { entries: { select: { variant: "variant", color: "color", density: "density" },
//              menu: { color: "color", density: "density" } } }
```

Each entry is a registry entry the component draws, with the variant groups its props pass to
the registry as given, by the prop that sets them (`text`'s `style` comes from `textStyle`).
A group left out is computed by the component (a FAB's `extended`, a dialog's `icon`, a select's
icons, a card's `interactive`) and keeps every value. Also: `BINDING_PACKAGES`,
`REGISTRY_HOOKS` (`useClasses`, `useStyles`, and React Native's `useComponentSlots` and
`useSelectedStyles` select; `useClassFactory`, `useLazyClassFactory`,
`useStyleFactory` hand out a factory), `ANATOMY_HOOK` (`useComponent`), and `PROVIDER`
(`PureformProvider` and its `defaults` prop). Every component with an indication entry also
draws `ripple`, the entry its surfaces' layer is styled with; `INDICATION` names the prop, the
hook (`useIndication`), and the built-ins, so the scan can drop the ripple when every indication
it sees has no layer.

**Keep it current:** a new component needs an entry, and a new group a component computes must
stay off its list. `usage.spec.ts` checks the subpaths against both bindings' exports, the listed
groups against the selection functions, the entries against the anatomies each component folder
uses (with `as={Button}`, and the anatomies of the components it renders, such as the list's list
items), and that no Solid or React source sets a listed group from anything but its own prop.

## Building and testing

- `task_run` `build` on `@pureform/binding-core`: Vite library build, five entries (`index`,
  `dom`, `interaction`, `indication`, `usage`), with declarations.
- `task_run` `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`),
  with type checks. A browser command, `emulateReducedMotion`, flips the media query
  (`src/testing/commands.ts`).

## Worth knowing

- **Themes:** a provider's own `theme` (a name from the config) becomes the registry's
  `themeAttributes(theme)` on its element, so the target decides the attribute (`data-theme`,
  `data-panda-theme`) and no binding hard-codes a selector. An inherited theme writes nothing:
  the ancestor's attribute already scopes it.
- **Runtime themes** (`RuntimeTheme` from `@pureform/styling`, such as `seedTheme` from
  `@pureform/material/runtime-theme`): the provider writes the theme attribute with the theme's
  scope, `pf-<hash>` of its input, and one `<style>` block with both schemes' vars under
  `[attr="pf-<hash>"]`. The decision of when to generate is shared:

    ```
    server                     generate (the generator must be loaded: preloadTheme)
    client, "reuse"            keep the server's block (serverThemeCss), generate nothing
    client, "regenerate"       generate if loaded, else keep the server's block and load
    client, no server block    generate if loaded, else load after mount
    theme changes              the same, for the new scope
    ```

- **Overrides** are a provider's own (inherited ones are on an ancestor's `style`), written as
  inline vars named by the registry's `vars`. An override changes its own var only: a token
  declared from it at the root (`--colors-brand: var(--colors-primary)`) keeps its value.
- **Train version check:** `@pureform/generate` passes the core train's version to
  `createRegistry`, and the providers call `trainVersionMismatch(registry)` in development; it
  returns a warning when `registry.version` differs from `@pureform/styling`'s `VERSION`. A
  registry made by hand, with no version, passes.
- **Reset reasons with Zag.** Zag's checkbox puts its state back to its value at creation during
  the form's `reset` event (the switch and radio group from `@pureform/machines` no longer do). `untilNextTask({ drop })` covers that
  moment: callbacks are marked `reason: "reset"` when uncontrolled (the value at creation is the
  default) and dropped when controlled (the binding reports the real default afterwards, through
  `during`).
- `warnOnce` dedupes by message for the page's life; the binding decides whether it's in
  development.
- Design doc: §5.3 (hooks), §5.6 and §5.7 (themes, runtime themes), §5.8 (motion), §5.9 (direction), §9.2 to §9.6 (parts, controllable
  state, forms, icons).

## Stepper

`components/stepper.ts`: `StepperRootOwnProps`, `STEPPER_ROOT_PROPS`, `stepperSelection`,
`stepperMachineProps` (Zag's `count`, `linear`, `isStepValid`, `orientation`, ids), `StepperItem`
(the ready-made's steps as data: `label`, `caption`, `icon`, `content`, `error`, `editable`,
`disabled`), `stepperTriggerProps` (no `aria-controls` for a step with no content),
`stepperTriggerDisabled` (disabled, or done and not `editable`) and `stepperIndicator` (what the
indicator shows: an error, a check, the icon or the number).

## Page transitions

`components/page-transition.ts` holds the pages the fade through and the horizontal shared axis
keep in every binding: `startPages(key)`, `changePages(pages, key, { direction, keepLeaving })`
(the shown page leaves, the new one enters; a page still leaving goes at once unless
`keepLeaving`, which the fade through sets), `settlePage(pages, key, state)` (once a page's
motion ends: a leaving page goes, an entering one becomes current), `pagesLeaving`,
`pagesMoving`, `keepContents(contents, pages, key, content)` (each page's content as it last
was), `LEAVING_PAGE_PROPS` (`inert`, `aria-hidden`) and `pageRootProps(pages)`
(`data-transitioning` while a page leaves, which clips the root so a taller old page doesn't
spill). `PageTransitionProps` (`transition: "none" | "fadeThrough" | "sharedAxis"`,
`transitionScrim`) is on the ready-made tabs' and stepper's content props. `/dom`'s
`whenAnimationsEnd(element, done)` tells a web binding when a page's motion has ended.

## Horizontal shared axis

`components/horizontal-shared-axis.ts`: `HorizontalSharedAxisRootOwnProps` (`index`, `scrim`, off
by default: Compose draws its scrim only behind predictive back), `HORIZONTAL_SHARED_AXIS_ROOT_PROPS`,
`horizontalSharedAxisSelection`, `sharedAxisChange` (the page transition's change, the way
`sharedAxisDirection` says: forward to a higher index, at most two pages),
`sharedAxisPageProps` (`data-state`, `data-direction`, a leaving page `inert` and `aria-hidden`)
and `sharedAxisScrimProps`. `SHARED_AXIS_SLIDE_FRACTION` and `SHARED_AXIS_FADE` give React
Native, which moves the pages in code, the slide and the default fade the web's keyframes and
tokens hold (an instance's `slideSpring`, `fadeDuration` and `fadeDelay` tokens override them).

## Carousel

`components/carousel.ts`: `CarouselRootOwnProps`, `CAROUSEL_ROOT_PROPS`, `carouselSelection`,
`carouselMachineProps`, `CarouselItem`, and the layout: `carouselKeylines(layout, viewport, gap,
itemWidth?)` (Material's sizes at rest) and `carouselItemSizes(options, metrics)` (each item's
slot, mask width and mask offset at a scroll position; the keylines turn round near the end so the
last item ends large). `CAROUSEL_SIZES` holds the fixed small (40 to 56) and large (186) widths.
The `dom` subpath adds `observeCarouselRow`, `measureCarouselRow` and `carouselRowPadding` (the
`padding` token's var, for Zag's `padding` prop, so the scroll padding renders on the server).

## Accordion and tree

`components/accordion.ts`: `AccordionRootOwnProps`, `ACCORDION_ROOT_PROPS`, `AccordionItem` (the
ready-made's data: `value`, `title`, `description`, `leading`, `content`), `accordionSelection`,
`accordionMachineProps` (an item collapses from its header by default) and `accordionItemProps`.
`components/tree.ts`: `TreeRootOwnProps`, `TREE_ROOT_PROPS`, `TreeNode` (the nodes as data, a branch
by its `children`), `treeSelection`, `treeMachineProps`, `treeControlProps` (the bindings'
`expandedValue` and `selectedValue` under Zag's names), `treeCollectionOptions` (Zag's tree
collection over the data), `treeNaming` (Zag's tree props without a label that isn't there) and
`isTreeBranch`. `GLYPH_PATHS.expand` is the chevron both show.

## Grid list

`components/grid-list.ts`: `GridListRootOwnProps`, `GRID_LIST_ROOT_PROPS`, `gridListSelection`
(`columns`, `gutter`, `aspect`, `tokens`), `gridListRootProps` (`role="list"`) and
`gridListTileProps` (`role="listitem"`). No machine and no state.
