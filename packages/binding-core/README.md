# @pureform/binding-core

The framework-free half of pureform's bindings. Everything `@pureform/solid` and
`@pureform/react` (and later `@pureform/react-native`) would otherwise write twice lives here:
what `PureformProvider` takes and how nested providers combine, runtime themes and token
overrides as CSS, selections over the provider's defaults, a part's state attributes and how its props merge, controllable state, reduced
motion, an icon slot's measured style, and each component's contract: the props Root takes and
how they map onto the selection and the machine.

## Where it sits

```
@pureform/core, styling, anatomy        (framework-free; types, registry, part names)
                 │
@pureform/binding-core   (this package; no framework)
                 │
@pureform/solid, @pureform/react, @pureform/react-native   (hooks and components)
```

It's in the core train (`cog.toml`'s `core-train`). A binding adds only what needs its
framework: context, memos, effects, and rendering.

## Architecture

| Module            | What it holds                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.ts`     | `ProviderOptions`, `ProviderState`, `resolveProvider` (nesting), `providerAttributes`, `themeAttributes`, `requireRegistry`                                                                                                            |
| `selection.ts`    | `withDefaults`: a selection over the provider's defaults; `selectionSignature` to memoize on one                                                                                                                                       |
| `entries.ts`      | `classEntry` (the provider registry's entry), and the class hooks' errors about lazy entries                                                                                                                                           |
| `parts.ts`        | `partSources` (a part's props, in merge order), `stateAttributes`, `partClasses`, `forSlot`, `isUnstyled`, `isIconPart`                                                                                                                |
| `props.ts`        | `combineProps`: one part's props from several sources, with the binding's rules for classes and styles                                                                                                                                 |
| `class-names.ts`  | `cx`: a `clsx`-compatible class joiner, for bindings whose class prop is a string (React)                                                                                                                                              |
| `controllable.ts` | `Controllable<N, T>`, the controlled/uncontrolled warning, and `reason: "reset"` tracking                                                                                                                                              |
| `components/`     | One file per component's contract (`button.ts`, `checkbox.ts`, `switch.ts`, `radio-group.ts`, `chip.ts`, `icon-button.ts`, `fab.ts`), what ready-made components share about content (`content.ts`), and `VariantProp` (`variants.ts`) |
| `motion.ts`       | `resolveReducedMotion`, `REDUCED_MOTION_QUERY`                                                                                                                                                                                         |
| `icon-style.ts`   | `IconStyle`, `DEFAULT_ICON_STYLE`                                                                                                                                                                                                      |
| `version.ts`      | `trainVersionMismatch`: the glue's recorded train version against the running `@pureform/styling`'s `VERSION`                                                                                                                          |
| `warn.ts`         | `warnOnce`                                                                                                                                                                                                                             |
| `web-theme.ts`    | Runtime themes' `<style>` blocks, overrides as vars, and when to generate or keep the server's block (on `/dom`)                                                                                                                       |
| `dom.ts`          | The web half, on its own subpath: reduced motion, measuring an icon slot, checkbox and radio inputs kept in step, `web-theme.ts`                                                                                                       |

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
partClasses(anatomy, part, slots, unstyled?): SlotClasses | undefined;
partSources({ anatomy, part, machine, states, testId, unstyled, partUnstyled, classes, slotProps, props })
    // [machine, part attributes, state attributes, registry, provider slotProps, user props]
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

## Building and testing

- `task_run` `build` on `@pureform/binding-core`: Vite library build, two entries (`index`,
  `dom`), with declarations.
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
