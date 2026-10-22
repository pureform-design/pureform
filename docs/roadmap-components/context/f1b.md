# f1b: Controls (output context)

Branch `f1b-controls`, from main `aee1db3c`. Commits: `git log aee1db3c..f1b-controls`.

## What changed

- **Icon button:** `shapedOutlineStroke` (`shaped.ts`) falls back to a border `outlineWidth` wide
  (1/2/3 px by size) where a target can't clip to a shape, instead of a fixed 1px. Snapshot:
  `icon-button`.
- **Chips:** `chip` and `inputChip` rest on the `medium` radius and press to `small` (Compose's
  `CornerMedium`, `CornerSmall`); the round (selected) corner stays `full`. The outline colour was
  already `outlineVariant`, and a selected chip's border is transparent (Compose's 0 outline), so
  nothing changed there. Snapshots: chip, input chip, tags input, autocomplete, text field/area,
  date pickers, select (the chips and fields they hold).
- **Text field label:** `labelTransition` (`field.ts`) floats on `effectsDefault` instead of
  `spatialFast` (movement, inset, paddings, margin, transform, font size, line height, letter
  spacing); the colours stay on their `short3` tween. Property order is unchanged, so the
  reduced-motion e2e expectation holds. `spring-motion.spec.ts` updated.
- **Vibrant toolbar, unstyled:** React and Solid's toolbar Root takes `unstyled` (it had none) and,
  when its root is unstyled and `color` is `vibrant`, wraps its children in `ProvidedTokens`
  with `iconButton.accent` = `var(--components-toolbar-content, currentColor)`
  (`unstyledToolbarProvidedTokens`, binding-core). A styled toolbar still provides through the
  cascade; React Native always provided through its context.
- **Slider inset icon:** the cut-off uses the theme's `insetIconSize` and `insetIconPadding`.
  `sliderInsetIconOverflows(length, percents, centered, measures?)` takes the measures, falling
  back to `SLIDER_INSET_ICON` until read.
    - Web (React, Solid; one reader for css, panda, tailwind): `readSliderInsetIcon`
      (binding-core `/dom`) reads the icon's box (size) and how far it sits from the active
      track's start (padding, less the handle clearance when overflowing) from the layout, in a
      layout effect after each draw. It ignores an icon that isn't absolutely positioned (the
      unstyled case).
    - React Native: `sliderInsetIconMeasuresOfStyle` reads the resolved style (`width`/`height`
      and the margin selection puts a percentage's pixels on).

## Choices

- The unstyled toolbar's accent follows the toolbar's `content` token if the app sets it, else the
  `color` it inherits. Its own colours can't be known: it draws none.
- The slider reader measures layout rather than reading token variables: the web adapters emit
  tokens as `var(--x, fallback)` with the default inside the rule, so there's no variable to read
  for a default. Layout works the same on all three targets. The inset isn't transitioned, so a
  read mid-motion isn't a concern.
- Chip's input variant gets the same corners (same tokens).

## Checks

- `omni run build test` for preset, binding-core, react, solid, react-native, anatomy, rn-adapter.
  rn-adapter's `factory.spec`, `codegen.spec` and `geometry.spec` hit their 60 s/120 s/5 s
  timeouts under load in omni; `factory.spec` passes alone with `--testTimeout=600000`.
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, preset, react, solid, react-native.
- e2e (Vitest, narrowed): component-suites `direction` and `themes` with `-t "Slider|TextField|Text
  field|Chip"` on react/css, solid/panda, react/tailwind: 264 passed. browser-e2e-tests
  `reduced-motion` and `provided-tokens` narrowed to the text field and toolbar: passed.

## Refactoring hints

- **Helpers that look generic:** `readSliderInsetIcon` (binding-core `dom.ts`) reads an absolutely
  placed part's size and inset back from layout; any part whose cut-off follows a retuned theme
  could use it. `sliderInsetIconMeasuresOfStyle` is its React Native twin.
- **Code that looks like a sibling's:** the unstyled-toolbar wrapper in React and Solid toolbars;
  the app bar and paginator provide the same way if they gain `unstyled`.
- **Suggested home:** a binding-core "resolved token reader" if a third component needs a theme
  value at runtime (see open questions).
- **What must not change:** the snapshots listed above, `reduced-motion.e2e.test.ts`, the slider
  specs of each binding.

## Open questions

- **Slider ring width:** the clipped icon button ring still uses a fixed 1px (`shapeVariant`'s
  default `outlineWidth`); only the fallback border follows the size.
- **Slider reader:** layout measuring is an approximation of a token reader. The styled web path
  has no dedicated test (the fake registries draw nothing); the narrow e2e runs only check it
  doesn't break. The handle clearance (`SLIDER_INSET_ICON.clearance`) still isn't themed.
- **Unstyled toolbar:** a provider default of `color: "vibrant"` (not on the toolbar's props) isn't
  seen by an unstyled root's check, which reads its own props.
- **Label spring:** `effectsDefault` has no overshoot; Compose uses `FastSpatial`.
