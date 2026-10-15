# rn-web-demo

pureform's React Native adapter, rendered in the browser by React Native Web. No native tooling
is involved: Vite aliases `react-native` to `react-native-web`.

```sh
bun run dev
```

- `vite.config.ts`: a small plugin builds the styles from `src/config.ts` with `precompute` and
  `runtimeStyles`, and serves both as `virtual:pureform-rn`, so the page ships only the
  runtime and the data.
- `src/components.tsx`: the core set (button, chip, checkbox, switch, card, text, avatar) on
  `Pressable`, `View`, and `Text`, styled with `useRecipe`.
- `src/App.tsx`: switches the scheme, the teal theme, precomputed or runtime styles, and an
  override of the primary color.
