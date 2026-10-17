# p9a: Interaction source and the indication interface (output context)

Commits: fcb887d..2b01613, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `fcb887d` | **The interface commit.** `feat(binding-core)`: `/interaction` (the source) and `/indication` (the types)    |
| `d582994` | `feat(machines)`: nine machines emit to a source; the button drops Zag-style attributes and reads the source |
| `1b81d73` | `feat(binding-core)`: `createInteractionSources` (one source per key)                                        |
| `b6bd113` | `feat(solid, react)`: every interactive component passes its machine a source                                |
| `0fb7e3a` | `docs(design)`: "Built (p9a)" in §9.8                                                                        |
| `2b01613` | `feat(machines)`: the `@pureform/machines/interaction` subpath                                               |

## Built

### `@pureform/binding-core/interaction` (`packages/binding-core/src/interaction.ts`)

Framework-free; no DOM use. Exactly:

```ts
type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "virtual";
type PressOrigin = { x: number; y: number } | "center"; // viewport coordinates (clientX/Y on the web)

interface InteractionKinds {
    // open: apps augment with prefixed kinds
    press: { id: number; origin: PressOrigin; pointer: PointerKind };
    release: { id: number };
    cancel: { id: number };
    hoverEnter: {};
    hoverExit: {};
    focus: { visible: boolean };
    blur: {};
    dragStart: {};
    dragStop: {};
}
type InteractionKind = keyof InteractionKinds;
type Interaction = {
    [K in InteractionKind]: { type: K } & InteractionKinds[K];
}[InteractionKind];
type InteractionOf<K extends InteractionKind> = Extract<
    Interaction,
    { type: K }
>;

interface InteractionState {
    readonly hovered: boolean;
    readonly focused: boolean;
    readonly focusVisible: boolean;
    readonly pressed: boolean;
    readonly dragged: boolean;
}
type InteractionListener = (
    interaction: Interaction,
    state: InteractionState,
    origin: unknown,
) => void;
interface InteractionSource {
    readonly state: InteractionState; // a new frozen object only when it changes
    subscribe(listener: InteractionListener): () => void;
}
interface MutableInteractionSource extends InteractionSource {
    emit(interaction: Interaction, origin?: unknown): void; // origin: the element or native view
}
const IDLE_INTERACTION_STATE: InteractionState; // all false, frozen
function createInteractionSource(): MutableInteractionSource;
function createInteractionSources(): (key: string) => MutableInteractionSource; // one per key, made when first asked
```

The state (the reducer): a press holds until a `release` or `cancel` with its id (unknown ids
change nothing; several presses can hold at once); `hovered` while more `hoverEnter`s than
`hoverExit`s have come (clamped at 0) **and no touch press is in progress**; `focused` from
`focus` to `blur`, `focusVisible` as the `focus` said; `dragged` while more `dragStart`s than
`dragStop`s. A kind it doesn't know reaches every subscriber and leaves the state alone.
Subscribers present when `emit` starts hear it (a copy of the list per change); a late subscriber
reads `state` for what came before. App kinds augment `InteractionKinds` in
`declare module "@pureform/binding-core/interaction"` (the interface is declared in that entry
file, so augmentation works through the published `.d.ts`).

### `@pureform/binding-core/indication` (`packages/binding-core/src/indication.ts`): what p9c and p9d implement

Types only, plus `defineIndication`:

