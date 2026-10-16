# react-demo

`@pureform/react` on the Panda target: a single page with the button and checkbox in their
variants and states (sizes, colors, icons, a toggle, a composed button, an indeterminate parent
checkbox, and a form that submits and resets), with a switch between left to right and right to
left. It's the React counterpart of `solid-demo`'s components page (`/components`).

```sh
bun x panda codegen   # writes styled-system/, which .pureform/ imports
bun run dev
```

Through omni, `build` runs `prepare` (`panda codegen`) first.

## Where it sits

```
@pureform/react ──► PureformProvider registry={registry}
        ▲                                  │
        │                    .pureform/index.ts  (hand-written, as `pureform generate` will write it)
        │                                  │
   src/App.tsx               .pureform/web/*.ts ──► styled-system/recipes/* (Panda codegen)
                                                         ▲
                          panda.config.ts ── panda.pureform.ts (the pureform preset)
```

- `panda.pureform.ts` is a copy of `solid-demo`'s config (Material's defaults, the `teal`,
  `sharp`, and `dense` themes, the named densities), so both demos produce the same recipes and
  `.pureform/` matches both.
- `.pureform/` is a copy of `solid-demo`'s, hand-written in the shape p4b-panda will generate:
  `index.ts` (the registry, both entries static), `web/button.ts` and `web/checkbox.ts` (the class
  factories over Panda's recipes), `registry.d.ts` (types the components' variant props from the
  registry; the tsconfig includes `.pureform/` since TypeScript's globs skip dot folders), and
  `panda.ts` (`staticCss`, which `panda.config.ts` spreads in). p4c moves the demo onto the
  generator.
- `panda.config.ts` uses `@pandacss/preset-base` and the pureform preset only; `styled-system/`
  is generated and ignored.

## Worth knowing

- Theme switching and runtime overrides wait for p5b; the provider's `theme` prop does nothing yet.
- No tests of its own: the components are tested in `@pureform/react`, and the shared browser
  suites in `tests/component-suites` cover the cross-cutting rules for React and Solid together
  (they render with `solid-demo`'s registry, which matches this one).
