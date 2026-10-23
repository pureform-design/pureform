# r9a: React Native adapter and layout

Branch `r9a`, from main `24fb399f`. Items from `phases/r9-refactor.md` "Decided work": React
Native token resolution, pill radius token, own size on React Native, React Native Media
`source`.

## React Native token resolution

- **Done.** `withSetTokens` (`rn-adapter/src/resolve.ts`) no longer loops up to 4 passes. It
  selects the set tokens' unevaluated templates (`setTokens` in `select.ts`, which shares the new
  `cascade` with `selectWithTransitions`), evaluates them together with `evaluateSetTokens`, then
  resolves the component once with them and selects.
- **How:** `evaluateSetTokens` reads through a `read(key)` lookup, memoised, in this order: the
  instance's tokens, then set tokens, then provider overrides (given outright), then theme
  formulas (evaluated lazily, so a formula that reads a set token follows it), then the theme.
  `evaluate` in `values.ts` now takes `Tokens`, which is theme values or a lookup function. A
  cycle throws in development, naming the chain. In production it reads the theme's value.
  `withSetTokens` now needs the selection's `variants` and `state`. I updated its callers:
  `factory.ts` and the specs.
- **Tests:** `resolve.spec.ts` "evaluateSetTokens" covers a chain of 6, the order of formulas,
  overrides and instance tokens, and a cycle error. Unchanged and passing: `geometry.spec`,
  `factory.spec`, all rn-adapter unit tests (394 before the additions), and `rn-parity` (10/10).

## Pill radius token

- **Done.** `pillRadius(component, height)` (`preset/src/components/shared.ts`) is
  `min(radius("full"), dynamic(components.<c>.pillRadius, height × 0.5))`. `PILL_RADIUS_TOKEN`
  declares the token. It's on button, icon button, chip, input chip (through
  `cornerMorphTokens`), split button and FAB menu (`closeRadius`). `chipShape` now takes the
  component's name.
- **How:** the token isn't set by any variant. Each size reads it through a var with a per-size
  fallback, so a theme's `components.button.pillRadius` (or an instance's `tokens`) wins at every
  size and density. The preset README has a "Round corners" section.
- **Tests:** `rn-adapter/src/pill-radius.spec.ts` checks every size × density of the 5 components
  for radius = root height / 2 (the same formula CSS computes). It also checks that a theme and an
  instance retune it, that the FAB menu's close button follows it, and that `radii.full: 0` still
  wins. Recipe snapshots were updated: button, icon button, chip, input chip and split button.
  `rn-parity` passes. The visual sections `buttons`, `icon-buttons`, `button-groups`, `density`
  and `controls` pass, with nothing re-recorded.

## Own size on React Native

- **Done.** `OWN_SIZE` is `width: platform({ css: auto }, "fit-content")`, so `alignSelf` is
  gone. Radio joined it (spread before `controlRoot`). The badge now spreads it on its base
  instead of its own `placement.flow` value, which fixes fix-merge's duplicate hint. Checkbox
  spreads it before `controlRoot` so the control's own width wins.
- **Users control it through `style`:** button, icon button, FAB, chip, checkbox, switch, radio
  and badge on React Native take `style` (`RootStyleProps`, applied with `withUserStyle` in
  `react-native/src/styles.ts`). The React Native README says `width: "100%"` stretches a root
  and `alignSelf: "stretch"` alone doesn't.
- **Tests:** React Native `components.spec.tsx` "inline roots in flow" covers the default column
  (at the start), a centred column, a centred row, a user `width: "100%"`, and `alignSelf:
"stretch"` alone, on React Native Web. `rn-adapter/src/own-size.spec.ts` checks the native
  resolved styles: no `alignSelf`, and `fit-content` or the root's own width. Preset
  `badge.spec.ts` was updated. No Yoga runs in this repo, so device layout is checked through
  the resolved styles only.

## React Native Media `source`

- **Done.** `source?: ImageSourcePropType`. Its proportions come from:
    - `require()`: `Image.resolveAssetSource`.
    - A source's own `width`/`height`, or an array's first sized entry: no load.
    - `{ uri, headers }`: `Image.getSizeWithHeaders`. React Native Web lacks it, so the web
      measures with `getSize`.
    - Otherwise: `getSize`.

    `cache` and the other fields pass through to `Image`. `source` wins over `src`, and
    development warns once when both are set. The clipped `Drawing` gets the whole source:
    `SvgDrawingProps.image` is now `{ source, fit }` (in `rn-adapter/src/svg-parts.ts`, a
    one-line type change plus `href: image.source`). Media sets `height: "auto"` when its style
    has none, so a sized source doesn't override the aspect.

- **Tests:** React Native `components.spec.tsx` "media" covers a sized source and an array
  (without `getSize`), headers passed to `getSizeWithHeaders`, a registered asset, a shaped
  picture's SVG `href`, and `source` over `src` with the warning. The README is updated.

## Declined refactors

- `inFlowInline` (React Native, time input and time picker) does the same job as `OWN_SIZE`, but
  I left it. Moving those roots onto `OWN_SIZE` would change the time picker's and time input's
  layout on React Native Web (`inline-flex`), which this subphase doesn't check. Failed check:
  the shared code doesn't yet take that web case. It's left for r9d or a later pass.

## Checks run

- `omni run build test -p @pureform/rn-adapter -p @pureform/preset -p @pureform/react-native`:
  everything passes except 2 React Native tests: c8c splitter "rests where it's let go…" and
  presence "staggers the FAB menu's items". Both are listed flakes, and both pass when run alone
  (83/83 with `-t "splitter|staggers the FAB menu"`).
- `tsc --noEmit` is clean in preset, rn-adapter and react-native.
- browser-e2e: `rn-parity` 10/10. Visual `-t "density|buttons|icon-buttons|button-groups|media|
controls|chips|badges|fab"`: 14 pass, nothing re-recorded.
- component-suites `direction` and `themes`, `-t "Button|Chip|Radio|Badge|Checkbox|Switch|Fab|
IconButton|SplitButton|Media"`, on solid/panda, react/css and react/tailwind: 247 pass each.
- `omni run build -p @pureform/storybook-web` passes.
- Story tests with `SB_RENDERERS=solid,react,native`:
    - media and badge: 48/48 pass.
    - button, chip, radio, switch, checkbox and fab: 360 pass. The 6 that fail are React Native
      ButtonGroup stories, which fail on `aria-allowed-attr` (`aria-checked` on `role=button`, from
      `button.tsx`'s existing toggle). React Native story tests are off by default, and I didn't
      change this code.

## Refactoring hints

- **Helpers that look generic:**
    - `evaluateSetTokens`: anything that evaluates templates in which tokens read each other.
    - `RootStyleProps`/`withUserStyle`: other React Native components whose root should take a
      user `style`.
    - `PILL_RADIUS_TOKEN`/`pillRadius(component, h)`: any new corner-morphing component.
- **What must not change:** `rn-parity`, `pill-radius.spec.ts`, `own-size.spec.ts`, and the
  recipe snapshots updated here.

## Open questions

- Native Yoga `fit-content` couldn't be checked on a device here.
- React Native ButtonGroup stories' `aria-checked` on `role=button` (above).
- `withSetTokens`'s signature now needs `variants` and `state`. It's exported from
  `@pureform/rn-adapter`, so any outside caller needs updating.
