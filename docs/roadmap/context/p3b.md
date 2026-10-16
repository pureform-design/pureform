# p3b: React button and checkbox (output context)

Commits: 0a71e84..7c2c32b, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `0a71e84` | `feat(react)`: `@pureform/react/button`, `@pureform/react/checkbox`, `createPartContext`, `useMachine`, specs |
| `f9d91e3` | `feat(react-demo)`: the new `apps/react-demo` (Vite, React, Panda target)                                     |
| `7c2c32b` | `docs(design)`: "Built (p3b)" notes in §9.1 and §9.4                                                          |

## Built

### File layout (mirrors Solid's)

```
packages/react/src/
    part-context.ts    createPartContext (root export)
    machine.ts         useMachine (internal): Zag's, typed so each machine prop may be undefined
    props.ts           + omitProps (internal): props without Root's own keys
    button/
        button.tsx     Root, Label, Icon, TouchTarget, ReadyMade → export const Button
        index.ts       "use client"; the subpath's exports
        button.spec.tsx
    checkbox/
        checkbox.tsx   Root, TouchTarget, Input, Box, CheckIcon, IndeterminateIcon, ReadyMade → Checkbox
        index.ts
        checkbox.spec.tsx
    testing/render.tsx + outside (a value set from the test), quietly, Errored (error boundary)
    __fixtures__/registry.ts  now Solid's copy: adds the fake checkbox factory
```

`packages/react/package.json`: subpaths `./button` and `./checkbox` (`types` →
`dist/<name>/index.d.ts`; `import` → `development: src/<name>/index.ts`, default
`dist/<name>.mjs`), new dependency `@zag-js/core` (types for `useMachine`). `vite.config.ts` has
an entry per subpath; each entry file starts with `"use client"`, which the build keeps (shared
code goes into `.js` chunks beside them). Components aren't re-exported from the root entry.

### Public API

```ts
// @pureform/react/button
export const Button: typeof ReadyMade & { Root; Label; Icon; TouchTarget };
export type { ButtonProps, ButtonRootProps, ButtonPartProps, ButtonIconProps };
interface ButtonRootProps extends Omit<PartProps, keyof ButtonRootOwnProps>, ButtonRootOwnProps {
    as?: ElementType;
}
interface ButtonPartProps extends PartProps { unstyled?: boolean }
interface ButtonIconProps extends ButtonPartProps { mirror?: boolean }
interface ButtonProps extends Omit<ButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
    SlotKeyedProps<Anatomy>, ButtonContentProps<ReactNode> {}

// @pureform/react/checkbox
export const Checkbox: typeof ReadyMade & { Root; TouchTarget; Input; Box; CheckIcon; IndeterminateIcon };
export type { CheckboxProps, CheckboxRootProps, CheckboxPartProps, CheckedState };

// @pureform/react (root)
createPartContext<T>(component: string): PartContext<T>; // { Provider: Context<T | null>; use(part): T }
```

`PartProps` includes `ref`, so every part and Root take one (React 19 ref-as-prop).

