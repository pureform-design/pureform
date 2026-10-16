# p2a: Solid binding core (output context)

Commits: 0a00d37..21c3041, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `0a00d37` | `fix(styling)`: selections take `undefined`; unregistered components typed openly                        |
| `61009e5` | `fix(machines)`: `trackFormReset` listens in the capture phase                                           |
| `36fcb9e` | `feat(binding-core)`: the new framework-free package                                                     |
| `e2da719` | `fix(solid)`: ARIA booleans as strings in `normalizeProps`; `createBindable` reads its initial untracked |
| `111467f` | `feat(solid)`: provider, registry hooks, part helpers, controllable, forms, motion, icons                |
| `21c3041` | `docs(design)`: "Built (p2a)" notes in §3, §5.3, §5.8, §9.2, §9.4, §9.5                                  |

## Built

### Shared, framework-free: `@pureform/binding-core` (new, `packages/binding-core`), which p2b reuses

Core-train package (scaffolded with `ts-package`, `release_group: core-train`), `sideEffects:
false`. Deps: `@pureform/core`, `@pureform/styling`, `@pureform/anatomy`. Root catalog entry
`"@pureform/binding-core": "workspace:^"`. Tests in Chromium browser mode, type-checked.

**Root entry** (no DOM use; React Native can import it):

```ts
// provider.ts
type Direction = "ltr" | "rtl";
type AnyRegistry = Registry<any>;
type ComponentDefaults = { readonly [N in ComponentName]?: Selection<N> };
type ProviderSlotProps<P> = { readonly [N in ComponentName]?: { readonly [S in SlotOf<N>]?: P } };
type ThemeName = string; type ThemeOverrides = Readonly<Record<string, TokenValue>>;
type ThemeHydration = "reuse" | "regenerate";
interface ProviderOptions<P = object> {   // P = the binding's props for one part
    registry?; dir?; motion?: MotionSetting; defaults?; slotProps?: ProviderSlotProps<P>;
    theme?; overrides?; hydrate?;           // each `| undefined`; theme/overrides/hydrate are p5b stubs
}
interface ProviderState<P = object> { registry: AnyRegistry | undefined; dir: Direction;
    motion: MotionSetting; defaults; slotProps; theme; overrides; hydrate: ThemeHydration }
const ROOT_PROVIDER: ProviderState<never>; // ltr, "system", {} …, "reuse"
type MergePartProps<P> = (outer: P, inner: P) => P;
function resolveProvider<P>(parent: ProviderState<P> | undefined, own: ProviderOptions<P>,
    merge?: MergePartProps<P> /* shallow by default */): ProviderState<P>;
function providerAttributes(own: { motion? }, state: { dir }):
    { dir: Direction; "data-pf-motion": "reduce" | "full" | undefined };
function requireRegistry(state: { registry }): AnyRegistry; // throws "pureform: no registry. Wrap … <PureformProvider registry={registry}> …"

// selection.ts
function withDefaults<C extends ComponentRef = ComponentName>(defaults: Selection<C> | undefined,
    selection: Selection<C>): Selection<C>; // undefined keys take the default; tokens merge; same object without defaults

// parts.ts
type PartStates = { readonly [S in AttributeState]?: boolean | undefined }; // hover pressed dragged filled mirrored
type StateAttributes = { readonly [A in StateAttribute]?: "" | undefined };
function stateAttributes(states: PartStates | undefined): StateAttributes; // only the keys given
type SlotKeyed<P extends string, V> = { readonly [K in P]?: V };
function forSlot<P, V>(value: SlotKeyed<P, V> | undefined, slot: NoInfer<P>): V | undefined;
type Unstyled<P extends string = string> = boolean | SlotKeyed<P, boolean>;
function isUnstyled(unstyled: Unstyled | undefined, part: string): boolean;
function partClasses<A>(anatomy: A, part: PartName<A>, slots, unstyled?): SlotClasses | undefined; // undefined for styled: false parts
function isIconPart<A>(anatomy: A, part: PartName<A>): boolean; // anatomy part's mirror === true

// props.ts
interface CombineRules {
    classKeys: readonly string[];              // Solid ["class", "className"]; the result goes under the first
    joinClasses(values: readonly unknown[]): unknown;
    joinStyles(values: readonly unknown[]): unknown;
    isHandler?(value: unknown): boolean;       // default: a function
    callHandler?(handler: unknown, event: unknown): void;
}
function combineProps(sources: readonly (Dict | undefined)[], rules: CombineRules): Record<string, unknown>;
function mergeStyleObjects(styles): Record<string, unknown>;

// controllable.ts
type ChangeReason = "reset";
type ChangeDetails<N, T> = { readonly [K in N]: T } & { readonly reason?: ChangeReason };
type DefaultName<N> = `default${Capitalize<N>}`; type ChangeName<N> = `on${Capitalize<N>}Change`;
type Controllable<N extends string, T, D extends object = ChangeDetails<N, T>>; // N?, defaultN?, onNChange?(details: D)
function controllableNames<N>(name: N): { value: N; defaultValue: DefaultName<N>; onChange: ChangeName<N> };
function controlSwitchMessage(component, name, nowControlled): string;
function createControlTracker(component, name, initiallyControlled, warn): (controlled: boolean) => void;
interface ChangeReasonTracker {
    during(update: () => void): void;                       // marks callbacks the update causes
    untilNextTask(options?: { drop?: boolean }): void;      // for the form's reset event
    report<D>(callback: ((d: D & { reason? }) => void) | undefined, details: D): void;
}
function createChangeReason(): ChangeReasonTracker;

// motion.ts, icon-style.ts, version.ts, warn.ts
export { MOTION_ATTRIBUTE, type MotionSetting } from "@pureform/core";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function resolveReducedMotion(setting: MotionSetting, systemReduces: boolean): boolean;
interface IconStyle { size: number | undefined; color: string; filled: boolean }
const DEFAULT_ICON_STYLE: IconStyle; // { size: undefined, color: "currentColor", filled: false }
function sameIconStyle(a, b): boolean;
function trainVersionMismatch(registry: unknown): string | undefined; // stub, always undefined (p4a)
function warnOnce(message: string, warn?: (m: string) => void): void;
```

