# @pureform/solid

pureform's bindings for Solid 2: the provider, the style registry's hooks, the helpers
components build their parts from, and the components themselves (button and checkbox so far),
on top of a port of Zag.js's Solid adapter to Solid 2. Each component wires its anatomy to a
machine to the registry, and comes ready-made and as compound parts.

## Where it sits

```
@pureform/styling   anatomy   machines   binding-core     (framework-free)
        │              │          │            │
        └──────────────┴────┬─────┴────────────┘
                            │
@pureform/solid  ── internal/zag ──► @zag-js/core, types, utils
                            │
          solid-js 2, @solidjs/web     (peers, pinned to the tested release candidate)
```

Anything that works without Solid lives in `@pureform/binding-core` (shared with
`@pureform/react`); this package adds context, memos, effects, and rendering. `@pureform/styling`
is a peer, so the app's generated registry and the binding share one copy. See the
[design doc](../../docs/design/component-architecture.md), §3, §5, §8, and §9.

## Architecture

| Module            | What it holds                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `provider.tsx`    | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`             |
| `classes.ts`      | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                    |
| `parts.tsx`       | `useComponent` (a component's classes and parts), `slotPartProps` (ready-made components) |
| `props.ts`        | Solid's rules for merging a part's props: class arrays, style objects, `[handler, data]`  |
| `controllable.ts` | `useControllable`: controlled and uncontrolled props mapped onto a Zag machine            |
| `form.ts`         | `useFormReset`, `useFieldsetDisabled`                                                     |
| `motion.ts`       | `useReducedMotion`                                                                        |
| `icon-style.ts`   | `useIconStyle`, and the context icon parts provide                                        |
| `part-context.ts` | `createPartContext`: the context Root shares with its parts, and the error outside Root   |
| `button/`         | `@pureform/solid/button`: `button.tsx` (the component), `index.ts`, `button.spec.tsx`     |
| `checkbox/`       | `@pureform/solid/checkbox`: the same layout                                               |
| `internal/zag/`   | The Zag port (below)                                                                      |

```
Root ── useComponent(anatomy, { selection, testId, unstyled }) ──► useClasses ──► registry entry
  │          │
  │          └─ scope.render(part, { element, as, machine, states, props })
  │                 merges: machine props → data-scope/data-pf-part/data-testid → data-pf-* states
  │                         → registry class + token style → provider slotProps → user props
  └─ context { scope, api } ──► Label, Icon, … call scope.render with their part
```

## Public API

### Components

One subpath per component, so an app's bundle keeps only what it imports. Each export is the
ready-made component, with its compound parts as properties.

```tsx
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";

<Button label="Save" icon={<SaveIcon />} variant="tonal" type="submit" />
<Button
    label="Bold"
    defaultSelected={false} // a toggle: aria-pressed, onSelectedChange({ selected })
    class={{ root: ["wide", { busy: saving() }], label: "caps" }}
    style={{ root: { "margin-top": "8px" } }}
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
<Checkbox checked={agreed()} onCheckedChange={(d) => setAgreed(d.checked === true)} />
<Checkbox.Root ids={{ input: "terms" }} color="error" invalid>
    <Checkbox.TouchTarget />
    <Checkbox.Input />
    <Checkbox.Box>
        <Checkbox.CheckIcon />
        <Checkbox.IndeterminateIcon />
    </Checkbox.Box>
</Checkbox.Root>
```

| Component  | Parts (element)                                                                                      | Machine                                |
| ---------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `Button`   | `Root` (`button`), `TouchTarget`, `Icon`, `Label` (`span`)                                           | `@pureform/machines/button`            |
| `Checkbox` | `Root` (`label`), `TouchTarget` (`span`), `Input` (`input`), `Box`, `CheckIcon`, `IndeterminateIcon` | Zag's checkbox, through `internal/zag` |

- **Root's props** are the variant groups (`color`, `variant`, …, typed from the app's registry),
  `tokens`, the machine's props (`disabled`, `type`, `name`, `value`, `form`, and the controllable
  `selected` or `checked`), `id` and `ids` (the machine finds its elements by id, so set them
  here rather than on a part), `testId`, `unstyled`, `as`, and the element's own props. The lists
  live in `@pureform/binding-core` (`BUTTON_ROOT_PROPS`, `CHECKBOX_ROOT_PROPS`), shared with React.
- **Parts** take the element's props and their own `unstyled`; `Button.Icon` takes `mirror`.
  A part outside its Root throws, naming both.
- **The ready-made** component takes Root's props, with `class`, `style`, and `slotProps` keyed by
  part. `Button` takes `label`, `icon` (the icon part renders only when given), and `mirrorIcon`.
  `Checkbox` puts `aria-label`, `aria-labelledby`, and `aria-describedby` on its input.
- **The checkbox is a `<label>`** around the native input, as Zag expects, so a click on its touch
  target toggles it. Name it with `aria-label`, or point a `<label for>` at `ids.input`; don't
  wrap it in another label. The input carries every native state the CSS reads (`:checked`,
  `:indeterminate`, `:disabled`, `aria-invalid`), and the form reset and fieldset rule are the
  binding's (below).

### Provider

```tsx
<PureformProvider
    registry={registry} // from .pureform, or a fake one in tests
    dir="rtl" // written on its element, passed to machines; "ltr" at the root
    motion="reduce" // "system" | "reduce" | "full"; writes data-pf-motion unless "system"
    defaults={{ button: { variant: "tonal" } }}
    slotProps={{ button: { label: { class: "caps" } } }}
    theme="teal" // a named theme, or a runtime one: seedTheme({ seed: "#006A60" })
    overrides={{ "colors.primary": "#006a60" }} // token vars in its element's style
    hydrate="reuse" // or "regenerate": how the client gets a server-rendered runtime theme
