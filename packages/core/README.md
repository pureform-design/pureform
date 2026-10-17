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

| Module                | What it holds                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ast/nodes.ts`        | The node types: values (`literal`, `alias`, `dynamic`, `conditional`, `platform`, …) and conditions (portable states, slot states, sizes).   |
| `ast/helpers/`        | Constructors for every node (`px`, `hex`, `alias`, `when`, `slot`, …), one module per group.                                                 |
| `types.ts`            | The config schema: `CoreConfig`, component specs, utilities, themes.                                                                         |
| `define.ts`           | Builders: `defineConfig`, `defineComponent`, `defineSlotComponent`, the utility builders, `mergeConfigs`, `meta`.                            |
| `typed.ts`            | `typed()`: helpers typed from a registered config, so aliases and breakpoints autocomplete.                                                  |
| `path.ts`             | Path resolution (`getByPath`, `resolveAlias`) and `validateConfig`, which `defineConfig` runs.                                               |
| `inline.ts`           | `inlineStyles` and `mergeStyles` for style maps.                                                                                             |
| `state-attributes.ts` | `STATE_ATTRIBUTES`: the `data-pf-*` names the web bindings set and the web adapters match.                                                   |
| `motion.ts`           | `MOTION_ATTRIBUTE` and `MotionSetting` for the provider's motion setting, and `transitionMoves`/`valueTypeMoves`: what reduced motion stops. |

## Public API

| Entry                          | Exports                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `@pureform/core`               | Builders, `typed`, path resolution, `STATE_ATTRIBUTES`, `MOTION_ATTRIBUTE`, `transitionMoves`, the schema types |
| `@pureform/core/ast`           | Node types and every helper constructor                                                                         |
| `@pureform/core/ast/helpers/*` | One helper group per module (`keyword`, `color`, …)                                                             |
| `@pureform/core/types`         | The schema types alone                                                                                          |
| `@pureform/core/raw`           | The untyped builders, to opt out of `typed()` explicitly                                                        |

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

### Indication

A component spec's `indication` says where it shows Material's state layer, ripple, and focus
indicator: one `IndicationDeclaration` per interactive surface, `{ trigger, surface, centered,
focus }`, each a slot (typed recipes check them). `@pureform/anatomy` derives each component's
`indication` entry from it, so bindings wire every component the same way.

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
STATE_ATTRIBUTES.mirrored; // "data-pf-mirror"  an icon that points, flipped under rtl
```

`mirrored` isn't a state the user changes but a marking: the `mirrored` condition (one of
the portable conditions, beside `rtl`) holds on an element that should flip with the writing
direction. The web matches `data-pf-mirror`; React Native reads the `mirrored` state.

A binding sets exactly these; a behavior library's own attributes (Zag's `data-state`,
`data-hover`, …) are never matched. See the design doc's
[§5.1](../../docs/design/component-architecture.md#51-two-kinds-of-factory-pureformstyling).

### Reduced motion

Reduced motion stops movement only. `transitionMoves(property)` says whether a transition of a
style property, or of a dynamic value, moves something: colors (any `…Color`), `fill`,
`stroke`, `opacity`, `boxShadow`, `textShadow`, and `filter` fade and keep running; anything
else, `"all"` included, moves. A dynamic value goes by its `valueType`
(`valueTypeMoves`): lengths, percentages, angles, and numbers move; colors, times, and untyped
values don't.

```ts
import { MOTION_ATTRIBUTE, transitionMoves } from "@pureform/core";

transitionMoves("backgroundColor"); // false
transitionMoves("insetInlineStart"); // true
MOTION_ATTRIBUTE; // "data-pf-motion", set to "reduce" or "full" by a provider
```

### Variable fonts

`fontVariationSettings` takes `fontVariations({ AXIS: value })`, a variable font's axes by
four-letter tag. Icon fonts use it for Material Symbols' fill:

```ts
import { fontVariations, unitless } from "@pureform/core/ast";

fontVariations({ FILL: unitless(1) }); // web: "FILL" 1
```

The web writes it as `font-variation-settings`; React Native has no variable font axes and
drops it.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`, one bundle per entry.
- `test:unit`: Vitest, with type checks.

## Worth knowing

- Core never encodes selectors: conditions are names (`"hover"`, `slot("root", "checked")`),
  and each adapter owns the lowering. `STATE_ATTRIBUTES` is the one place a web name lives
  here, because both the bindings and the CSS must agree on it.
- `rawCondition` is the escape hatch for a selector the portable set can't express.
