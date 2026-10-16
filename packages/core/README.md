# @pureform/core

The styling AST and config contract every other pureform package builds on. A config
describes tokens, utilities, and components as plain data (value nodes, conditions, style
maps), with no selectors or target syntax in it; the adapters lower it to Panda, plain CSS,
Tailwind, or React Native.

## Where it sits

```
@pureform/core  ◄── @pureform/theme, material, preset          (authoring)
                ◄── @pureform/css-lowering ◄── panda-adapter, css-adapter, tailwind-adapter
                ◄── @pureform/rn-adapter
                ◄── the bindings (planned), for the state attribute names
```

It depends on nothing else in the workspace.

## Architecture

| Module                | What it holds                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ast/nodes.ts`        | The node types: values (`literal`, `alias`, `dynamic`, `conditional`, `platform`, …) and conditions (portable states, slot states, sizes). |
| `ast/helpers/`        | Constructors for every node (`px`, `hex`, `alias`, `when`, `slot`, …), one module per group.                                               |
| `types.ts`            | The config schema: `CoreConfig`, component specs, utilities, themes.                                                                       |
| `define.ts`           | Builders: `defineConfig`, `defineComponent`, `defineSlotComponent`, the utility builders, `mergeConfigs`, `meta`.                          |
| `typed.ts`            | `typed()`: helpers typed from a registered config, so aliases and breakpoints autocomplete.                                                |
| `path.ts`             | Path resolution (`getByPath`, `resolveAlias`) and `validateConfig`, which `defineConfig` runs.                                             |
| `inline.ts`           | `inlineStyles` and `mergeStyles` for style maps.                                                                                           |
| `state-attributes.ts` | `STATE_ATTRIBUTES`: the `data-pf-*` names the web bindings set and the web adapters match.                                                 |

## Public API

| Entry                          | Exports                                                                  |
| ------------------------------ | ------------------------------------------------------------------------ |
| `@pureform/core`               | Builders, `typed`, path resolution, `STATE_ATTRIBUTES`, the schema types |
| `@pureform/core/ast`           | Node types and every helper constructor                                  |
| `@pureform/core/ast/helpers/*` | One helper group per module (`keyword`, `color`, …)                      |
| `@pureform/core/types`         | The schema types alone                                                   |
| `@pureform/core/raw`           | The untyped builders, to opt out of `typed()` explicitly                 |

```ts
import { defineComponent } from "@pureform/core";
import { px, unitless, when } from "@pureform/core/ast";

export const button = defineComponent({
    name: "button",
    recipe: {
        base: {
            paddingInline: px(16),
            opacity: when("disabled", unitless(0.38), unitless(1)),
        },
    },
});
```

### State attributes

On the web a state is matched on the native pseudo-class first (`:hover`, `:checked`,
`:disabled`, …), then an ARIA attribute (`aria-checked`, `aria-selected`,
`aria-disabled`, …), and only where neither covers it on one of pureform's own attributes:

```ts
import { STATE_ATTRIBUTES } from "@pureform/core";

STATE_ATTRIBUTES.hover; //   "data-pf-hover"    hover driven by another element
STATE_ATTRIBUTES.pressed; // "data-pf-active"   a press :active misses (keyboard)
STATE_ATTRIBUTES.dragged; // "data-pf-dragging"
STATE_ATTRIBUTES.filled; //  "data-pf-filled"   a value outside a text input
```

A binding sets exactly these; a behavior library's own attributes (Zag's `data-state`,
`data-hover`, …) are never matched. See the design doc's
[§5.1](../../docs/design/component-architecture.md#51-two-kinds-of-factory-pureformstyling).

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`, one bundle per entry.
- `test:unit`: Vitest, with type checks.

## Worth knowing

- Core never encodes selectors: conditions are names (`"hover"`, `slot("root", "checked")`),
  and each adapter owns the lowering. `STATE_ATTRIBUTES` is the one place a web name lives
  here, because both the bindings and the CSS must agree on it.
- `rawCondition` is the escape hatch for a selector the portable set can't express.