**`@pureform/binding-core/dom`**: `systemReducedMotion(): boolean`,
`subscribeReducedMotion(onChange): VoidFunction` (calls at once, then on change),
`readIconStyle(element): IconStyle` (computed `font-size`, `color`, `"FILL"` from
`font-variation-settings`), `observeIconStyle(element, onChange): VoidFunction` (re-reads on
attribute mutations under the icon's `[data-scope][data-pf-part=root]`, on `transitionend`/
`transitioncancel` there, and on resize).

### `@pureform/solid` (root entry, `packages/solid/src`)

| File              | Exports                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`    | `PureformProvider`, `PureformProviderProps`, `PureformState`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`                      |
| `classes.ts`      | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                                                                       |
| `parts.tsx`       | `useComponent`, `slotPartProps`, types `ComponentScope`, `ComponentOptions`, `PartOptions`, `RenderOptions`, `SlotKeyedProps`, `ComponentOf` |
| `props.ts`        | `combinePartProps`, `mergePartProps`, `mergeStyles`, type `PartProps`                                                                        |
| `controllable.ts` | `useControllable`, types `ControllableState`, `ControllableMachineProps`                                                                     |
| `form.ts`         | `useFormReset`, `useFieldsetDisabled`, type `FormResetOptions`                                                                               |
| `motion.ts`       | `useReducedMotion`                                                                                                                           |
| `icon-style.ts`   | `useIconStyle`, `IconPartContext`                                                                                                            |
| re-exported types | `ChangeDetails`, `ChangeReason`, `Controllable`, `Direction`, `IconStyle`, `MotionSetting`, `PartStates`, `SlotKeyed`, `Unstyled`            |

Signatures:

