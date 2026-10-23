# fix-merge: the Storybook fix batches, merged (output context)

Branch `fix-merge`, from main `fd66bbf0`. Commits: `git log fd66bbf0..fix-merge`. Not pushed; main
untouched.

## Merge

Merged (merge commits, no rebase), in order: `fix-motion`, `fix-interaction`, `fix-layout`,
`fix-components-2`, `fix-storybook-3` (which contains `fix-storybook-2`).

- `fix-motion`, `fix-interaction`: clean.
- `fix-layout`, `fix-components-2`: `apps/storybook-web/stories.config.ts` only, resolved as a
  union of the components' entries (Ripple, Scrim, FabMenu, Splitter, Media, Switch, Badge).
- `fix-storybook-3`: `stories.config.ts` (union, adding Toast and GridList), and
  `src/renderers/compose.ts` / `plays.ts` (see the click handler below).
- No conflict markers left (`git grep` for them). `packages/anatomy/src/generated.ts` didn't
  change when `generate` ran again. The gap analysis was re-padded with `oxfmt`.

## Reconciliations

- **React Native Badge:** fix-components-2's preset value (`alignSelf` `flex-start` on React
  Native only, `auto` on the web) is kept. fix-layout's `49d3c96f` binding patch, which became
  `inFlowInline(style)` in `BadgeImpl`, is gone. `inFlowInline` stays for the time input and time
  picker. fix-layout's badge spec no longer checks `display: inline-flex` on React Native Web.
  fix-components-2's Storybook `flexGrow: 1` wrapper does that job now.
- **Click spy (`apps/storybook-web/src/renderers/compose.ts`):** kept fix-storybook-3's
  approach. The arg is a plain handler that `preventDefault`s and records `event.type` on a
  `clicks` spy, and that spy is not an arg. `keyPlay(c, key, clicks)` gets the spy as a
  parameter, and the `reaches-window` `afterEach` check stays. fix-components-2's
  `clickHandler()` and `args.onClick.spy` were removed. The comment now also names the React
  fiber-tree cost behind the SplitButton delay. Since the spy is called with a string, the
  timing fix still holds. The key plays and SplitButton stories pass in the story tests.

## User decisions applied

- **fix-motion:**
    - `pillRadius` is now used for chips and input chips (`chipShape`, and every density step
      in `chip.ts` and `input-chip.ts`), the FAB menu's toggle (`closeRadius` per size), and
      the split button (`radius` per size, with density).
    - The FAB itself rests on medium/large/extra-large radii, not on `full`, so nothing snaps
      there.
    - React Native Web expanding and collapsing with no animation is accepted.
- **fix-interaction:**
    - The Carousel stories' a11y check runs again. I removed `a11y: { test: "todo" }` and the
      20 Carousel story tests pass. The Light and Dark copies keep `!test` because their page
      reading is a separate problem.
    - The React Native README says that on React Native Web an `href` item opens a new window,
      and that in-place navigation should use `onPress` with no `href`.
    - A disabled carousel item stays out of the Tab order but can be reached with the arrow
      keys. The machine already did this; a spec now pins it in `carousel.spec.ts`.
- **fix-layout:**
    - The 24px top padding stays.
    - The side sheet still drags with touch or pen only.
    - The new `OWN_SIZE` in `preset/src/components/shared.ts` sets `alignSelf` with
      `platform({ css: auto }, start)`. It is applied to the roots of Button, IconButton, FAB,
      Chip, InputChip (through `chipShape`), Checkbox and Switch.
    - Effect: on React Native these roots keep their own size in a column, and the web gets
      `align-self: auto`, which renders the same.
    - Recipe snapshots were updated. The visual suite, `rn-parity` and `rn-motion` pass with no
      screenshot re-recorded.
    - React Native spec: "inline roots in flow".
- **fix-components-2:** React Native `Media` keeps `source` alongside `src`.

## Fixes the gate needed

