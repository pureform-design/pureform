# rn-web-demo

pureform's React Native adapter, rendered in the browser by React Native Web. No native tooling
is involved: Vite aliases `react-native` to `react-native-web`, and picks `react-native-svg`'s
web build by its `.web.js` files.

```sh
bun run dev
```

- `vite.config.ts`: a small plugin builds the styles from `src/config.ts` with `precompute` and
  `runtimeStyles`, and serves both as `virtual:pureform-rn`, so the page ships only the
  runtime and the data.
- `src/parts.tsx`: what the components share, including the views and hook that follow the
  chosen animation engine.
- `src/components.tsx`: the core set (button, chip, checkbox, switch, card, text, avatar) on
  `Pressable`, `View`, and `Text`, styled with `useComponentStyles`.
- `src/App.tsx`: switches the scheme, the teal theme, precomputed or runtime styles, Animated
  or Reanimated, drawing with SVG or not, and an override of the primary color. The shapes section draws icon
  buttons, a FAB, an avatar, and media in Material's shapes, with `SvgDrawing`, and ripples
  clip to them with `useSvgRipple`.
