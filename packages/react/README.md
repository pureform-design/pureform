# @pureform/react

pureform's bindings for React 19: the provider, the style registry's hooks, and the helpers
components build their parts from. It mirrors `@pureform/solid`'s API with React's idioms
(values instead of accessors, `useMemo`, `use()` for lazy entries, `useId`). The components
themselves (button, checkbox, …) come next and are each "wire the anatomy to a machine to the
registry". Machines run through `@zag-js/react`'s `useMachine` directly.

## Where it sits

```
@pureform/styling   anatomy   machines   binding-core     (framework-free)
        │              │          │            │
        └──────────────┴────┬─────┴────────────┘
                            │
                    @pureform/react  ──► @zag-js/react
                            │
                 react 19, react-dom 19    (peers)
```

Anything that works without React lives in `@pureform/binding-core` (shared with
`@pureform/solid`, and later `@pureform/react-native`); this package adds context, memos,
effects, and rendering. `@pureform/styling` is a peer, so the app's generated registry and the
binding share one copy. See the [design doc](../../docs/design/component-architecture.md), §3,
§5, and §9.

## Architecture

| Module            | What it holds                                                                          |
| ----------------- | -------------------------------------------------------------------------------------- |
| `provider.tsx`    | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`          |
| `classes.ts`      | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                 |
| `parts.tsx`       | `useComponent` (a component's classes and parts), `slotPartProps`, `mergeRefs`         |
| `props.ts`        | React's rules for merging a part's props: one `className` string (`cx`), style objects |
| `controllable.ts` | `useControllable`: controlled and uncontrolled props mapped onto a Zag machine         |
| `form.ts`         | `useFormReset`, `useFieldsetDisabled`                                                  |
| `motion.ts`       | `useReducedMotion`                                                                     |
| `icon-style.ts`   | `useIconStyle`, and the context icon parts provide                                     |
| `env.ts`          | `isDev` (`process.env.NODE_ENV`, left for the app's bundler) and `isServer`            |

```
Root ── useComponent(anatomy, { selection, testId, unstyled }) ──► useClasses ──► registry entry
  │          │
  │          └─ scope.render(part, { element, as, machine, states, props })
  │                 merges: machine props → data-scope/data-pf-part/data-testid → data-pf-* states
  │                         → registry class + token style → provider slotProps → user props
  └─ context { scope, api } ──► Label, Icon, … call scope.render with their part
```

The merge order comes from binding-core's `partSources`, the rules from `combineProps`; this
package only says how React joins classes (into `className`, `clsx`-style) and styles.

## Public API

The entry starts with `"use client"`: every export is a hook or a component.

### Provider

```tsx
<PureformProvider
    registry={registry} // from .pureform, or a fake one in tests
    dir="rtl" // written on its element, passed to machines; "ltr" at the root
    motion="reduce" // "system" | "reduce" | "full"; writes data-pf-motion unless "system"
    defaults={{ button: { variant: "tonal" } }}
    slotProps={{ button: { label: { className: "caps" } } }}
    theme="teal"
    overrides={{}}
    hydrate="reuse" // carried, applied in p5b
>
    <App />
</PureformProvider>
```

It renders a `div` with `display: contents` holding `dir` and `data-pf-motion`. Other props
(`className`, `style`, `data-*`, `ref`) go on that element. Nested providers inherit what they
leave out. Its state is memoized on the options' identity, so keep `defaults`, `slotProps`, and
`overrides` stable (module constants or `useMemo`).

| Hook             | Returns                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `usePureform()`  | `PureformState`: the resolved provider state, the root's with none   |
| `useRegistry()`  | `AnyRegistry`; throws when no provider has a registry                |
| `useDirection()` | `"ltr" \| "rtl"`: pass it to every machine as `dir`                  |
| `useMotion()`    | `MotionSetting`: the nearest `"reduce"` or `"full"`, else `"system"` |

### Registry hooks

```ts
useClasses(name, selection): ClassSlots<N>                   // over the provider's defaults
useClassFactory(name: StaticComponentName): ClassFactory<N>  // throws for a lazy entry
useLazyClassFactory(name: LazyComponentName): ClassFactory<N>
```

`useClasses` takes the selection as a plain object, new every render if you like: it's memoized
on the selection's value (`selectionSignature`). A lazy entry suspends to the nearest
`<Suspense>` with `use(entry.load())`, on the server too, so the server renders its classes and
hydration waits for the chunk. `useLazyClassFactory` is client-only: on the server it throws, so
its boundary renders the fallback there (and warns in development).

### Building a component

```tsx
const ButtonContext = createContext<{ scope: ComponentScope<typeof buttonAnatomy>; api: … } | null>(null);

