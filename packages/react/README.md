# @pureform/react

pureform's bindings for React 19: the provider, the style registry's hooks, the helpers
components build their parts from, and the components themselves (button and checkbox so far).
It mirrors `@pureform/solid`'s API with React's idioms (values instead of accessors, `className`
instead of `class`, `useMemo`, `use()` for lazy entries, `useId`). Each component wires its
anatomy to a machine to the registry, and comes ready-made and as compound parts. Machines run
through `@zag-js/react`'s `useMachine`.

## Where it sits

```
@pureform/styling   anatomy   machines   binding-core     (framework-free)
        │              │          │            │
        └──────────────┴────┬─────┴────────────┘
                            │
                    @pureform/react  ──► @zag-js/react, @zag-js/core (types)
                            │
                 react 19, react-dom 19    (peers)
```

Anything that works without React lives in `@pureform/binding-core` (shared with
`@pureform/solid`, and later `@pureform/react-native`); this package adds context, memos,
effects, and rendering. `@pureform/styling` is a peer, so the app's generated registry and the
binding share one copy. See the [design doc](../../docs/design/component-architecture.md), §3,
§5, and §9.

## Architecture

| Module            | What it holds                                                                           |
| ----------------- | --------------------------------------------------------------------------------------- |
| `provider.tsx`    | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`           |
| `classes.ts`      | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                  |
| `parts.tsx`       | `useComponent` (a component's classes and parts), `slotPartProps`, `mergeRefs`          |
| `props.ts`        | React's rules for merging a part's props: one `className` string (`cx`), style objects  |
| `controllable.ts` | `useControllable`: controlled and uncontrolled props mapped onto a Zag machine          |
| `form.ts`         | `useFormReset`, `useFieldsetDisabled`                                                   |
| `motion.ts`       | `useReducedMotion`                                                                      |
| `icon-style.ts`   | `useIconStyle`, and the context icon parts provide                                      |
| `part-context.ts` | `createPartContext`: the context Root shares with its parts, and the error outside Root |
| `machine.ts`      | `useMachine`: Zag's, typed so a component can pass its optional props through           |
| `button/`         | `@pureform/react/button`: `button.tsx` (the component), `index.ts`, `button.spec.tsx`   |
| `checkbox/`       | `@pureform/react/checkbox`: the same layout                                             |
| `env.ts`          | `isDev` (`process.env.NODE_ENV`, left for the app's bundler) and `isServer`             |

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

Every entry starts with `"use client"`: every export is a hook or a component.

### Components

One subpath per component, so an app's bundle keeps only what it imports. Each export is the
ready-made component, with its compound parts as properties. The API, parts, DOM, and behavior
match `@pureform/solid`'s; one shared browser suite runs against both.

```tsx
import { Button } from "@pureform/react/button";
import { Checkbox } from "@pureform/react/checkbox";

<Button label="Save" icon={<SaveIcon />} variant="tonal" type="submit" />
<Button
    label="Bold"
    defaultSelected={false} // a toggle: aria-pressed, onSelectedChange({ selected })
    className={{ root: ["wide", { busy: saving }], label: "caps" }}
    style={{ root: { marginTop: 8 } }}
    testId="bold" // bold-root, bold-label, …
    slotProps={{ icon: { title: "B" } }}
    unstyled={{ label: true }}
/>
<Button.Root variant="text" onClick={save}>
    <Button.TouchTarget />
    <Button.Icon mirror><ArrowIcon /></Button.Icon>
    <Button.Label>Next</Button.Label>
</Button.Root>

<Checkbox name="terms" aria-label="Accept the terms" defaultChecked />
<Checkbox checked={agreed} onCheckedChange={(d) => setAgreed(d.checked === true)} />
<Checkbox.Root ids={{ input: "terms" }} color="error" invalid>
    <Checkbox.TouchTarget />
    <Checkbox.Input />
    <Checkbox.Box>
        <Checkbox.CheckIcon />
        <Checkbox.IndeterminateIcon />
    </Checkbox.Box>
