# Component recipe

The steps to add a component, in order. Derived from what an existing component touches
(for example `searchBar`); check a recent one with `git log` and `git ls-files | xargs grep -l`
when the list below looks out of date.

1. **Decide** with the guidelines' checks: parts, variants, split or variant, behaviour (zag
   machine, our own, or none). Record the sources.
2. **Preset** (`packages/preset/src/components/<name>.ts`): tokens (`componentTokens`), parts,
   variants, states, using the shared helpers (`shared.ts`, `shaped.ts`, `state-layer`).
   Radii from the theme's roles. Add a spec next to it. Register it in
   `packages/preset/src/index.ts` and `pureform.ts`.
3. **Anatomy:** run the `generate` task in `packages/anatomy` (rewrites `src/generated.ts`).
   Never edit it by hand.
4. **Machine** (only with behaviour): `packages/machines/src` wraps a zag machine, or is
   our own. Its `*.anatomy.ts` must match the preset's parts (the drift test, c0b).
5. **binding-core** (`packages/binding-core/src/components/<name>.ts`): which variants the
   binding passes through, and the usage entry in `usage.ts`; export it from `index.ts`.
6. **Bindings:** `packages/solid`, `packages/react`, `packages/react-native` each get
   `src/<name>/` with the component and a spec, an export in `package.json`, an entry in
   `vite.config.ts`, a line in the registry fixture, and the README.
7. **Adapters:** nothing by hand. Rebuild so the Panda, Tailwind, CSS and React Native
   codegen produce it, and extend the sampled codegen tests if the variant space grows.
8. **Suites:** `tests/component-suites/src/components/<name>.ts` (renders and checks it on
   every binding and target, including direction and indication), the browser suite's
   screenshots and Panda factory sampling, and the rn-web demo and Solid demo where a
   component belongs in a screen.
9. **Docs:** the gap analysis (matrix row, verdicts, totals, §7), package READMEs, and the
   output context.
10. **Verify:** targeted builds and tests for what you touched (the
    [conventions](conventions.md#parallel-work)); the whole run is the
    [phase gate](conventions.md#gate-for-a-phase), done once after the merge.

For a **variant or a part on an existing component**, steps 2, 3, 5, 6 (variant list or part
in the binding), 8 and 9 apply, and the existing component's deprecated options are removed when the new version has an
equivalent, otherwise they keep their tests.
