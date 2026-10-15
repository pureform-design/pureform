# @pureform/theme

Typed contracts for what pureform components read from each design foundation, and the
providers that fill them.

A theme is one provider per contract. Material's providers live in `@pureform/material`;
this package holds the contracts, the helpers for writing providers, and a few non-Material
providers. `pureform()` in `@pureform/preset` defaults every contract to Material and takes
any provider in its place.

## Contracts

| Contract     | Requires                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`      | The surface roles (`surface`, `onSurface`, the container steps, `outline`, `scrim`, …) and, per color group, `g`, `onG`, `gContainer`, `onGContainer` |
| `typography` | `brand` and `plain` font roles and the 15 Material text styles. Add roles and styles freely                                                           |
| `shape`      | Radii `none`, `extraSmall`, `small`, `medium`, `large`, `extraLarge`, `full`                                                                          |
| `layout`     | Spacing steps `0` through `16` and sizes `iconSmall` through `touchTarget`                                                                            |
| `state`      | Opacities `stateHover`, `stateFocus`, `statePressed`, `stateDragged`, `disabledContainer`, `disabledContent`, `scrim`                                 |
| `motion`     | Durations `short1` through `extraLong4` and easings `standard` through `linear`                                                                       |
| `elevation`  | A `{ shadow, tint }` pair for each of `level0` through `level5`                                                                                       |

Each contract is a TypeScript type, so a missing name or a value of the wrong kind fails to
compile. `resolveTheme()` checks both again at runtime and names the provider and the slot.

## Use a provider

```ts
import { materialColor, materialState } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { modularScale, roundedShape, tonalElevation } from "@pureform/theme";

pureform({
    color: materialColor({ seed: "#0047AB" }),
    typography: modularScale({ ratio: 1.25 }),
    shape: roundedShape({ base: 6 }),
    elevation: tonalElevation(),
    state: materialState({ stateHover: 6 }),
});
```

Domains you leave out use Material's provider.

## Change part of a provider

`extend` rewrites what a provider generates and keeps its contract type:

```ts
import { hex, when } from "@pureform/core/ast";
import { extend } from "@pureform/theme";

const color = extend(materialColor(), (out) => ({
    ...out,
    roles: {
        ...out.roles,
        outline: when("dark", hex("#5c5c5c"), hex("#c4c4c4")),
    },
}));
```

## Hand-author a contract

Each domain has a `*FromTokens` helper:

```ts
import { px } from "@pureform/core/ast";
import { shapeFromTokens } from "@pureform/theme";

const shape = shapeFromTokens({
    radii: {
        none: px(0),
        extraSmall: px(2),
        small: px(4),
        medium: px(6),
        large: px(8),
        extraLarge: px(12),
        full: px(9999),
    },
});
```

For colors, `oklchPalette` builds the whole contract from a hue per group:

```ts
import { oklchPalette } from "@pureform/theme";

const color = oklchPalette({
    groups: { primary: { hue: 265 }, error: { hue: 25, chroma: 0.18 } },
});
```

## Write a provider

A provider names its domain and generates that domain's contract. It receives every contract
resolved before it (color, typography, shape, layout, state, motion, then elevation):

```ts
import { colorMix, none, pct, transparent } from "@pureform/core/ast";
import { ELEVATION_LEVELS, colorRole, defineProvider } from "@pureform/theme";

const accentElevation = defineProvider({
    domain: "elevation",
    name: "accent",
    generate: ({ color }) => ({
        levels: Object.fromEntries(
            ELEVATION_LEVELS.map((level, i) => [
                level,
                {
                    shadow: none,
                    tint: colorMix(
                        transparent,
                        colorRole(color.groups[0] ?? "primary"),
                        pct(i * 3),
                    ),
                },
            ]),
        ) as never,
    }),
});
```

A provider can return `extra`, a config fragment merged in after its contract, for tokens its
values refer to.

## Providers in this package

| Provider         | Domain     | What it does                              |
| ---------------- | ---------- | ----------------------------------------- |
| `oklchPalette`   | color      | Light and dark roles from a hue per group |
| `modularScale`   | typography | Text sizes from a base size and ratio     |
| `roundedShape`   | shape      | Radii scaled from one base size           |
| `gridLayout`     | layout     | Spacing on a grid unit, with given sizes  |
| `tonalElevation` | elevation  | A tint per level instead of a shadow      |
| `flatElevation`  | elevation  | No shadow or tint at any level            |

## Themes at build time and runtime

- **Named themes:** `pureform({ themes: { teal: { color: … } } })` emits a theme that Panda
  applies inside `[data-panda-theme=teal]`. List the names in Panda's `staticCss.themes`.
- **Runtime:** every value is a CSS var, so `themeVars(config, { scheme })` from
  `@pureform/panda-adapter` gives the vars for any config. Set them on an element to restyle
  its subtree.
- **Dark values:** pass `requireDark: true` to `pureform()` or `resolveTheme()` to reject color
  roles with no dark value.
- **Contrast:** pass `requireContrast: 4.5` (WCAG AA) to `pureform()` or `resolveTheme()` to
  reject a content role that falls below that ratio against the role it sits on, in light and
  dark, for the base theme and every named theme. `contrastFailures(color, ratio)` returns the
  failing pairs instead of throwing.
- **Density:** `gridLayout` (and `materialLayout`) takes `densities`, named steps in grid units
  from `-3` up (Material's `"0"` to `"-3"` by default), and `density`, the theme's step by name
  or units. It emits the `densityOffset` size, which dense components add to their heights, and
  the steps become their `density` variant.
