# p2c: Panda factories for button and checkbox (output context)

Commits: c845f7e..eb386ef, plus the `docs(roadmap)` commit that adds this file.

## Built

### Where they live

`apps/solid-demo/.pureform/`, committed, hand-written in the shape `pureform generate` will
write. **p4b-panda replaces the whole folder** (and p4c moves the demo onto the generator, at
which point the folder can be ignored instead of committed). Nothing outside it is
hand-written glue, except the three wiring points listed under "Wiring".

| File              | Runtime or build time | Contents                                                                    |
| ----------------- | --------------------- | --------------------------------------------------------------------------- |
| `web/button.ts`   | runtime               | `export const button: ClassFactory<"button">`                               |
| `web/checkbox.ts` | runtime               | `export const checkbox: ClassFactory<"checkbox">`                           |
| `index.ts`        | runtime               | `registry`, `themes`, `Components`                                          |
| `registry.d.ts`   | types                 | augments `@pureform/styling`'s `ComponentRegistry` with button and checkbox |
| `panda.ts`        | build time            | `staticCss` for `panda.config.ts`                                           |

### The factory module shape (what p4b-panda generates)

```ts
// .pureform/web/button.ts
import { selectionCache, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

import { button as recipe } from "../../styled-system/recipes/button"; // the per-recipe file

const vars = {
    radius: "--pf-components-button-radius", // every key of spec.tokens:
    // varName(spec.tokens[t].path, prefix) from @pureform/css-lowering
    // … 18 for button, 15 for checkbox
} as const;

const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    {
        variants: ["color", "density", "size", "variant"], // the recipe's groups
        defaults: {
            color: "primary",
            density: "inherit",
            size: "medium",
            variant: "filled",
        },
    },
    (s) => {
        const slots = recipe(s); // Panda: { [slot]: string }
        return {
            root: { class: slots.root }, // one line per slot, in the recipe's slot order
            label: { class: slots.label },
            icon: { class: slots.icon },
            touchTarget: { class: slots.touchTarget },
        };
    },
);

export const button: ClassFactory<"button"> = (s) =>
    withTokenStyle(classes(s), s.tokens, vars);
```

- `selectionCache` hands `compute` the normalized selection (every group as a string, defaults
  filled in, no tokens), so `recipe` never sees `tokens`, and `{}` and the explicit defaults
  share one frozen object.