</Checkbox.Root>
```

| Component  | Parts (element)                                                                                      | Machine                     |
| ---------- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| `Button`   | `Root` (`button`), `TouchTarget`, `Icon`, `Label` (`span`)                                           | `@pureform/machines/button` |
| `Checkbox` | `Root` (`label`), `TouchTarget` (`span`), `Input` (`input`), `Box`, `CheckIcon`, `IndeterminateIcon` | Zag's checkbox              |

- **Root's props** are the variant groups (`color`, `variant`, …, typed from the app's registry),
  `tokens`, the machine's props (`disabled`, `type`, `name`, `value`, `form`, and the controllable
  `selected` or `checked`), `id` and `ids` (the machine finds its elements by id, so set them
  here rather than on a part), `testId`, `unstyled`, `as`, `ref`, and the element's own props.
  The lists live in `@pureform/binding-core` (`BUTTON_ROOT_PROPS`, `CHECKBOX_ROOT_PROPS`), shared
  with Solid.
- **Parts** take the element's props (and `ref`) and their own `unstyled`; `Button.Icon` takes
  `mirror`. A part outside its Root throws, naming both.
- **The ready-made** component takes Root's props, with `className`, `style`, and `slotProps`
  keyed by part. `Button` takes `label`, `icon` (the icon part renders only when given), and
  `mirrorIcon`. `Checkbox` puts `aria-label`, `aria-labelledby`, and `aria-describedby` on its
  input.
- **The checkbox is a `<label>`** around the native input, as Zag expects, so a click on its touch
  target toggles it. Name it with `aria-label`, or point a `<label htmlFor>` at `ids.input`;
  don't wrap it in another label. The input carries every native state the CSS reads
  (`:checked`, `:indeterminate`, `:disabled`, `aria-invalid`), and the form reset and fieldset
  rule are the binding's (below).
- **A controlled checkbox doesn't move** until its prop does: after a click, once Zag has sent the
  change, the input is put back to the last committed value (`syncCheckedInput`), and the
  owner's update, if any, then moves it with the machine.

### Provider

```tsx
<PureformProvider
    registry={registry} // from .pureform, or a fake one in tests
    dir="rtl" // written on its element, passed to machines; "ltr" at the root
    motion="reduce" // "system" | "reduce" | "full"; writes data-pf-motion unless "system"
    defaults={{ button: { variant: "tonal" } }}
    slotProps={{ button: { label: { className: "caps" } } }}
    theme="teal" // a named theme: the registry's themeAttributes("teal") on its element
    overrides={{}}
    hydrate="reuse" // carried, applied in p5b
>
    <App />
</PureformProvider>
```

It renders a `div` with `display: contents` holding `dir`, `data-pf-motion`, and its theme's
attributes. Other props (`className`, `style`, `data-*`, `ref`) go on that element. Nested
providers inherit what they leave out. Its state is memoized on the options' identity, so keep `defaults`, `slotProps`, and
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

The components above are the reference: `src/button/button.tsx` and `src/checkbox/checkbox.tsx`.
In short:

```tsx
const context = createPartContext<{ scope: ComponentScope<typeof buttonAnatomy>; api: … }>("Button");

function Root(props: ButtonRootProps) {
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, {
        id,
        dir,
        ...buttonMachineProps(props), // binding-core: the contract Solid shares
        ...selected.machineProps,
    });
    const api = button.connect(service, normalizeProps);
    const scope = useComponent(buttonAnatomy, {
        selection: buttonSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, BUTTON_ROOT_PROPS); // Root's own props stay off the element
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </context.Provider>
    );
}

function Icon({ unstyled, mirror, ...props }: ButtonIconProps) {
    const { scope, api } = context.use("Icon"); // throws outside Root
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}
```

`useMachine` is `machine.ts`'s, which lets each machine prop be `undefined`; `omitProps` is in
`props.ts`. `src/__fixtures__/button.tsx` is a smaller example the core specs use.

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

- `build`: Vite library build into `dist/index.mjs`, `dist/button.mjs`, and `dist/checkbox.mjs`
  (shared chunks beside them) with declarations; React, Zag, and the
  pureform packages stay external, and `process.env.NODE_ENV` is left for the app's bundler.
- `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`) with React
  Testing Library, and type checks. The specs use a fake registry
  (`src/__fixtures__/registry.ts`, with button and checkbox factories that name the selection)
  and the example button. The component specs mirror `@pureform/solid`'s case by case;
  `src/testing/render.tsx` has `outside` (a value set from the test, as a Solid signal) and an
  error boundary. Interactions go through
  `vitest/browser`'s `userEvent` wrapped in `act` (`src/testing/render.tsx`).

## Worth knowing

- **Stubs:** `overrides` and `hydrate` do nothing yet, nor runtime themes (p5b); a named
  `theme` writes the target's attribute (`registry.themeAttributes(theme)`). The development warning for
  a stale glue version calls `trainVersionMismatch`, which finds nothing until p4a records it.
- Server rendering isn't exercised by these tests (p3c's hydration suite).
- `useIconStyle` doesn't see a style that changes by a pseudo-class alone (`:hover`) with no
  transition.
- **No link button yet:** `<Button.Root as="a">` renders an anchor, but the machine still writes
  `type` and `disabled` on it.
- Components aren't re-exported from the root entry; import them from their subpaths.
