# tailwind-demo

pureform in Tailwind v4: the Tailwind adapter's Vite plugin writes the stylesheet that
`src/app.css` imports after Tailwind, and serves the class name functions as
`virtual:pureform/components`.

```sh
bun run dev
```

- `vite.config.ts`: `pureformTailwind({ config, outFile, dts })` before `tailwindcss()`. Both
  generated files are gitignored and written when the dev server or build starts.
- `src/main.ts`: Tailwind utilities over pureform's tokens (`bg-surface`, `text-title-large`,
  `rounded-small`), utilities overriding components (`rounded-none` on a button), and the
  adapter's `dark:` and `theme-teal:` variants.
