# @pureform/component-cases

What the shared tests know about each component, without naming a framework or a test runner:
its props, the examples that cover its variants and states, the state a user changes, how it
takes part in a form, its keys, where it shows indication, and how an overlay comes and goes.
Private; `tests/component-suites` runs its rules over these cases in Solid and React, and
`apps/storybook-web` turns them into stories and play tests in every renderer.

```ts
import { createCases } from "@pureform/component-cases";
import { userEvent } from "vitest/browser"; // or `storybook/test`'s

const COMPONENTS = createCases(userEvent);
```

## What's in it

- `src/cases/<component>.ts`: one `ComponentCase` each (`button`, `switchControl`, `textField`,
  …); `src/cases.ts` lists them all as `COMPONENTS`.
- `src/types.ts`: `ComponentCase` and its parts (`StateCase`, `FormCase`, `KeyboardCase`,
  `IndicationCase`, `OverlayCase`), and helpers (`byTestId`, `ownSource`, `itemSources`).
- `src/scene.ts`: `COMPONENT_NAMES` (the ready-made components the cases cover) and
  `SceneProps`, plain-data props as every binding takes them.
- `src/user-event.ts`: the `UserEvent` the cases act with. They don't import a runner's:
  `createCases(userEvent)` sets it, and every action (`state.act`, a form's `satisfy`, an
  overlay's `open`) calls through it, so call it before running any.

Cases find elements by the anatomy's test ids and read the DOM (native elements, ARIA,
`data-state`), so `examples` stay plain data a server render can take.

## Adding a component

Write `src/cases/<name>.ts`, add it to `COMPONENTS` in `src/cases.ts`, and its name to
`COMPONENT_NAMES` in `src/scene.ts`; then follow `tests/component-suites`' README to render it in
each binding.