```ts
interface IndicationTokens {
    // by the component tokens' names; each TokenValue | undefined
    readonly stateHoverOpacity?;
    readonly stateFocusOpacity?;
    readonly statePressedOpacity?;
    readonly stateDraggedOpacity?;
    readonly focusIndicatorThickness?;
    readonly focusIndicatorOuterOffset?;
    readonly focusIndicatorColor?;
}
interface IndicationTarget {
    readonly trigger: HTMLElement;
    readonly surface: HTMLElement;
    readonly layer?: HTMLElement | undefined;
}
interface IndicationContext {
    readonly centered: boolean;
    reducedMotion(): boolean;
    dir(): Direction; // "ltr" | "rtl"
    readonly registry: AnyRegistry; // the provider's; its `ripple` entry draws Material's ripple
}
interface NativeIndicationSurface {
    readonly style: Readonly<Record<string, unknown>>;
    readonly drawing?: unknown;
}
interface NativeIndicationProps {
    readonly source: InteractionSource;
    readonly surface: NativeIndicationSurface; // the surface's resolved style (color, corners) and drawing
    readonly centered: boolean;
    readonly reducedMotion: boolean;
    readonly dir: Direction;
    readonly registry: AnyRegistry;
}
type NativeIndicationComponent =
    | ((props: NativeIndicationProps) => unknown)
    | (new (props: NativeIndicationProps) => unknown);
interface Indication {
    readonly name: string;
    readonly tokens?: IndicationTokens | undefined;
    readonly layer?: boolean | undefined;
    readonly web?:
        | ((
              target: IndicationTarget,
              source: InteractionSource,
              context: IndicationContext,
          ) => () => void)
        | undefined;
    readonly native?: NativeIndicationComponent | undefined;
}
function defineIndication(indication: Indication): Indication; // returns it unchanged
```

Both subpaths are in `package.json` `exports` and `vite.config.ts` entries. Specs:
`src/interaction.spec.ts` (reducer, subscribers, origins, the augmented `"app:longPress"` kind
narrowing in a `switch` beside pureform's, `@ts-expect-error` for wrong details and undeclared
kinds), `src/indication.spec.ts`.

### `@pureform/machines`: what each machine emits

New dependency `@pureform/binding-core` (catalog; one lockfile line; omni dependency). Module
`src/interaction/` (also the subpath `@pureform/machines/interaction`):