>
    <App />
</PureformProvider>
```

It renders a `div` with `display: contents` holding `dir`, `data-pf-motion`, and its theme's
attributes, so the CSS (which reads them from an ancestor) and the browser agree with what
components read. Other props (`class`, `style`, `data-*`) go on that element. Nested providers
inherit what they leave out.

**Themes at run time.** `overrides` (token paths, as React Native takes them) become CSS vars in
the element's `style`, named by the registry's `vars`, on the server too. A runtime theme (a
`RuntimeTheme` such as `seedTheme` from `@pureform/material/runtime-theme`) puts the theme
attribute on the element with its scope, `pf-<hash>` of its input, and both schemes' vars in one
`<style data-pf-theme="pf-…">` block in the head, through `useHead` from `@solidjs/web` keyed by
the scope (providers with the same theme share it). On the server the generator must be loaded:
`await preloadTheme(theme)` before rendering (it warns once in development otherwise). With
`hydrate: "reuse"` (the default) the client adopts the server's block and loads nothing; with
`"regenerate"`, or without a server block, it generates (loading the generator after mount the
first time). `useThemeVars()` gives the generated vars. A server render with `renderToString`
and no `</head>` hands the head tags to its `onHead` option.

| Hook             | Returns                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `usePureform()`  | `Accessor<PureformState>`: the resolved provider state, the root's with none       |
| `useRegistry()`  | `Accessor<AnyRegistry>`; reading it throws when no provider has a registry         |
| `useDirection()` | `Accessor<"ltr" \| "rtl">`: pass it to every machine as `dir`                      |
| `useThemeVars()` | the nearest runtime theme's generated vars, `undefined` while reusing the server's |
| `useMotion()`    | `Accessor<MotionSetting>`: the nearest `"reduce"` or `"full"`, else `"system"`     |

### Registry hooks

```ts
useClasses(name, () => selection): Accessor<ClassSlots<N>>   // over the provider's defaults
useClassFactory(name: StaticComponentName): ClassFactory<N>  // throws for a lazy entry
useLazyClassFactory(name: LazyComponentName): Accessor<ClassFactory<N>>
```

A static entry gives a plain memo. A lazy entry gives an async memo resolving to classes, which
suspends to the nearest `<Loading>` and serializes for hydration. `useLazyClassFactory` memoizes
with `ssrSource: "client"` and warns in development when it runs on the server.

### Building a component

```tsx
const ButtonContext = createContext<{ scope: ComponentScope<typeof buttonAnatomy>; api: … }>();

export function Root(props: RootProps) {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, () => ({
        id, dir: dir(), disabled: props.disabled, ...selected.machineProps(),
    }));
    const api = createMemo(() => button.connect(service, normalizeProps));
    const scope = useComponent(buttonAnatomy, {
        selection: () => ({ variant: props.variant, tokens: props.tokens }),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <ButtonContext value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().pressed }),
                props: omit(props, ...ROOT_PROPS),
            })}
        </ButtonContext>
    );
}

