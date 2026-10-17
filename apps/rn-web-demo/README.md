# rn-web-demo

pureform's React Native binding, `@pureform/react-native`, rendered in the browser by React Native
Web. No native tooling is involved: Vite aliases `react-native` to `react-native-web`, and picks
`react-native-svg`'s web build by its `.web.js` files.

```sh
bun run dev
```

- `pureform.config.ts`: the config (Material's defaults and a teal theme, two shapes that morph
  while pressed, a panel laid out by its container's width, a gradient swatch, and a square whose
  typed tokens tween), and the components the page draws.
- `pureform.glue.ts` and `vite.config.ts`: the bundler plugin (`@pureform/bundler/vite`, target
  `native`) writes `.pureform/` (ignored by git) when dev or build starts: one `StyleFactory`
  module per component and the registry. A small plugin serves `virtual:pureform-rn`: the same
  components' styles resolved at runtime, each one's instance token keys, and each brand's
  primary family, so the page ships the runtime and the data, not the config, the lowering, or
  the color library. `bun x pureform generate` (the omni `generate` task) writes `.pureform/`
  without a dev server, for `tsc`.
- `src/App.tsx`: the page, `@pureform/react-native`'s components under its `PureformProvider`.
  It switches the scheme, the teal theme, the registry (precomputed, or a registry of
  `nativeFactory` over the runtime styles), reduced motion (`motion`), slow motion (`timeScale`),
  the motion engine (Animated or Reanimated, with or without SVG), and an override of the primary
  color. The shapes section draws icon buttons, a FAB, an avatar, and media in Material's shapes,
  and ripples clip to them.
- `src/custom.tsx`: the config's own components (panel, swatch, tweens) on the package's hooks
  (`useSelectedStyles`, `useComponentSlots`), and the shapes and picture the page shows.

## Test

`test:e2e` (`vitest.config.e2e.ts`, over the demo's own Vite config) renders the page in
Chromium: every component's parts by test id, each drawing its generated factory's styles, the
runtime registry drawing the same, the scheme switch, the controls, the select's menu, tabs and
navigation, shapes drawn with SVG under each engine without losing the page's state, and a ripple
in each surface the anatomy names (the controls' and the snackbar's buttons too). Set
`CHROMIUM_PATH` (`.env.local`) to use a system Chromium.