export function Root(props: RootProps) {
    const { variant, tokens, disabled, as, testId, unstyled, ...rest } = props; // minus the controllable props
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, { id, dir, disabled, ...selected.machineProps });
    const api = button.connect(service, normalizeProps);
    const scope = useComponent(buttonAnatomy, { selection: { variant, tokens }, testId, unstyled });
    return (
        <ButtonContext value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </ButtonContext>
    );
}

export function Icon({ mirror, ...props }: PartProps & { mirror?: boolean }) {
    const { scope, api } = use(ButtonContext)!;
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        props,
    });
}
```

The full example, with a ready-made `Button` over `slotPartProps`, is
`src/__fixtures__/button.tsx`.

- `scope.part(part, options)` returns the merged props to spread yourself; `scope.render` also
  renders the element (`as` overrides it), passes the user's `ref` (merged with `options.ref`
  through `mergeRefs`) and `children`, and for an icon part (`mirror: true` in the anatomy)
  provides its element to `useIconStyle()`.
- **State attributes:** `states` sets only `STATE_ATTRIBUTES` (`data-pf-hover`, `data-pf-active`,
  `data-pf-dragging`, `data-pf-filled`, `data-pf-mirror`), `""` when on and absent when off.
  Everything else (`aria-checked`, `aria-pressed`, `:disabled`, …) comes from the machine's
  props or the native element.
- **Test ids:** `pf-<scope>-<part>` by default; Root's `testId` is a prefix (`save` →
  `save-root`) or ids by part.
- `unstyled` (Root's, `true` or per part, or a part's own) drops the registry's class and token
  style for that part. Parts outside the AST's slots never get registry classes.
- Ready-made components take `className` (any `clsx` value), `style`, and `slotProps` keyed by
  part; `slotPartProps(props, part)` turns them into one part's props, and `testId` and
  `unstyled` go to Root whole.

### Controllable state and forms

```ts
const checked = useControllable("Checkbox", "checked", props);
// checked.machineProps: { checked, defaultChecked (read once), onCheckedChange (stable) }
const [input, setInput] = useState<HTMLInputElement | null>(null); // ref={setInput}
useFormReset(input, {
    resetsTo: checked.resetsTo === true, // controlled value, else the default
    onBeforeReset: checked.beforeReset,
    onReset: () =>
        checked.reset(() =>
            service.send({
                type: "CHECKED.SET",
                checked: checked.defaultValue ?? false,
                isTrusted: true,
            }),
        ),
});
const fieldsetDisabled = useFieldsetDisabled(input); // OR it into the machine's disabled
```

- A defined value prop controls the state; switching between defined and `undefined` warns once
  per instance in development.
- A form reset calls the callback with `reason: "reset"`. Zag's own reset (during the `reset`
  event, to the value at creation) is reported when uncontrolled and dropped when controlled;
  the binding then sends the real default.
- `useFormReset` writes the input's native default after every commit, since Zag's hidden-input
  props write the current state as the default.

### Motion and icons

- `useReducedMotion(): boolean`: the nearest `"reduce"` (true) or `"full"` (false), else the
  system's `prefers-reduced-motion` (`useSyncExternalStore`; `false` on the server and while
  hydrating).
- `useIconStyle(): IconStyle`: inside an icon part, its measured `{ size, color, filled }`,
  following the component's state; elsewhere `{ size: undefined, color: "currentColor",
filled: false }`.
- `cx(...values)` (from binding-core) joins class values as `clsx` does.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/index.mjs` with declarations; React, Zag, and the
  pureform packages stay external, and `process.env.NODE_ENV` is left for the app's bundler.
- `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`) with React
  Testing Library, and type checks. The specs use a fake registry
  (`src/__fixtures__/registry.ts`) and the example button. Interactions go through
  `vitest/browser`'s `userEvent` wrapped in `act` (`src/testing/render.tsx`).

## Worth knowing

- **Stubs:** `theme`, `overrides`, and `hydrate` do nothing yet (p5b). The development warning for
  a stale glue version calls `trainVersionMismatch`, which finds nothing until p4a records it.
- Server rendering isn't exercised by these tests (p3c's hydration suite).
- `useIconStyle` doesn't see a style that changes by a pseudo-class alone (`:hover`) with no
  transition.