Parts, elements, machine props, states, and DOM order are exactly p3a's tables. Root wiring:
`useId()`, `useDirection()`, `useControllable`, `useMachine(machine, { id, dir,
...buttonMachineProps(props) | checkboxMachineProps(props, fieldsetDisabled),
...controllable.machineProps })`, `connect(service, normalizeProps)`, one `useComponent` with
`buttonSelection(props)`/`checkboxSelection(props)`, and `omitProps(props, *_ROOT_PROPS)` minus
`as` for the element. Checkbox Root also keeps the input in state (`useState` setter as the
Input's ref), `useFieldsetDisabled(input)`, `useFormReset(input, { resetsTo:
checkboxNativeDefault(...), onBeforeReset, onReset: send CHECKED.SET checkboxResetState })`, and
`pressed: service.context.get("active")`.

### Strict control of the checkbox input (React's timing)

Input merges `{ onClick }` after Zag's hidden-input props. The handler queues a microtask after
Zag's queued send; it calls Root's stable `restoreInput(element)`, which, when controlled, runs
`syncCheckedInput(element, value)` with the value last committed (a ref updated in a layout
effect). Reading the machine doesn't work in React: Zag's uncontrolled bindable only updates on
render, and the owner's render may land before or after the microtask. If the owner takes the
change, its render moves the prop, and Zag's `syncInputElement` watch writes the input.
Uncontrolled, the browser's toggle already is the new state. Removing the restore fails "asks
to change, and moves only with the prop" and "stays indeterminate when the owner ignores a
click".

### Tests

`button.spec.tsx` (15) and `checkbox.spec.tsx` (22), Solid's specs case by case: same names,
same assertions, React idioms (`className`, camelCase styles, `htmlFor`, `interact()` around
`userEvent`, `outside()` instead of signals, an error boundary for "throw outside Root"). The
button's "forwards …" case also checks `ref`. `provider.spec.tsx` now imports `quietly` and
`Errored` from `testing/render.tsx`.

### The React demo: `apps/react-demo` (`@pureform/react-demo`)

Choice: **a new minimal app on the Panda target**, not the RN-web demo (that one renders React
Native Web, not DOM parts with Panda classes). Scaffolded with `ts-package` (`app`). Vite with
`@pandacss/vite` and `@vitejs/plugin-react`; `index.html` → `src/main.tsx` → `src/App.tsx`
(button variants, disabled, sizes with icon, colors, mirrored icon, toggle, a composed button,
checkbox states, an indeterminate parent over three children, a form with submit and reset, a
direction switch). `.pureform/` and `panda.pureform.ts` are copies of `solid-demo`'s;
`panda.config.ts` uses `@pandacss/preset-base` plus the pureform preset with `.pureform/panda`'s
`staticCss`. tsconfig includes `.pureform/**/*.*` (with `rootDir: "."`). omni: `prepare` is
`bun x panda codegen`, `build` appends it; cache keys include `panda.config.ts`,
`panda.pureform.ts`, `.pureform/**/*`. `styled-system/` is ignored by the app's `.gitignore`.

## Deviations from the design

- **`className` for slot-keyed classes, `ReactNode` content, values for state**, as p2b set; no
  other API difference from Solid.
- **A `useMachine` wrapper** (`src/machine.ts`, internal): `@zag-js/react`'s takes
  `Partial<Props>`, which rejects `undefined` under `exactOptionalPropertyTypes`; the wrapper's
  `MachineProps<T>` matches Solid's port. Zag drops `undefined` props itself.
- **`omitProps`** rather than destructuring every key: it takes binding-core's `*_ROOT_PROPS`
  lists, so React can't drift from them.
- **The restore after a click** reads the last committed controlled value, not the machine (see
  above). Recorded in §9.4.

## Stubs and gaps

- Same as p3a: no axe, direction, or SSR checks yet (p3c); no link button (`as="a"` still gets
  `type`/`disabled`); Zag's own fieldset tracking still runs.
- `apps/react-demo` has no tests of its own; p3c's shared suites can render against it. Its
  `.pureform/` is hand-written (p4b-panda generates it, p4c migrates it), and its preset config is
  a copy of `solid-demo`'s that must be kept in step until then.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" (257 of 258 e2e).

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/react`: 144 passed, 2 todo (counting the
  type-check run). `build` on `@pureform/react-demo`: passes. Workspace `build` + `test:unit`:
  pass except the pre-existing rn-parity e2e case.
- Single run: `cd packages/react && set -a; source ../../.env.local; set +a; bun x vitest --config
vitest.config.unit.ts run src/button src/checkbox`.
- Types: `bun x tsc --noEmit -p apps/react-demo/tsconfig.json` passes; `variant="nope"` on a
  `Button` and `size` on a `Checkbox` are errors there (checked by hand).
- The page: `bun x vite preview` in `apps/react-demo` after a build; clicked by hand through
  Playwright (toggle, indeterminate parent, required checkbox blocking submit).

## Notes for the next phases

- **p3c:** both bindings export the same names; render React with `@testing-library/react` and
  `act` (`interact()`), Solid with its mount. Select with `testIds.*`, name checkboxes with
  `aria-label`. For React pages with real styles, use `apps/react-demo`'s registry
  (`apps/react-demo/.pureform`) after its `panda codegen`. Value changes from outside the view:
  `outside()` in `packages/react/src/testing/render.tsx`.
- **p6 (React half):** copy a `button/` or `checkbox/` folder; use `createPartContext`,
  `useMachine` from `../machine`, `omitProps(props, <NAME>_ROOT_PROPS)`; add the subpath to
  `package.json` and `vite.config.ts`, with `"use client"` at the top of its `index.ts`. Switch
  and radio copy the checkbox's input state, restore click, form reset, and fieldset wiring.
- **p4b-panda / p4c:** two apps now hold a hand-written `.pureform/` (`solid-demo`,
  `react-demo`); generate both.
- **bun.lock:** edited by hand again (the generator's install and `--lockfile-only` re-resolved
  commander, lightningcss, aria-query); kept only the workspace hunks, then `bun install
--frozen-lockfile` reported no changes.