```ts
type PartProps = JSX.HTMLAttributes<HTMLElement>;
type PureformState = ProviderState<PartProps>;
interface PureformProviderProps extends ProviderOptions<PartProps>,
    Omit<JSX.HTMLAttributes<HTMLDivElement>, "dir"> { children?: JSX.Element }
function PureformProvider(props): JSX.Element;
  // <div style="display: contents" dir data-pf-motion …rest> inside the context
usePureform(): Accessor<PureformState>;   // ROOT_PROVIDER with no provider
useRegistry(): Accessor<AnyRegistry>;     // throws on read without a registry
useDirection(): Accessor<Direction>;
useMotion(): Accessor<MotionSetting>;

useClasses<N extends ComponentName>(name: N, selection: Accessor<Selection<N>>): Accessor<ClassSlots<N>>;
useClassFactory<N extends StaticComponentName>(name: N): ClassFactory<N>; // throws for a lazy entry
useLazyClassFactory<N extends LazyComponentName>(name: N): Accessor<ClassFactory<N>>;

type ComponentOf<A extends ComponentAnatomy> = A["name"] & ComponentName;
interface ComponentOptions<A> {
    selection: Accessor<Selection<ComponentOf<A>>>;
    testId?: Accessor<TestIdOverride<PartName<A>> | undefined>;
    unstyled?: Accessor<Unstyled<PartName<A>> | undefined>;
}
interface PartOptions {
    machine?: Accessor<object | undefined>;      // api().getRootProps()
    states?: Accessor<PartStates | undefined>;   // { pressed: api().pressed, mirrored: props.mirror }
    props?: object;                              // user props (omit(props, …own keys)); children/ref not spread
    unstyled?: Accessor<boolean | undefined>;    // the part's own
}
interface RenderOptions extends PartOptions {
    element: ValidComponent;                     // default tag
    as?: Accessor<ValidComponent | undefined>;
    ref?: (element: HTMLElement) => void;        // the component's own ref, beside the user's
}
interface ComponentScope<A> {
    anatomy: A;
    classes: Accessor<ClassSlots<ComponentOf<A>>>;
    part(part: PartName<A>, options?: PartOptions): PartProps;   // live merged view (Solid `merge`)
    render(part: PartName<A>, options: RenderOptions): JSX.Element;
}
useComponent<A extends ComponentAnatomy>(anatomy: A, options: ComponentOptions<A>): ComponentScope<A>;
interface SlotKeyedProps<A> { class?; style?; testId?: TestIdOverride; slotProps?; unstyled?: Unstyled }
slotPartProps<A>(props: SlotKeyedProps<A>, part: PartName<A>): PartProps;

useControllable<N extends string, T, D extends object = { [K in N]: T }>(
    component: string, name: N, props: Controllable<N, T, D & { reason? }>): ControllableState<N, T, D>;
interface ControllableState<N, T, D> {
    value: Accessor<T | undefined>; defaultValue: T | undefined /* read once */;
    controlled: Accessor<boolean>; resetsTo: Accessor<T | undefined>;
    machineProps: Accessor<{ [N]: T | undefined; [defaultN]: T | undefined; [onNChange]: (d: D) => void }>;
    beforeReset(): void;               // pass as useFormReset's onBeforeReset
    reset(update: () => void): void;   // wrap the machine send in onReset
}
interface FormResetOptions { resetsTo: Accessor<NativeDefault>; onBeforeReset?: () => void; onReset: () => void }
useFormReset(input: Accessor<Element | null | undefined>, options: FormResetOptions): void;
useFieldsetDisabled(element: Accessor<Element | null | undefined>): Accessor<boolean>;
useReducedMotion(): Accessor<boolean>;
useIconStyle(): Accessor<IconStyle>;
```

### Example (full version: `packages/solid/src/__fixtures__/button.tsx`)

