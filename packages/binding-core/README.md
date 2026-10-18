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

// Chip, icon button, FAB: on the button machine (buttonMachineProps, or fabMachineProps)
CHIP_ROOT_PROPS; chipSelection(props);
ICON_BUTTON_ROOT_PROPS; ICON_BUTTON_CONTENT_PROPS; iconButtonSelection(props); // sets `toggle`
isToggle(props);                         // toggle ?? (selected or defaultSelected given)
FAB_ROOT_PROPS; FAB_CONTENT_PROPS; fabSelection(props); fabMachineProps(props); // never a toggle

// Text field and text area: on pureform's text field machine; one contract for both
interface TextFieldRootOwnProps          // variant, color, density, leadingIcon, trailingIcon (room
                                         // for the icons), tokens, disabled, invalid, error,
                                         // validate, required, readOnly, placeholder, name, form,
                                         // id, ids, value, defaultValue, onValueChange, testId, unstyled
interface TextAreaRootOwnProps           // the same, and autoGrow
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
interface SelectItem { value; label; disabled? }
SELECT_ROOT_PROPS; SELECT_INPUT_LABEL_PROPS; SELECT_CONTENT_PROPS; SELECT_COLLECTION;
selectSelection(props);                  // trailingIcon always on: the arrow
selectMenuSelection(props);              // the menu's color and density
toZagValue(value); fromZagValue(list);   // one value or null <-> Zag's list
selectValueProps(controllableMachineProps); selectMachineProps(props, fieldsetDisabled);
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
interface MenuRootOwnProps               // color, density, tokens, onSelect, closeOnSelect, loopFocus,
                                         // typeahead, positioning, aria-label, ids, open,
                                         // defaultOpen, onOpenChange, testId, unstyled
interface MenuItem<Node> { value; label; valueText?; disabled?; closeOnSelect?; leadingIcon?;
                           trailingIcon?; trailingText?; mirrorLeadingIcon?; mirrorTrailingIcon? }
MENU_ROOT_PROPS; MENU_CONTENT_PROPS;     // trigger, items
menuSelection(props); menuMachineProps(props); // placement "bottom-start" unless given
menuItemProps(item);                     // Zag's item props from an item's data

// Tooltip: Zag's tooltip; tooltipOverlayAnatomy
interface TooltipRootOwnProps            // variant, tokens, openDelay, closeDelay, disabled,
                                         // interactive, closeOnEscape, closeOnClick, positioning,
                                         // ids, open, defaultOpen, onOpenChange, testId, unstyled
TOOLTIP_ROOT_PROPS; TOOLTIP_CONTENT_PROPS; // trigger, supportingText, subhead, actions
tooltipSelection(props); isRichTooltip(props);
tooltipMachineProps(props);              // a rich tooltip is interactive; placement "bottom"

// Dialog: Zag's dialog; dialogOverlayAnatomy, and dialogBackdropAnatomy (the scrim)
type DialogPart                          // the overlay's parts, and "backdrop"
interface DialogRootOwnProps             // icon (the variant), tokens, modal, role,
                                         // closeOnInteractOutside, closeOnEscape, restoreFocus,
                                         // initialFocusEl, finalFocusEl, aria-label, ids (headline,
                                         // body: Zag's title and description), open, defaultOpen,
                                         // onOpenChange, testId, unstyled
DIALOG_ROOT_PROPS; DIALOG_CONTENT_PROPS; // trigger, mirrorIcon, headline, body, actions (and icon)
dialogSelection(props); dialogMachineProps(props);
dialogPositionerLayout(present);         // hidden once gone; fixed over the viewport, centering
dialogBackdropLayout(present);           // hidden once gone; the scrim fixed over the viewport

// Snackbar: pureform's snackbar machine; the generated snackbarAnatomy
interface SnackbarRootOwnProps           // tokens, duration, onAction, id, ids, open, defaultOpen,
                                         // onOpenChange ({ open, reason }), testId, unstyled
SNACKBAR_ROOT_PROPS; SNACKBAR_CONTENT_PROPS; // supportingText, action, closeLabel, closeIcon
snackbarSelection(props); snackbarMachineProps(props);

// Tabs: Zag's tabs; tabsCompositeAnatomy (root, list, tab, icon, label, indicator, content)
interface TabsRootOwnProps               // variant, icon (the variant), color, tokens, activationMode,
                                         // loopFocus, disabled, id, ids, value, defaultValue,
                                         // onValueChange, testId, unstyled