- `InteractionEmitter(source: () => MutableInteractionSource | undefined)`: one surface's
  emitter; remembers what it emitted so each change is emitted once. `press(origin, pointer, el?)`,
  `release(el?)`, `cancel(el?)`, `pointerDown(event, el)` (primary button, claims the event, presses
  from `clientX/Y`, releases or cancels on the window's `pointerup`/`pointercancel`, capture phase),
  `keyDown(event, el)` (claims, ignores repeats, presses from `"center"` with `"keyboard"`),
  `keyUp(el?)`, `pointerOver(event, el)` (no hover for touch), `hoverEnter`/`hoverExit`,
  `focusIn(el)` (visible as `:focus-visible` says), `focus(visible, el?)`, `blur(el?)` (also
  cancels a keyboard press), `dragStart`/`dragStop`, `end(el?)` (cancel, drag stop, hover exit,
  blur), `pressing` (the pointer kind of the press in progress).
- `InteractionEmitters(prop)`: a machine's emitters in its refs: `own` (to `interactionSource`),
  `item(value)` (to `itemInteractionSource(value)`), `end()`, `highlighted`.
- `claimEvent(event)`: a `WeakSet` over native events (React's `nativeEvent`); the first
  (innermost) surface to ask gets it.
- `withInteraction(machine, watch?)`: wraps a Zag machine: emitters in `refs.interaction`, a
  top-level effect that ends them when the machine stops, and `watch` after the machine's own.
  `emittersOf(service)`, `chainProps(props, extra)` (handlers run Zag's first), `pointerKind`,
  `isFocusVisible`, `isOwnFocusEvent`; types `InteractionProps`, `ItemInteractionProps` (also
  from the root entry), `WithProps`, `SchemaOf`.

| Machine (namespace)         | Prop                           | Emits                                                                                                                                                                                                | Ends what's in progress when                          |
| --------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `button`                    | `interactionSource`            | root: pointer press (origin, pointer kind) through `PRESS.START`, released on `PRESS.END`, cancelled on `PRESS.CANCEL` or a keyboard press's `BLUR`; Enter/Space press from the center; hover; focus | disabled (prop or fieldset), stop                     |
| `checkbox`, `switchControl` | `interactionSource`            | root (label): pointer press, hover; native input: Space press, focus/blur                                                                                                                            | disabled (`disabled` / `isDisabled`), stop            |
| `radioGroup`                | `itemInteractionSource(value)` | per radio: item (label) pointer press, hover; its input Space press, focus/blur                                                                                                                      | group disabled, stop                                  |
| `slider`                    | `interactionSource`            | input: `POINTER.DOWN` emits press + `dragStart`; `POINTER.UP` emits `dragStop` + release (cancel on `pointercancel`); hover; focus                                                                   | disabled, stop                                        |
| `tabs`                      | `itemInteractionSource(value)` | per tab: pointer press, Enter/Space press, hover, focus                                                                                                                                              | stop                                                  |
| `navigation`                | `itemInteractionSource(value)` | per destination: pointer press, Enter (and Space unless it's `a[href]`) press, hover, focus                                                                                                          | disabled, stop                                        |
| `menu`, `select`            | `itemInteractionSource(value)` | the highlighted item hovers (origin `undefined`); pointer press on an item; Enter/Space on the content presses and releases the highlighted item at once (origin `undefined`)                        | close (`hasTag("open")` false), select disabled, stop |

The emit's `origin` argument is the element the handler ran on (the root, the input, the item),
except `undefined` for a highlight's hover and a list's key press. The dialog and tooltip stay
Zag's, unchanged; the text field, search bar, snackbar, and ripple machines don't emit.

**The button machine** (own): context `interaction: InteractionState` mirrors the source (effect
`trackInteractionSource` subscribes at start and ends the emitter on stop); `hovered` and
`focusVisible` left its context; refs `interaction: InteractionEmitter` to
`prop("interactionSource")`, or a source of its own made when it first emits. `PRESS.START` now
carries `{ source, origin, pointer }`. API `pressed`, `hovered`, `focusVisible` = `!disabled &&
interaction.<state>` (so a press another component emits to a shared source shows); `focused`
from its context. Parts no longer carry `data-active`, `data-hover`, `data-focus-visible` (they
keep `data-focus`, `data-disabled`, `data-state`). Focus handlers ignore focus bubbling from
inside the root.

### How a binding passes a source in

`packages/solid/src/interaction.ts` (internal): `ownInteractionSource()` and
`itemInteractionSources()` return `{ interactionSource }` / `{ itemInteractionSource }` on the
client and `{}` on the server (`isServer`); a Root calls one once and spreads it into its machine
props. React: `packages/react/src/interaction.ts`, `useOwnInteractionSource()` /
`useItemInteractionSources()`, the same in a `useState` initializer (`isServer` from `env.ts`).

```tsx
// Solid Root
const interaction = ownInteractionSource();
const service = useMachine(checkbox.machine, () => ({ id, ...interaction, dir: dir(), … }));
```

Wired in both bindings: `pressable.ts` (chip, icon button, FAB), button, checkbox, switch, slider
(own); radio group, menu, select, tabs, navigation bar and rail (per item). Item sources are made
the first time the machine asks for one (`createInteractionSources`). Nothing else changed: the
bindings still mark `pressed` from `api.pressed` (button machine), Zag's `active` (checkbox,
switch, radio), `api.dragging` (slider), and the menu's and select's highlight as `hover`.

## Deviations from the design

- **Listeners get the emit's origin** as a third argument; the design's listener took two. Without
  it, p9c couldn't tell an element's own state from a forwarded one. Recorded in §9.8.
- **The interface commit also holds the source** (`/interaction`), since `Indication` refers to
  `InteractionSource`; it's still one early commit, before any machine change.
- **`IndicationTokens` and `NativeIndicationProps` were not specified**; their shapes above are
  this phase's choice. `native` is typed structurally (`NativeIndicationComponent`), not React's
  `ComponentType`, so binding-core doesn't depend on React.
- **Composites take one source per item** (`itemInteractionSource(value)`), since each radio,
  tab, item, option, and destination is its own surface. Recorded in §9.8.
- **Menu and select key presses release at once** (press, then release on the same keydown): the
  key chooses the item as it goes down and the list usually closes.
- **"Touch never hovers"** is enforced twice: machines skip hover for `pointerType` `touch`, and
  the state isn't hovered during a touch press.
- **`createInteractionSources`** and the **`@pureform/machines/interaction` subpath** are new.

## Stubs and gaps

- **No `interactionSource` / `indication` props or public hooks yet** (p9c on the web, p9d on
  React Native). The bindings' helpers are internal.
- **The button's mirror subscribes once**, at machine start, to the source it had then. Swapping
  `interactionSource` on a mounted button emits to the new one (read at each emit) but its API keeps
  reading the old one. p9c: either key the machine on the source or resubscribe in a `watch`.
- **Per-item `disabled`** (a tab, a radio, a destination, a menu item) stops new interactions but
  doesn't end one in progress; only the machine's own `disabled` does (ending from `connect` would
  emit during render).
- **Not emitting**: card and list item (no machine), the snackbar's action and close (the snackbar
  machine), the search bar and text fields (by design), the select's trigger. p9c wires what needs
  indication from the anatomy table.
- **React Native** is untouched: it still uses `usePress`/`useInk` (p9d).
- **No virtual (screen reader) clicks** are emitted; `"virtual"` is only `pointerKind("")`.

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/binding-core` (`interaction.spec.ts`,
  `indication.spec.ts`), `@pureform/machines` (219 tests, `src/interaction/interaction.spec.ts`:
  each machine's sequence for pointer, touch, keyboard, disabled mid-press/drag, nested
  pressables, a shared source, stop, close), `@pureform/solid`, `@pureform/react`: pass.
  Workspace `build` + `test:unit`: pass (142 results, none failed).
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 13140 passed, 294 skipped (six
  projects), as after p6e.
- `task_run` `test:unit` on `@pureform/react-native` and `test:e2e` on `@pureform/rn-web-demo`:
  pass.
- **Equivalence in Chromium** (not committed; `/tmp/opencode/p9a-eq/equivalence.tmp.e2e.test.ts`,
  `cmp3.py`): a temporary suite file mounted every component case's renderings on all six
  projects and recorded every element's full computed style (hashed, properties sorted) at rest,
  and per interactive element (up to four) hovered, pointer-pressed, focused, key-pressed, and
  after. Two runs on the old machines (before, before2) against two on the new (after, after2):
  10,572 snapshots per run; every snapshot matches, except 24 that vary between runs of the same
  code (Solid's open menus, selects, and a dialog: Zag's placement timing). Of those, one key
  (`Select|error|1|pointerdown` on solid/panda) never took the before value in the after runs, but
  the same two outcomes (placed and highlighted, or not yet placed) occur in the before runs of
  the other Solid projects. Move the file into `tests/component-suites/src/`, run it with
  `VITE_EQ_TAG=<tag>`, and it writes `tests/.eq/<tag>-<project>.json`.

## Notes for the next phases

- **p9c**: build on `fcb887d`'s types. Wire `interactionSource` as `props.interactionSource ??
own` into the same machine props (`interactionSource` / `itemInteractionSource`); for item
  surfaces, call the item getter at render so the source exists before the indication's effect.
  An emit's `origin` is the element the machine's handler ran on: treat `undefined` or another
  element as forwarded (`data-pf-hover`/`data-pf-active`). Today's `data-pf-hover` on the
  highlighted menu item/option comes from the binding's `hover: highlighted`; the source now says
  the same with `origin` `undefined`. The js-effects ripple has its own claim set; once the ripple
  reads the source, drop its pointer listeners rather than claiming twice.
- **p9d**: `@pureform/machines/interaction`'s `InteractionEmitter` works without the DOM through
  `press({ x: pageX, y: pageY }, "touch", view)`, `release`, `cancel`, `hoverEnter`, `focus`,
  `blur` (its `pointerDown`/`focusIn` helpers need DOM elements). `NativeIndicationProps.surface`
  is meant for `useInk`'s inputs (`style.color`, `style.borderRadius`, the slot's drawing).
- **p9e**: a machine's sequence is checked in `machines/src/interaction/interaction.spec.ts`;
  the shared suite can observe sources once p9c adds the prop.
- **Traps**: React's Zag adapter runs `watch` on every render (its `track` is a hook): keep state
  in refs (`emitters.highlighted`), never in `watch`'s locals. Zag's vanilla harness re-adds
  listeners on every render, so a render during an event's dispatch (Zag's own Space listener on
  the checkbox) drops the new handlers for that event: dispatch key events in harness specs rather
  than `userEvent.keyboard`. `@ts-expect-error` above a multi-line call that oxfmt reflows can
  land on the wrong line: put the bad value in a variable first.
- **Lockfile**: one line added by hand (`@pureform/binding-core` in the machines workspace block);
  `bun install --frozen-lockfile` reported no changes.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