```tsx
const ButtonContext = createContext<{
    scope: ComponentScope<typeof buttonAnatomy>;
    api: Accessor<button.Api<PropTypes>>;
}>();

export function Root(props: RootProps) {
    // RootProps extends PartProps, Controllable<"selected", boolean>
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, () => ({
        id,
        dir: dir(),
        disabled: props.disabled,
        ...selected.machineProps(),
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
                props: omit(
                    props,
                    "variant",
                    "tokens",
                    "disabled",
                    "as",
                    "testId",
                    "unstyled",
                    "selected",
                    "defaultSelected",
                    "onSelectedChange",
                ),
            })}
        </ButtonContext>
    );
}
export function Label(props: PartProps & { unstyled?: boolean }) {
    const { scope, api } = useContext(ButtonContext);
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}
// Ready-made: <Root variant testId unstyled {...slotPartProps(props, "root")}>
//               <Label {...slotPartProps(props, "label")}>{props.label}</Label></Root>
```

The checkbox recipe (controllable + form reset + fieldset) is in
`packages/solid/src/controllable.spec.tsx` (`function Checkbox`).

### How state attributes are set, and from where

- A part's merged props are, in order: the machine's part props (`machine`), then
  `partAttributes(anatomy, part, testId)` (`data-scope`, `data-pf-part`, `data-testid`) from
  `@pureform/anatomy`, then `stateAttributes(states)` from `@pureform/binding-core`, then the
  registry's `{ class, style }` for the slot, then the provider's `slotProps[component][part]`,
  then the user's props. Our `data-scope` wins over Zag's.
- `states` is the component's job, per part: `pressed` from `api().pressed` (writes
  `data-pf-active`), `mirrored` from the icon's `mirror` prop (`data-pf-mirror`); `hover`,
  `dragged`, `filled` when a component needs them. A state set `false` removes the attribute; a
  state left out isn't touched.
- Everything else (`aria-pressed`, `aria-checked`, `aria-disabled`, native `disabled`/`:checked`)
  comes from the machine's props. `normalizeProps` now writes ARIA booleans as `"true"`/`"false"`.
- The provider writes `dir` (always, the resolved value) and `data-pf-motion` (only `"reduce"`
  or `"full"`) on its own `display: contents` element.

### Other changes

- `@pureform/styling` types: every variant group and token takes `| undefined`; `Selection`'s
  `tokens?` too; an unregistered name's `Variants` is `{ [group: string]: VariantValue<string> |
InstanceTokens | undefined }` (so `tokens` fits); `LazyComponentName` is `string` while nothing
  is registered.
- `@pureform/machines/form`: `trackFormReset` listens with `{ capture: true }`.
- Solid's library build keeps JSX (`dist/index.jsx`, `dist/internal/zag.jsx`, `oxc: false`,
  rolldown `transform.jsx: "preserve"`, `minify: false`); exports have `solid` and `import`
  conditions pointing there, `development` at `src`. Its vitest config sets `oxc: {}` back and
  adds a browser command `emulateReducedMotion` (`src/testing/commands.ts`), plus
  `src/testing/mount.ts` (`mount`, `settle`, `byTestId`).
- `@pureform/solid` package.json: deps `@pureform/anatomy`, `binding-core`, `machines`; peer and
  dev `@pureform/styling` (`catalog:`). This is the "binding peers on a train range" from p1h.

## Deviations from the design

- **A new package, `@pureform/binding-core`,** not in §3's layout: the roadmap asked p2a/p2b to
  share framework-free code. Recorded in §3.
- **`useClasses` applies the provider's `defaults`.** §9.3 named `defaults` but not where they
  apply; they apply to the selection (variants and tokens) only, not to other props.
- **Motion resolves like the CSS:** an explicit `motion="system"` nested in `"reduce"` stays
  `"reduce"` (the CSS can't express "system"); omitted means the same. Recorded in §5.8.
- **Zag's own form reset** runs during the `reset` event and resets to the value at creation,
  which is wrong for controlled components. `trackFormReset` now captures, and the binding drops
  Zag's callbacks when controlled and marks them `reason: "reset"` when uncontrolled. Recorded
  in §9.5.
- **Polymorphism is `as` only** (no render prop). §9.2 offered either.
- **The provider renders a `div` with `display: contents`**, not configurable (`as` isn't taken).
- **`useIconStyle()` on the web measures**: `size` in px from `font-size`, `color` computed,
  `filled` from the `FILL` axis; `undefined`/`currentColor`/`false` before mount and outside an
  icon part.

## Stubs and gaps

- **p5b:** `theme`, `overrides`, `hydrate` are typed, inherited through nesting, and exposed on
  `usePureform()`, but nothing writes vars or theme attributes. Test marked `todo` in
  `packages/solid/src/provider.spec.tsx`.
- **p4a:** `trainVersionMismatch` (binding-core `src/version.ts`) always returns `undefined`; the
  provider already calls it in development and warns once if it returns a message. Test `todo`
  in `packages/binding-core/src/controllable.spec.ts`.
- **Fieldsets with Zag:** Zag's own closest-fieldset tracking still runs. ORing
  `useFieldsetDisabled` into `disabled` fixes the missed outer fieldset but not the first-legend
  exemption (Zag still disables there).
- **`useIconStyle`** misses changes from a pseudo-class alone (`:hover`) with no transition, and
  changes driven from outside the component (a theme class on `<html>`).
- **SSR not exercised** in these tests (no server render of the provider or hooks); the design's
  hydration suite is p3c.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" fails (257 of 258 e2e).

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/binding-core` (Vitest reports 84 passed, 2
  todo, counting the type-check run) and `@pureform/solid` (86 passed, 2 todo): pass. Workspace `build` + `test:unit`: pass,
  except the pre-existing rn-parity case.
