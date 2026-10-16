# p2b: React binding core (output context)

Commits: bbda502..40c7e56, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bbda502` | `feat(binding-core)`: `partSources`, `spreadableProps`, `classEntry`, lazy-entry messages, `cx`, `selectionSignature`, `ControllableMachineProps` |
| `b1fa26f` | `refactor(solid)`: parts, class lookups, and controllable types on those shared helpers                                                           |
| `93d65a8` | `feat(react)`: the new `@pureform/react` package                                                                                                  |
| `40c7e56` | `docs(design)`: "Built (p2b)" notes in §5.3 and §9.2                                                                                              |

## Built

### Moved into `@pureform/binding-core` (shared; Solid now uses them too)

```ts
// parts.ts
function spreadableProps(props: object | undefined): Dict | undefined; // without children, ref
interface PartSourcesInput<A extends ComponentAnatomy> {
    anatomy: A;
    part: PartName<A>;
    machine?: object;
    states?: PartStates;
    testId?: TestIdOverride<PartName<A>>;
    unstyled?: Unstyled<PartName<A>>; // Root's
    partUnstyled?: boolean; // the part's own
    classes?: Readonly<Record<string, SlotClasses>>; // every slot's, from useClasses
    slotProps?: object; // the provider state's slotProps
    props?: object; // the user's
}
function partSources<A>(
    input: PartSourcesInput<A>,
): readonly (Dict | undefined)[];
// [machine, partAttributes, stateAttributes, registry slot (unless unstyled / styled: false),
//  provider slotProps[component][part], spreadableProps(user)] → pass to combineProps

// entries.ts
function classEntry<N extends ComponentName>(
    state: { registry },
    name: N,
): RegistryEntry<ClassFactory<N>>;
function lazyFactoryError(name: string): Error; // useClassFactory on a lazy entry
function serverLazyFactoryMessage(name: string): string; // useLazyClassFactory on the server

// selection.ts
function selectionSignature(selection: object): string; // equal iff same keys/values; undefined keys and key order ignored; tokens by value

// class-names.ts
type ClassValue =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | ClassDictionary
    | readonly ClassValue[];
type ClassDictionary = { readonly [name: string]: unknown };
function cx(...values: readonly ClassValue[]): string; // clsx-compatible

// controllable.ts
type ControllableMachineProps<N extends string, T, D extends object> = {
    [K in N]: T | undefined;
} & { [K in DefaultName<N>]: T | undefined } & {
    [K in ChangeName<N>]: (d: D) => void;
};
```

Specs: `packages/binding-core/src/{class-names,entries}.spec.ts`, new cases in `parts.spec.ts`.
Binding-core: 106 tests, 2 todo.

### `@pureform/react` (new, `packages/react`)

Scaffolded with `ts-package` (`release_group: binding`, so its own `[monorepo.packages."@pureform/react"]`
in `cog.toml`; published). Deps: `@pureform/anatomy`, `binding-core`, `machines`, `@zag-js/react`
(1.46). Peers: `@pureform/styling` (`catalog:`), `react`/`react-dom` `^19.0.0`. Dev: React Testing
Library (`@testing-library/react` 16.3.3, `@testing-library/dom`), `@vitejs/plugin-react`,
`@zag-js/checkbox`, types. New catalog entries: `@pureform/react`, `@testing-library/dom`,
`@testing-library/react`, `@zag-js/react`. One entry, `dist/index.mjs`, starting with `"use client"`.

| File                | Exports                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`      | `PureformProvider`, `PureformProviderProps`, `PureformState`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`                                     |
| `classes.ts`        | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                                                                                      |
| `parts.tsx`         | `useComponent`, `slotPartProps`, `mergeRefs`, types `ComponentScope`, `ComponentOptions`, `PartOptions`, `RenderOptions`, `SlotKeyedProps`, `ComponentOf`   |
| `props.ts`          | `combinePartProps`, `mergePartProps`, `mergeStyles`, type `PartProps`                                                                                       |
| `controllable.ts`   | `useControllable`, types `ControllableState`, `ControllableMachineProps`                                                                                    |
| `form.ts`           | `useFormReset`, `useFieldsetDisabled`, type `FormResetOptions`                                                                                              |
| `motion.ts`         | `useReducedMotion`                                                                                                                                          |
| `icon-style.ts`     | `useIconStyle`, `IconPartContext`                                                                                                                           |
| `env.ts` (internal) | `isDev` (`process.env.NODE_ENV !== "production"`, left for the app's bundler), `isServer` (`typeof window === "undefined"`)                                 |
| re-exported         | `cx`; types `ChangeDetails`, `ChangeReason`, `ClassValue`, `Controllable`, `Direction`, `IconStyle`, `MotionSetting`, `PartStates`, `SlotKeyed`, `Unstyled` |

Signatures (Solid's names and shapes; values where Solid has accessors):

```ts
type PartProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };
type PureformState = ProviderState<PartProps>;
interface PureformProviderProps extends ProviderOptions<PartProps>, Omit<HTMLAttributes<HTMLDivElement>, "dir">
    { children?: ReactNode; ref?: Ref<HTMLDivElement> }
