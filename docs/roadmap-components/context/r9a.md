# r9a: React Native adapter and layout (output context)

Branch `r9a`, from main. Commits (`git log main..r9a`):

| Commit     | What                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `15581773` | refactor(rn-adapter): evaluate set tokens together from their templates instead of up to 4 passes |
| `a39df3f7` | feat(preset): pillRadius token on corner-morphing components so themes retune full round          |
| `bb8d9e45` | feat(react-native): own size is width fit-content, radio and badge join, roots take a user style  |
| `8d7f9583` | feat(react-native): Media source takes ImageSourcePropType                                        |

This file is the last commit. The README is not ticked; the orchestrator ticks it after merging.

## Decided work

- **React Native token resolution.** `withSetTokens`' up-to-4-pass loop in
  `packages/rn-adapter/src/resolve.ts` is gone. The selected variants', states' and props' token
  expressions merge unevaluated in cascade order, then evaluate lazily and memoised through a
  `read(key)` lookup (`evaluate` in `values.ts`). A cycle throws in development. `select.ts`
  keeps the templates so the evaluation can run after selection.
  Tests: `resolve.spec.ts` (a chain longer than 4 resolves; a cycle errors), plus
  `factory.spec.ts` and `geometry.spec.ts`. The existing parity and geometry specs pass unchanged.
- **Pill radius token.** Button, icon button, chip, input chip, FAB menu toggle and split button
  each have a `pillRadius` token, default `height × 0.5`. Their `radius` is
  `min(radius("full"), pillRadius)` (helper in `packages/preset/src/components/shared.ts`). A
  theme sets `pillRadius` to choose how round "fully round" is. The preset README documents it.
  The preset snapshots changed for the new token only.
  Tests: `rn-adapter/src/pill-radius.spec.ts` checks every size and density, React Native
  against the web.
- **Own size on React Native.** `OWN_SIZE` is now `width: "fit-content"` on native and `auto`
  on CSS, replacing `alignSelf: "flex-start"`, so a parent's `alignItems` still places the
  component. Radio and Badge join Button, IconButton, FAB, chips, Checkbox and Switch. Each of
  these roots takes a user `style` through `withUserStyle`/`RootStyleProps` in
  `packages/react-native/src/styles.ts`. The React Native README says that `width: "100%"`
  stretches the component and `alignSelf: "stretch"` alone doesn't.
  Tests: `rn-adapter/src/own-size.spec.ts` and `react-native/src/components.spec.tsx` cover a
  default column, a centred column, a centred row and a user width.
- **Media `source`.** It is typed as `ImageSourcePropType`:
    - A `require()` asset takes its ratio from `Image.resolveAssetSource`.
    - A source with a width and height gives the ratio without loading.
    - `{ uri, headers }` is measured with `Image.getSizeWithHeaders`, or with `getSize` on React
      Native Web, which doesn't have it.
    - An array uses its first resolution.
    - `cache` passes through.

    `source` wins over `src`, and development warns once when both are set. The clipped `Drawing`
    path (`rn-adapter/src/svg-parts.ts`) takes the whole source.
    Tests: five new cases in the `media` block of `components.spec.tsx`.

## Checks

- `omni run build test -p @pureform/rn-adapter -p @pureform/preset -p @pureform/react-native`:
    - Builds pass.
    - preset and rn-adapter unit tests pass.
    - react-native: 619/621 pass. The 2 failures are timing tests: the splitter's "rests where
      it's let go" and the presence "staggers the FAB menu's items". See open questions.
- `bunx tsc --noEmit -p tsconfig.json` is clean in rn-adapter, preset and react-native.
- `omni run build -p @pureform/storybook-web` passes.
- e2e in `tests/component-suites` after `generate prepare -p @pureform/panda-fixture`, narrowed
  to the touched components: 247 passed on each of solid/panda, react/css and react/tailwind.
- The visual suite, narrowed to the touched sections, passed (14) with nothing re-recorded.
- rn-parity passed (10/10). Stories narrowed to the touched components passed (48).
- No conflict markers.

## Refactoring hints

- **Helpers that look generic:**
    - `withUserStyle`/`RootStyleProps` (`react-native/src/styles.ts`). Every React Native root
      that keeps its own size should use them. Single-part components still hand-merge styles.
    - `knownRatio`/`remoteOf` in `react-native/src/single-part.tsx`. Avatar's image could reuse
      them if it starts taking `source`.
- **Code that looks like a sibling's:** none.
- **Suggested home:** keep these where they are until a second user appears.
- **What must not change:** the preset snapshots, `pill-radius.spec.ts`, `own-size.spec.ts`,
  the rn-parity and visual suites.

No refactors were declined. The token-resolution item was itself the refactor, and it kept the
parity and geometry output identical.

## Open questions

- **Flaky timing tests in `@pureform/react-native`, not caused by r9a:**
    - "staggers the FAB menu's items" (presence) also fails on main's sources under the same
      load.
    - The splitter's "rests where it's let go" fails only while Vitest's type check runs in the
      same process under high load (load average 20–30). It passes at HEAD with
      `--typecheck.enabled=false` (2/2) and passed at each earlier commit.
    - Worth a retry, or a less load-sensitive wait in r9d's "known flakes".
- `alignSelf: "stretch"` alone doesn't stretch an own-size root, because the `fit-content` width
  wins. It is documented rather than handled. Mapping it to `width: "100%"` in `withUserStyle`
  is an option.
- `getSizeWithHeaders` isn't available on React Native Web, which measures without headers.