export function Icon(props: PartProps & { mirror?: boolean }) {
    const { scope, api } = useContext(ButtonContext);
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        states: () => ({ mirrored: props.mirror }),
        props: omit(props, "mirror"),
    });
}
```

The full example, with a ready-made `Button` over `slotPartProps`, is
`src/__fixtures__/button.tsx`.

- `scope.part(part, options)` returns the merged props as a live view to spread yourself;
  `scope.render` also renders the element (`as` overrides it), passes the user's `ref` and
  `children`, and for an icon part (`mirror: true` in the anatomy) provides its element to
  `useIconStyle()`.
- **State attributes:** `states` sets only `STATE_ATTRIBUTES` (`data-pf-hover`, `data-pf-active`,
  `data-pf-dragging`, `data-pf-filled`, `data-pf-mirror`), `""` when on and absent when off.
  Everything else (`aria-checked`, `aria-pressed`, `:disabled`, …) comes from the machine's
  props or the native element.
- **Test ids:** `pf-<scope>-<part>` by default; Root's `testId` is a prefix (`save` →
  `save-root`) or ids by part.
- `unstyled` (Root's, `true` or per part, or a part's own) drops the registry's class and token
  style for that part. Parts outside the AST's slots never get registry classes.
- Ready-made components take `class`, `style`, and `slotProps` keyed by part; `slotPartProps(props,
part)` turns them into one part's props, and `testId` and `unstyled` go to Root whole.

### Controllable state and forms

```ts
const checked = useControllable("Checkbox", "checked", props);
// checked.machineProps(): { checked, defaultChecked (read once), onCheckedChange }
useFormReset(inputElement, {
    resetsTo: () => checked.resetsTo() === true, // controlled value, else the default
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
const fieldsetDisabled = useFieldsetDisabled(inputElement); // OR it into the machine's disabled
```

- A defined value prop controls the state; switching between defined and `undefined` warns once
  per instance in development.
- A form reset calls the callback with `reason: "reset"`. Zag's own reset (during the `reset`
  event, to the value at creation) is reported when uncontrolled and dropped when controlled; the
  binding then sends the real default.

### Motion and icons

- `useReducedMotion(): Accessor<boolean>`: the nearest `"reduce"` (true) or `"full"` (false),
  else the system's `prefers-reduced-motion`, `false` until mounted.
- `useIconStyle(): Accessor<IconStyle>`: inside an icon part, its measured `{ size, color,
filled }`, following the component's state; elsewhere `{ size: undefined, color:
"currentColor", filled: false }`.

### `@pureform/solid/internal/zag`

Zag.js machines run as Solid 2 services. Zag's own Solid adapter (`@zag-js/solid`) still
targets Solid 1, so this is a port of its version 1.46.0, with the same exports:

| Export                       | What it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `useMachine(machine, props)` | Runs a Zag machine. `props` can be an object or an accessor; any prop may be `undefined`.                 |
| `normalizeProps`             | Turns Zag's React-shaped part props into Solid 2's: event names, lowercase attributes, hyphenated styles. |
| `mergeProps(...sources)`     | Merges part props lazily: classes, styles, and handlers combine; other keys take the last value.          |
| `useSyncExternalStore`       | An external store's snapshot as a signal.                                                                 |
| `Key`                        | A list keyed by a property or function, built on Solid 2's `<For keyed>`.                                 |

It's internal: components use it, apps shouldn't. When `@zag-js/solid` supports Solid 2, the
port is swapped out by changing imports. What changed from Zag's adapter, and why, is in the
design doc's §8. Beyond Zag's adapter, `normalizeProps` writes ARIA booleans as `"true"` and
`"false"` (Solid 2 writes `true` as an empty attribute), and a machine's watches run untracked,
since they read props and context on purpose (otherwise Solid's development diagnostics warn
`STRICT_READ_UNTRACKED` on every watched change).

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`. JSX is left as written (`dist/index.jsx`, and shared
  chunks are `.jsx` too, since an app's Solid plugin reads JSX only in files named so), so the
  app's Solid plugin compiles it for the DOM or the server; the `solid` export condition points
  there, as does `import`. Identifiers aren't minified, so components stay capitalized.
- `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`), with type
  checks. The specs use a fake registry (`src/__fixtures__/registry.ts`, button and checkbox
  classes that name the selection). Each component's spec covers rendering, keyboard, controlled
  and uncontrolled state, test ids, `unstyled`, slot overrides, and forms; the core helpers'
  specs use a smaller example button (`src/__fixtures__/button.tsx`).

### Adding a component

Copy `src/button/` or `src/checkbox/`: the contract (Root's own props, the selection, the machine
props) goes in `@pureform/binding-core`'s `src/components/<name>.ts`; the component file creates
its part context with `createPartContext`, makes one `useComponent` call in Root, and renders each
part with `scope.render`. Add the entry to `vite.config.ts`'s `lib.entry` and the subpath to
`package.json`'s `exports`. Then add it to the shared suites in `tests/component-suites`, which
check the cross-cutting rules against Solid and React together (see that package's README).

## Worth knowing

- The development warning for a stale glue version calls `trainVersionMismatch`, which finds
  nothing until p4a records it.
- A registry entry's kind is read once per component instance; swapping the registry for one
  whose entry kind differs isn't followed.
- `useIconStyle` doesn't see a style that changes by a pseudo-class alone (`:hover`) with no
  transition.
- The ready-made `Button` reads its `icon` prop once to decide whether to render the icon part,
  which builds the icon's JSX an extra time; the part builds it again inside its own context.
- A controlled checkbox's native input is put back after a click the owner ignores, in a
  microtask once the machine and the owner have handled it (`syncCheckedInput`).
- `solid-js` and `@solidjs/web` are peers at the exact release candidate the package is tested
  with (design doc §11).