- **Boolean groups:** Panda types a `"true"`/`"false"` group as a boolean and compares strictly,
  while the cache passes `"true"`. Neither button nor checkbox has one; for components that do
  (icon button's `toggle`, …), p4b-panda must convert those groups back to booleans before
  calling `recipe` (the parity suite's `typed()` does the same).
- No compound variants in either recipe. Panda's recipe function adds compound variants as
  atomic classes itself, so the wrapper needs nothing extra for them.

### The index (`.pureform/index.ts`)

```ts
import { createRegistry } from "@pureform/styling";
import { button } from "./web/button";
import { checkbox } from "./web/checkbox";

export const registry = createRegistry({ button, checkbox }); // both static
export const themes = ["teal", "sharp", "dense"] as const; // the config's theme names
export type Components = "button" | "checkbox";
```

### The declarations (`.pureform/registry.d.ts`)

```ts
declare module "@pureform/styling" {
    interface ComponentRegistry {
        button: {
            variants: {
                color: "primary" | "secondary" | "tertiary" | "success" | "warning" | "error" | "info";
                variant: "filled" | "tonal" | "outlined" | "text" | "elevated";
                size: "small" | "medium" | "large";
                density: "inherit" | "comfortable" | "default" | "compact" | "dense";
            };
            slots: "root" | "label" | "icon" | "touchTarget";
            tokens: "radius" | "gap" | "iconSize" | … | "corner"; // every key of spec.tokens
        };
        checkbox: {
            variants: { color: …; density: … };
            slots: "root" | "touchTarget" | "input" | "box" | "checkIcon" | "indeterminateIcon";
            tokens: "size" | "boxSize" | … | "corner";
        };
    }
}
export {};
```

No `states` key: the web selection carries no states, so it defaults to `ComponentState`.

### `staticCss` (`.pureform/panda.ts`)

```ts
import type { Config } from "@pandacss/dev";
export const staticCss = {
    recipes: { button: ["*"], checkbox: ["*"] },
} satisfies NonNullable<Config["staticCss"]>;
```

A separate build-time module: the runtime modules import `styled-system/`, which doesn't exist
until Panda's codegen has run with this config. With an allow-list or pruning (§7), p4b and p7
narrow it (`[{ variant: ["filled"] }]` rules).

### Wiring

- `apps/solid-demo/panda.config.ts`: `staticCss.recipes` spreads `...staticCss.recipes` from
  `./.pureform/panda`; `button` and `checkbox` left the hand list (the rest stay until they're
  registered).
- `apps/solid-demo/tsconfig.json`: `"include": ["src/**/*.*", ".pureform/**/*.*"]`. The base
  config includes only `src`, and TypeScript's globs skip dot folders, so the augmentation is
  invisible without it.
- `apps/solid-demo`: dependency `@pureform/styling`; omni dependency and cache key
  `.pureform/**/*`. `tests/browser-e2e-tests`: dev dependency `@pureform/styling`, cache key
  `../../apps/solid-demo/.pureform/**/*`.

Nothing in the demo's pages uses the registry yet (p3c wires `PureformProvider`).

### The test

`tests/browser-e2e-tests/src/panda-factories.e2e.test.ts` (13 tests), in Chromium with the
demo's Panda config:

- the registry has `button` and `checkbox`, both static; `staticCss` keeps every variant;
- for every combination of every group's values (525 for button, 35 for checkbox, plus `{}`),
  the factory equals Panda's recipe output wrapped as `{ [slot]: { class } }`;
- every class the preset's slot recipe styles (base and each variant value, per slot) has a
  rule in Panda's stylesheet (`#/App.css?inline`), and every styled `button__*`/`checkbox__*`
  class is one the factory returns. Removing `checkbox` from `.pureform/panda.ts` fails it;
- one frozen object per selection, shared with the explicit defaults;
- each key of `spec.tokens` sets `varName(path, "pf")` on the root's `style`, and Panda's CSS
  reads that var; an empty `tokens` returns the cached object;
- in the page, `tokens: { boxSize: "30px" }` on a checkbox root makes its box 30px wide.

## Deviations from the design

- §5.2's sketch, `(s) => recipe(s)`, returns Panda's `{ [slot]: string }`; the factory maps it
  to `{ [slot]: { class } }`, caches per selection, and adds instance tokens, as p1e's types
  require. Recorded in §5.2.
- `staticCss` is its own build-time module, `.pureform/panda.ts`, rather than part of the
  factory modules. Recorded in §5.2.
- The recipe is imported from its own file (`styled-system/recipes/button`), not the
  `recipes` barrel, so a bundle keeps only the recipes it uses.

## Stubs and gaps

- Hand-written: everything in `apps/solid-demo/.pureform/`; p4b-panda generates it, p4c
  migrates the demo. No header hash yet (p4a).
- `vars` and the `registry.d.ts` unions are copied from the config by hand; a preset change to
  button's or checkbox's variants or tokens needs them updated until generation lands. The
  test catches class and token drift (it reads the preset), but not a variant added to the
  `.d.ts` types alone.
- Instance tokens are set on the root only. A slot whose own rule declares the same var would
  shadow the root's value; none does today.

## How to verify

- `task_run` `test:e2e` on `@pureform/browser-e2e-tests`: 257 of 258 pass; the failure is the
  pre-existing rn-parity "every variant value at rest" case.
- `task_run` `build` on `@pureform/site` (the demo): passes.
- Types: `bun x tsc --noEmit -p apps/solid-demo` passes; `registry.entry("button").factory({
variant: "nope" })` and `Variants<"checkbox">` with `size` are errors there.
- Single file: `cd tests/browser-e2e-tests && bun x vitest --config vitest.config.e2e.ts run
src/panda-factories` (after `set -a; source ../../.env.local; set +a`, and the demo's
  `bun x panda codegen`).

## Notes for the next phases

- **p3a, p3b, p3c:** import `registry` from the demo's `.pureform` (`index.ts`); entries are
  static, so `useClasses` needs no await. Component props can be typed with `Variants<"button">`
  and `InstanceTokens<"button">` once the app's tsconfig includes `.pureform/`.
- **p3b:** a React demo on the Panda target needs its own `.pureform/` (its own Panda codegen,
  its own `styled-system/`); copy these files and adjust the relative recipe import.
- **p4a:** the generator must tell apps to include `.pureform/` in their tsconfig (TypeScript
  skips dot folders), or emit a reference to it from somewhere included.
- **p4b-panda:** generate the module above from the compiled preset: groups from the slot
  recipe's `variants` keys, defaults from `defaultVariants`, slots from `slots`, vars from
  `spec.tokens` through `varName` with the adapter's `prefix`. Convert boolean groups. Keep the
  test passing; extend it to every registered component.
- **bun.lock:** a new workspace dependency was added by hand again (`bun install --lockfile-only`
  re-resolved commander and lightningcss); `bun install --frozen-lockfile` then reports no
  changes.
