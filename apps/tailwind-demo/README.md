# tailwind-demo

pureform on the Tailwind v4 target: `@pureform/solid`'s button and checkbox, and the registry's
class factories for the components that have no Solid component yet, styled by the Tailwind
stylesheet the target generates, with Tailwind utilities over pureform's tokens around them. A
client-rendered Solid app.

```sh
bun run dev
```

## How it's wired

- `pureform.config.ts`: Material's defaults and a teal theme.
- `pureform.glue.ts`: `{ target: "tailwind", options, components }`, with `prefix: "pf"` and
  `classPrefix: "pf"`, and the components the page uses. `vite.config.ts` passes it to the
  bundler plugin, which writes `.pureform/` (ignored by git) when dev or build starts, before
  Tailwind's plugin reads the stylesheet; `pureform generate` (the omni `generate` task) reads it
  too.
- `src/app.css`: `@import "tailwindcss";` then `@import "../.pureform/styles.css";`, the
  generated stylesheet (`@theme`, the `dark:`, `light:`, `motion-reduce:`, and `theme-<name>:`
  variants, and the components in `@layer components`).
- `src/main.tsx`: the page inside `PureformProvider`. Tailwind utilities over pureform's tokens
  (`bg-surface`, `text-title-large`, `rounded-small`), utilities overriding a component's own
  style through its slot classes (`class={{ root: "rounded-none" }}` on a button), and the
  adapter's `dark:` and `theme-teal:` variants. The theme buttons set the provider's `theme`,
  which writes `data-theme="teal"` on its element (`registry.themeAttributes`), the attribute
  the `theme-teal:` variant matches too.
