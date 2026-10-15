# css-demo

pureform with no framework and no Panda: the CSS adapter's Vite plugin serves the stylesheet and
the class name functions as virtual modules, and the page builds its markup with plain DOM
calls.

```sh
bun run dev
```

- `src/config.ts`: the config, Material's defaults and a teal theme.
- `vite.config.ts`: `pureformCss({ config, dts: "src/pureform.d.ts" })`. The plugin writes the
  declarations for `virtual:pureform/components` there.
- `src/main.ts`: imports the reset, the stylesheet, and the class name functions, and switches the color scheme
  (a class on the root) and the theme (`data-theme`).

The built app's script is under 9 kB: the config, providers, and color generation stay at build
time.
