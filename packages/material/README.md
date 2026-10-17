# @pureform/material

Material Design 3 as pureform providers: the color scheme generated from a seed, the type scale,
shapes, layout and density, state opacities, motion, and elevation. Each fills one of
`@pureform/theme`'s contracts, so `@pureform/preset`'s `pureform()` defaults to Material and an app
can swap any domain for its own. It also ships `seedTheme`, a runtime theme that generates a
Material palette in the browser or on the server.

## Where it sits

```
@pureform/core, @pureform/theme (contracts), @pureform/styling (runtime themes' shape)
                 │
@pureform/material   (this package)
                 │
@pureform/preset (pureform()), apps' pureform.config.ts, and providers' runtime themes
```

## Architecture

| Folder           | What it holds                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `color-scheme/`  | Material's color math: HCT, tonal and core palettes, the light and dark schemes               |
| `typography/`    | The type scale and its types                                                                  |
| `elevation/`     | Shadow and surface elevations                                                                 |
| `core-config/`   | Those values as `@pureform/core` config pieces: `palette`, `typescale`, `elevation`           |
| `providers/`     | One provider per contract: `materialColor`, `materialTypescale`, `materialShape`, …           |
| `types/`         | Shared types (`HexColor`, shape, state, units)                                                |
| `runtime-theme/` | `seedTheme` (the `/runtime-theme` subpath) and its generator, `generate.ts`, loaded on demand |

## Public API

### `@pureform/material`

```ts
import {
    materialColor,
    materialLayout,
    materialShape,
} from "@pureform/material";

pureform({
    color: materialColor({ seed: "#6750A4" }), // the palette, oklch by default
    layout: materialLayout({ density: "compact" }),
    themes: { teal: { color: materialColor({ seed: "#006A60" }) } },
});
```

Providers: `materialColor`, `materialTypescale`, `materialShape`, `materialLayout`,
`materialState`, `materialMotion`, `materialElevation`, with Material's published values
(`MATERIAL_RADII`, `MATERIAL_SIZES`, `MATERIAL_OPACITIES`, `MATERIAL_FOCUS_INDICATOR`,
`MATERIAL_DURATIONS`, `MATERIAL_EASINGS`). `materialState(opacities, focusIndicator)` changes the
state opacities (percent) and the focus indicator's thickness and outer offset (px; 3 and 2 by
default). The color math and config pieces are exported too.

### `@pureform/material/runtime-theme`

```tsx
import { seedTheme } from "@pureform/material/runtime-theme";
import { preloadTheme } from "@pureform/styling";

const theme = seedTheme({ seed: "#006A60" }); // also customSeeds, overrides, as materialColor
await preloadTheme(theme); // on the server, before rendering
<PureformProvider registry={registry} theme={theme}>
    …
</PureformProvider>;
```

The subpath itself is a few lines: the generator (Material's color math, the theme resolver, and
CSS lowering) is a separate chunk, loaded the first time a theme needs generating. It changes
every color token and role, in both schemes, and leaves the rest of the config alone, so it draws
as a named theme with `color: materialColor({ seed })` does. Its numbers are rounded to 10
significant digits, since Node and Chromium differ in the last digits and the server's block and
the client's must match.

## Build and test

Through the omni MCP's `task_run`: `build` (two entries, `index` and `runtime-theme`, plus the
generator's chunk) and `test:unit` on `@pureform/material`.

## Worth knowing

- A seed theme only has Material's base color groups, plus any `customSeeds`. A group the app's
  base config adds without a seed keeps its base colors under the theme.
- Design doc: §5.6 (themes) and §5.7 (runtime themes and server rendering).
