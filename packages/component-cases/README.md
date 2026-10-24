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
- `src/aria.ts`: the renderer-neutral readers (`byRole`, `allByRole`, `checkedOf`, `flagOf`,
  `valueNowOf`, `textValueOf`, `nameOf`, `choiceNamed`, …).
- `src/user-event.ts`: the `UserEvent` the cases act with. They don't import a runner's:
  `createCases(userEvent)` sets it, and every action (`state.act`, a form's `satisfy`, an
  overlay's `open`) calls through it, so call it before running any.

Cases find elements by the anatomy's test ids or by role and name, and read state only through
ARIA (`src/aria.ts`): roles (explicit, or a native element's), `aria-checked`, `aria-pressed`,
`aria-selected`, `aria-expanded`, `aria-current`, `aria-valuenow`, `aria-disabled`, accessible
names, and a textbox's value. Never web-only DOM properties, data attributes or styles, so the
same reads run on the web bindings' DOM and React Native Web's (Storybook's `storybook/native`
plays). An overlay's trigger is found by its role and name and read by `aria-expanded`; its
surface by its role anywhere in the document. Two readings ARIA can't give are documented where
they're made: a search view or snackbar on its way out on the web (`leavingOnWeb`), and the
rating's 0, which ARIA reads as 1 (the cases never read it). The `form` and `overlay` parts are
the web suites' (native forms, Zag's positioners) and still read the web's DOM. `examples` stay
plain data a server render can take.

## Adding a component

Write `src/cases/<name>.ts`, add it to `COMPONENTS` in `src/cases.ts`, and its name to
`COMPONENT_NAMES` in `src/scene.ts`; then follow `tests/component-suites`' README to render it in
each binding.