function PureformProvider(props): ReactNode; // <div style={{ display: "contents", ...style }} dir data-pf-motion …rest>
usePureform(): PureformState;   // ROOT_PROVIDER with no provider
useRegistry(): AnyRegistry;     // throws without a registry
useDirection(): Direction;
useMotion(): MotionSetting;

useClasses<N extends ComponentName>(name: N, selection: Selection<N>): ClassSlots<N>;
useClassFactory<N extends StaticComponentName>(name: N): ClassFactory<N>; // throws for lazy
useLazyClassFactory<N extends LazyComponentName>(name: N): ClassFactory<N>; // suspends; throws on the server

interface ComponentOptions<A> { selection: Selection<ComponentOf<A>>; testId?; unstyled?: Unstyled<PartName<A>> }
interface PartOptions { machine?: object; states?: PartStates; props?: object; unstyled?: boolean }
interface RenderOptions extends PartOptions { element: ElementType; as?: ElementType; ref?: Ref<HTMLElement> }
interface ComponentScope<A> {
    anatomy: A; classes: ClassSlots<ComponentOf<A>>;
    part(part: PartName<A>, options?: PartOptions): PartProps;
    render(part: PartName<A>, options: RenderOptions): ReactElement;
}
useComponent<A extends ComponentAnatomy>(anatomy: A, options: ComponentOptions<A>): ComponentScope<A>;
interface SlotKeyedProps<A> { className?: SlotKeyed<PartName<A>, ClassValue>; style?: SlotKeyed<…, CSSProperties>;
    testId?; slotProps?: SlotKeyed<PartName<A>, PartProps>; unstyled?: Unstyled<PartName<A>> }
slotPartProps<A>(props: SlotKeyedProps<A>, part: PartName<A>): PartProps;
mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T>; // returns a cleanup (React 19)

useControllable<N, T, D = { [K in N]: T }>(component: string, name: N,
    props: Controllable<N, T, D & { reason? }>): ControllableState<N, T, D>;