interface TabsItem<Node> { value; label; icon?; mirrorIcon?; disabled?; content? }
TABS_ROOT_PROPS; TABS_CONTENT_PROPS;     // items
TABS_LIST_LABEL_PROPS;                   // aria-label, aria-labelledby: on the tab list
tabsSelection(props); tabsMachineProps(props); tabsItemProps(item, tabsDisabled);
tabsTriggerProps(p, { controls });       // without data-ssr; without aria-controls when no panel
tabsDefaultValue(props, items);          // the ready-made's: the first enabled tab, unless given
tabsHaveIcons(items); tabsHavePanels(items);

// Navigation bar and rail: pureform's navigation machine; their generated anatomies
type NavigationComponent = "navigationBar" | "navigationRail"; type NavigationPart;
interface NavigationRootOwnProps<C>      // color, tokens, disabled, id, ids, value, defaultValue,
                                         // onValueChange, testId, unstyled
interface NavigationItemOwnProps { value; href?; disabled? }
interface NavigationItem<Node> extends NavigationItemOwnProps { label; icon?; mirrorIcon? }
NAVIGATION_ROOT_PROPS; NAVIGATION_ITEM_PROPS; NAVIGATION_CONTENT_PROPS; // items
navigationSelection(props); navigationMachineProps(props);
navigationItemElement(item);             // "a" with an href, else "button"
navigationItemMachineProps(item);        // aria-current "page" for a link, "true" for a button
navigationItemElementProps(item, disabled); // a button's type and disabled

// List item (no machine) and list (listAnatomy: an unstyled ul, an li per item)
interface ListItemRootOwnProps           // lines, interactive, density, color, tokens, selected,
                                         // disabled, testId, unstyled
LIST_ITEM_ROOT_PROPS; LIST_ITEM_CONTENT_PROPS; // headline, overline, supportingText, leading,
                                         // trailing, trailingText, mirrorLeading, mirrorTrailing
listItemElement({ href, as });           // "a" with an href, else as, else "div"
listItemSelection(props, element);       // interactive defaults to a link or a button
listItemRootProps(props, element);       // aria-current while selected; disabled or aria-disabled
listItemLines(content);                  // one, two (overline or supporting text), three (both)
interface ListRootOwnProps               // density, color, tokens (every item's defaults), testId
interface ListItemData<Node>             // a list item's content, variants, value, href,
                                         // selected, disabled, testId
LIST_ROOT_PROPS; LIST_CONTENT_PROPS;     // items
listItemVariants(list, item);            // the item's own over the list's; reads named props only

// Linear and circular progress (no machine)
type ProgressComponent = "linearProgress" | "circularProgress";
type LinearProgressPart; type CircularProgressPart;
interface ProgressRootOwnProps<C>        // indeterminate, color, tokens, value, min, max, testId,
                                         // unstyled
PROGRESS_ROOT_PROPS;
isIndeterminate(props);                  // indeterminate, else no value (undefined or null)
progressPercent(props);                  // the value as a clamped percentage of min to max
progressSelection(props);                // the value token from the percentage, unless indeterminate
progressRootProps(props);                // role progressbar, aria-valuemin/max, aria-valuenow

// Slider: pureform's slider machine over a native range input
type SliderPart; interface SliderRootOwnProps // color, tokens, min, max, step, disabled,
                                         // readOnly, invalid, name, form, id, ids, value,
                                         // defaultValue, onValueChange, testId, unstyled
SLIDER_ROOT_PROPS; SLIDER_INPUT_LABEL_PROPS; // aria-label, -labelledby, -describedby, -valuetext
sliderSelection(props, percent);         // the value token from the machine's percent
sliderMachineProps(props); sliderNativeDefault(resetsTo, min); // a reset shows the default, else min

// Card (no machine)
type CardPart; interface CardRootOwnProps // variant, interactive, tokens, disabled, testId, unstyled
CARD_ROOT_PROPS; cardElement({ href, as }); // "a" with an href, else as, else "div"
isInteractiveCard(props, element);       // interactive, else a link or a button
cardSelection(props, element); cardRootProps(props, element); // a button's type; disabled

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
AVATAR_ROOT_PROPS; avatarSelection; avatarElement({ src, as }); // img with a src, else span
avatarRootProps(props, element);         // src and alt; else role img named by label, or hidden
MEDIA_ROOT_PROPS; mediaSelection;        // aspect, shape
SEPARATOR_ROOT_PROPS; separatorSelection; separatorRootProps(element); // role on anything but hr
SCRIM_ROOT_PROPS; scrimSelection;
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
