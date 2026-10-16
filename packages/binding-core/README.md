# @pureform/binding-core

The framework-free half of pureform's bindings. Everything `@pureform/solid` and
`@pureform/react` (and later `@pureform/react-native`) would otherwise write twice lives here:
what `PureformProvider` takes and how nested providers combine, selections over the provider's
defaults, a part's state attributes and how its props merge, controllable state, reduced
motion, and an icon slot's measured style.

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

| Module            | What it holds                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `provider.ts`     | `ProviderOptions`, `ProviderState`, `resolveProvider` (nesting), `providerAttributes`, `requireRegistry`                |
| `selection.ts`    | `withDefaults`: a selection over the provider's defaults; `selectionSignature` to memoize on one                        |
| `entries.ts`      | `classEntry` (the provider registry's entry), and the class hooks' errors about lazy entries                            |
| `parts.ts`        | `partSources` (a part's props, in merge order), `stateAttributes`, `partClasses`, `forSlot`, `isUnstyled`, `isIconPart` |
| `props.ts`        | `combineProps`: one part's props from several sources, with the binding's rules for classes and styles                  |
| `class-names.ts`  | `cx`: a `clsx`-compatible class joiner, for bindings whose class prop is a string (React)                               |
| `controllable.ts` | `Controllable<N, T>`, the controlled/uncontrolled warning, and `reason: "reset"` tracking                               |
| `motion.ts`       | `resolveReducedMotion`, `REDUCED_MOTION_QUERY`                                                                          |
| `icon-style.ts`   | `IconStyle`, `DEFAULT_ICON_STYLE`                                                                                       |
| `version.ts`      | `trainVersionMismatch`, a stub until `@pureform/generate` records the train's version (p4a)                             |
| `warn.ts`         | `warnOnce`                                                                                                              |
| `dom.ts`          | The DOM half, on its own subpath: the system's reduced-motion preference, and measuring an icon slot                    |

The root entry uses no DOM API, so React Native can import it.

## Public API

### `@pureform/binding-core`

```ts
// Provider
type Direction = "ltr" | "rtl";
interface ProviderOptions<P> {           // P: the binding's props for one part
    registry?; dir?; motion?; defaults?; slotProps?;
    theme?; overrides?; hydrate?;        // carried, applied by runtime themes (p5b)
}
interface ProviderState<P> { registry; dir; motion; defaults; slotProps; theme; overrides; hydrate }
const ROOT_PROVIDER: ProviderState<never>;           // ltr, system, reuse, nothing else
resolveProvider(parent, own, merge?): ProviderState<P>;
providerAttributes(own, state): { dir; "data-pf-motion": "reduce" | "full" | undefined };
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

### `@pureform/binding-core/dom`

```ts
systemReducedMotion(): boolean;
subscribeReducedMotion(onChange): () => void;  // calls at once, then on each change
readIconStyle(element): IconStyle;             // font-size, color, the FILL axis
observeIconStyle(element, onChange): () => void;
```

`observeIconStyle` re-reads after an attribute changes anywhere in the icon's component (its
`data-scope` root), after a transition there ends, and when the slot resizes.

## Building and testing

- `task_run` `build` on `@pureform/binding-core`: Vite library build, two entries (`index`,
  `dom`), with declarations.
- `task_run` `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`),
  with type checks. A browser command, `emulateReducedMotion`, flips the media query
  (`src/testing/commands.ts`).

## Worth knowing

- **Stubs:** `theme`, `overrides`, and `hydrate` are carried through nesting but nothing applies
  them (p5b). `trainVersionMismatch` always returns `undefined` until p4a records the glue's
  version.
- **Reset reasons with Zag.** Zag's checkbox, switch, and radio group put their state back to
  its value at creation during the form's `reset` event. `untilNextTask({ drop })` covers that
  moment: callbacks are marked `reason: "reset"` when uncontrolled (the value at creation is the
  default) and dropped when controlled (the binding reports the real default afterwards, through
  `during`).
- `warnOnce` dedupes by message for the page's life; the binding decides whether it's in
  development.
- Design doc: §5.3 (hooks), §5.8 (motion), §5.9 (direction), §9.2 to §9.6 (parts, controllable
  state, forms, icons).