interface ControllableState<N, T, D> {
    value: T | undefined; defaultValue: T | undefined /* read once */; controlled: boolean;
    resetsTo: T | undefined; machineProps: ControllableMachineProps<N, T, D> /* stable onChange */;
    beforeReset(): void; reset(update: () => void): void; // both stable
}
interface FormResetOptions { resetsTo: NativeDefault; onBeforeReset?: () => void; onReset: () => void }
useFormReset(input: Element | null | undefined, options: FormResetOptions): void;
useFieldsetDisabled(element: Element | null | undefined): boolean;
useReducedMotion(): boolean;
useIconStyle(): IconStyle;
const IconPartContext: Context<Element | null>;
```

### Example (full version: `packages/react/src/__fixtures__/button.tsx`)

```tsx
export function Root(props: RootProps) {
    const {
        variant,
        tokens,
        disabled,
        as,
        testId,
        unstyled,
        selected: _s,
        defaultSelected: _d,
        onSelectedChange: _c,
        ...rest
    } = props;
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, {
        id,
        dir,
        disabled,
        ...selected.machineProps,
    });
    const api = button.connect(service, normalizeProps); // @zag-js/react
    const scope = useComponent(buttonAnatomy, {
        selection: { variant, tokens },
        testId,
        unstyled,
    });
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
```

The checkbox recipe is `function Checkbox` in `packages/react/src/controllable.spec.tsx`: input
element in state (`ref={setInput}`), `useFieldsetDisabled(input)` ORed into `disabled`,
`useFormReset(input, { resetsTo: checked.resetsTo === true, onBeforeReset: checked.beforeReset,
onReset: () => checked.reset(() => service.send({ type: "CHECKED.SET", … })) })`, and Zag's
hidden-input `style` stripped.

### What remains React-only

Context, `useMemo`/`use()`/`useSyncExternalStore`/effects, rendering parts (`PartElement`, an
internal component that merges refs and provides the icon element), `mergeRefs`, React's class and
style join rules (`classKeys: ["className", "class"]`, `cx`, `mergeStyles`), the latest-callback
refs in `useControllable`/`useFormReset`, and `isDev`/`isServer`.

## Deviations from the design

- **Slot-keyed classes are `className`**, not `class` (§9.1 shows Solid's `class`): React's props
  say `className`. Each slot takes any `clsx` value, joined with `cx`.
- **`useLazyClassFactory` throws on the server** (after the development warning) rather than
  suspending: React renders a `<Suspense>` fallback on the server for a thrown error and renders
  the content on the client, which is §5.3's "client-only". A never-resolving promise would hang a
  streaming render.
- **`useClasses` memoizes on `selectionSignature`**, not on object identity, so Root can pass an
  inline selection. Recorded in §5.3.
- **`useReducedMotion` uses `useSyncExternalStore`**: `false` on the server and while hydrating,
  as in Solid; a plain client render (`createRoot`) reads the system at once rather than after
  mount.
- **No `internal/zag` subpath**: components import `@zag-js/react` directly (a dependency).

## Stubs and gaps

- **p5b:** `theme`, `overrides`, `hydrate` carried, not applied. Test `todo` in
  `packages/react/src/provider.spec.tsx`.
- **p4a:** `trainVersionMismatch` still always `undefined`; the provider calls it in development.
- **SSR not exercised** (no server render in these tests; `isServer` is read at module load, so the
  server path of `useLazyClassFactory` isn't covered). p3c's hydration suite.
- **Fieldsets with Zag:** as in p2a, Zag's own closest-fieldset tracking still runs (legend
  exemption not covered).
- **`useIconStyle`** misses pseudo-class-only changes with no transition (as Solid).
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" fails (257 of 258 e2e).

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/react` (70 tests + 2 todo, counting the type-check run),
  `@pureform/binding-core` (106 + 2 todo), `@pureform/solid`: pass. Workspace `build` +
  `test:unit`: pass, including `@pureform/release`'s cog check; `test:e2e` only the pre-existing
  rn-parity case fails.
- Single run: `cd packages/react && set -a; source ../../.env.local; set +a; bun x vitest --config
vitest.config.unit.ts run`.
- Specs: `packages/react/src/{provider,parts,controllable}.spec.tsx`, mirroring Solid's case by
  case (plus memoization, `mergeRefs`).

## Notes for the next phases

- **p3b:** write components as the fixture does: one `useComponent` in Root, `{ scope, api }` in a
  context, parts call `scope.render`. Pass `dir` from `useDirection()` and `id` from `useId()` to
  every machine. Root's `rest` must leave out the controllable props (destructure them). For
  checkbox/switch, keep the input in state via a callback ref (`useState` setter) so
  `useFormReset`/`useFieldsetDisabled` re-run when it mounts.
- **React tests:** render with RTL; wrap every interaction and state change in `act`
  (`interact()` in `src/testing/render.tsx`), and mount suspending views with `mountAsync` (an
  awaited `act`), or Suspense never retries. Use `findBy*` after resolving a lazy load. Error
  boundary tests should silence `console.error`.
- **Zag in React:** `send` is queued in a microtask, and state changes run in `flushSync`;
  `ChangeReasonTracker.during` works as is. Zag's `useMachine` reads props through a ref updated
  during render, so callbacks needn't be stable, but ours are.
- **Shared suites (p3c):** the exports match Solid's names; the differences are values vs
  accessors, `className` vs `class`, `<Suspense>` vs `<Loading>`.
- **Provider objects:** `defaults`/`slotProps`/`overrides` are memo deps by identity; inline
  objects re-render consumers on every provider render (correct, just slower).
- **bun.lock:** edited by hand again (`--lockfile-only` re-resolved commander, lightningcss,
  aria-query); `bun install --frozen-lockfile` installed 2 packages with no lockfile change.