- **rn-parity:** density variants of the button, icon button and split button showed a 20px
  corner on React Native against 22/18/14px in CSS.
    - Cause: the size variant's `radius` token reads `densityOffset`, which the density variant
      sets. `withSetTokens` resolved the set tokens only once, against the default offset.
    - Fix: `rn-adapter/src/resolve.ts` `withSetTokens` resolves again until the set tokens stop
      changing (at most 4 passes). When nothing changes there's no extra pass.
    - This was fix-motion's bug, made visible once the full parity suite ran.
- **Solid hydration:** Accordion, Tree, ListItem and Stepper logged `NO_OWNER_CLEANUP`.
    - Cause: fix-motion's `collapsible` ref called `onCleanup`, and while hydrating a ref runs
      outside the owner.
    - Fix: it is now `useCollapsible()` (`solid/src/motion.ts`), which watches the part in
      `onSettled`.
- **SideSheet hydration (all six projects):** after hydration the surface gained
  `touch-action: pan-y`.
    - Fix: the new `sideSheetContentLayout` in binding-core's `components/sheet.ts` renders it,
      server too, and React and Solid use it as `contentLayout`. `sideSheetDragToDismiss`
      writes the style only when it isn't already `pan-y`.
    - `setPointerCapture` on the first sideways move is now in a `try`. In
      `side-sheet.e2e.test.ts` a synthetic pointer has no active id, and that threw unhandled
      errors.

## Checks run

- `omni run build test -f all -o continue` once. After the fixes, `-f failed` twice. The only
  failure left is Solid `fade-through.spec.tsx` "drops the old page at once … (unstyled)",
  which is a known flake: it passes when run alone (12/12).
- That run covers the e2e suites of every project (component-suites on solid/panda, react/css
  and react/tailwind among them), the visual suite (no screenshot changed or re-recorded), the
  Storybook story tests (Solid, React), and the Storybook build.
- Targeted: `server-rendering`, `indication`, `side-sheet` and `expand-motion` with
  `-t "SideSheet|Accordion|Tree|ListItem|Stepper|…"` on solid/panda, solid/css, react/css and
  react/tailwind (4420 pass). `rn-parity` (10/10). The Carousel story tests (20/20).
- `bunx tsc --noEmit -p tsconfig.json` is clean in core, preset, machines, binding-core,
  rn-adapter, react-native, react and solid. `apps/storybook-web` reports errors only in
  `packages/solid/dist/*.jsx`, as before.

## Refactoring hints

- `OWN_SIZE` (`shared.ts`) and the badge's `placement.flow` value are the same. The badge could
  spread `OWN_SIZE`; I left it alone so its snapshot stays the same.
- `inFlowInline` (`react-native/src/styles.ts`) now serves only the time input and time picker.
  Their preset roots could take `OWN_SIZE` instead, and then the helper could go.
- What must not change: the recipe snapshots updated here, `rn-parity`, the `sheets`/`badges`/
  `controls`/`buttons` screenshots, and `server-rendering` for the expandables and SideSheet.

## Open questions

- **`OWN_SIZE` on React Native overrides a parent's `alignItems: center`.** A button or switch
  in a centred row that is taller than it now sits at the top, as the badge already does. That
  matches Compose's `Row` default. The visual and parity suites show no case of it, but app
  layouts may.
- **Radio isn't covered.** It wasn't in the list. Neither are the split button root and the
  FAB menu.
- **React Native `Media`'s `source` is typed `{ uri: string }` only,** so today it takes nothing
  `src` can't. The decision's reason, "RN image sources src can't", needs `source` widened to
  `ImageSourcePropType` (`require()` assets, headers). The shaped drawing and `Image.getSize`
  would then need `Image.resolveAssetSource`. Not done here.
- **The theme can't retune the corner.** The pill radius on chips is set on the root as a token
  (as the button's already was), so a theme's `components.chip.radius` override no longer
  reaches the round corner.