- Single run: `cd packages/solid && set -a; source ../../.env.local; set +a; bun x vitest --config
vitest.config.unit.ts run`.
- Specs: `packages/solid/src/{provider,parts,controllable}.spec.tsx`,
  `packages/binding-core/src/{provider,parts,controllable,dom}.spec.ts`.

## Notes for the next phases

- **p2b (React):** reuse `@pureform/binding-core` for: `ProviderOptions<P>`/`resolveProvider`
  (pass a `merge` built on `combineProps` with React's class join, e.g. `clsx`-style into
  `className`), `providerAttributes`, `requireRegistry`, `withDefaults`, `stateAttributes`,
  `partClasses`, `isUnstyled`, `forSlot`, `isIconPart`, `partAttributes` (from anatomy),
  `combineProps` (React rules: `classKeys: ["className"]`, `joinClasses` → string,
  `joinStyles` → `mergeStyleObjects`, keys camelCase), `Controllable`/`createControlTracker`/
  `createChangeReason` (React's `@zag-js/react` `send` may be synchronous; `during` works either
  way), `resolveReducedMotion` + `/dom`'s `subscribeReducedMotion`, `observeIconStyle`,
  `trainVersionMismatch`, `warnOnce`. Mirror Solid's export names (`PureformProvider`,
  `useClasses`, `useComponent`, `useControllable`, `useFormReset`, …) so the shared suites in p3c
  read the same. The form-reset recipe needs `onBeforeReset: beforeReset` to drop Zag's own
  reset callback when controlled.
- **p3a:** components follow the example above; one file per component, Root makes the one
  `useComponent` call and shares `{ scope, api }` by context. Pass `dir: dir()` to every machine.
  For checkbox/switch: strip Zag's hidden-input `style`, keep a signal of the input element
  (`createSignal(undefined, { ownedWrite: true })` as `ref`), and wire `useControllable` +
  `useFormReset` + `useFieldsetDisabled` as in `controllable.spec.tsx`. Variant props can be
  typed `Variants<"button">`; inside the package they're open (nothing registered).
- **Solid 2 traps hit here:** context created with `undefined` as default throws when read
  (use `null`); JSX children captured in a variable are evaluated outside a later context
  wrapper (render them inside it); signals written from a `ref` need `{ ownedWrite: true }`;
  errors thrown while rendering don't reach the caller of `render` (test them with `<Errored>`).
- **Library build:** any new `.tsx` entry needs nothing else; keep `minify: false`.
- **bun.lock:** edited by hand again (`--lockfile-only` re-resolved commander and lightningcss);
  `bun install --frozen-lockfile` then reports no changes.
