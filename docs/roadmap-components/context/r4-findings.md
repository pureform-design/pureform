# r4-findings: r4's three findings and r3's two parked proposals (output context)

Branch `r4-findings`, from main `00729f1`. Commits (`git log 00729f1..r4-findings`):

| Step | Commit    | What                                                                                |
| ---- | --------- | ----------------------------------------------------------------------------------- |
| 1    | `458ec3c` | fix(preset): keep variant groups from setting the same property on a slot           |
| 1    | `597d73e` | test(rn-adapter): select the shaped outline with the tokens its variants set        |
| 1    | `bdb49f7` | test(browser-e2e-tests): record the Panda progress section with the success spinner |
| 2    | `b9fee64` | test(rn-adapter): resolve tokens inside shape points per token set                  |
| 2    | `5e2e2fe` | feat(preset): draw the progress wave clips from the tokens                          |
| 3    | `5130a5c` | docs(design): add provided tokens to component-architecture §5.5 (the note first)   |
| 3    | `382ef5b` | feat: let a container provide tokens to the components inside it                    |
| 4    | `9792cbb` | refactor(preset): fold the sheets' motion into overlayMotion, share the action      |

This file is the last commit, `docs(roadmap-components): add the r4-findings context`.

## Step 1: variant groups don't overlap (r4 finding a)

**The spec:** `packages/preset/src/variant-overlap.spec.ts` (`variantOverlaps(config)`). For
every component in `pureform()`, it takes every pair of values from two different groups and
every slot both style. It lists each setting both make. A setting is a property, a token
(`tokens.<path>`), or a provided token (step 3), under its conditions:

- a `when` sets its base and each case, keyed by the case's conditions (sorted);
- a `states` block sets its state, keyed as the slot condition it lowers to;
- nested condition objects are keyed by their path;
- `apply` expands to what the utility sets (`shadowElevation` sets `boxShadow` and
  `backgroundImage`).

The spec fails on any overlap that isn't on its allow-list. A second test fails on an allow-list
entry that no longer overlaps. A third checks the matching itself (a condition, a utility, a
state).

**What it found at 00729f1:** 49 value pairs × slot, 64 property overlaps, in 6 components. r4
estimated 61; the 3 extra are the card's `boxShadow`, which the fill sets through `apply` and
`interactive: false` sets outright.

- iconButton: 35 (`variant: outlined` × every `shape`, outline `borderWidth`)
- circularProgress: 6 × 2 (`indeterminate: true` × each non-default `color`, root
  `borderBlockStartColor`/`borderInlineEndColor`)
- card: 3 × 3–4 (each fill × `interactive: false`: root `backgroundColor`, `color`, `boxShadow`,
  and the outlined fill's `borderColor`)
- appBar: 2 × 2 (`size: mediumFlexible|largeFlexible` × `search: true`, content inline padding)
- sideSheet: 2 (`modal` × `coplanar: true`, root `zIndex`)
- toolbar: 1 (`placement: docked` × `orientation: vertical`, root `width`)

**Allow-list (1 entry):** `toolbar placement=docked × orientation=vertical root`, because
"M3's docked toolbar is horizontal only, so the docked width never meets the vertical one".

**Fixes.** Each keeps the CSS target's result, which is the definition-order winner. No new
compounds and no chained variant-set tokens.

- **circularProgress:** `color` sets `activeColor` and `trackColor` on the root instead of
  colouring the root and the four arcs. The base arcs and `indeterminate`'s ring read the tokens.
  This also lets an instance `activeColor` win over a non-default `color` group, as §5.5's
  precedence says. Before, the variant's direct colours beat it.
- **iconButton:** new token `shaped` (0, a flag). `shapeVariant` sets it to 1 on the root when it
  clips an outline, and drops its own outline `borderWidth`. `shapedOutlineStroke` reads
  `when(clipShape, blend(outlineWidth, 0, shaped), blend(outlineWidth, 1px, shaped))`. That is
  1px where a target can't clip, as before. The shape's fallback border was always 1px, not
  `outlineWidth`, and is kept; see open questions.
- **card:** the fill sets only `container`/`restingShadow`/`hoveredShadow`, its resting tint
  (`backgroundImage`, which its `apply` used to draw) and its outline. The outline's `borderColor`
  is now `when(actionArea disabled, …, outlineColor)` on the fill, where `interactive: false`
  used to set it. `interactive: true` reads `boxShadow: restingShadow`; its per-fill compounds
  still draw the state layer. `interactive: false` keeps `followsActionArea` (`backgroundColor`,
  `color`, `boxShadow`). `shaped.ts` now exports `tint(level)`.
- **appBar:** new flags `expanded` (set by the flexible sizes) and `search`. The content's inline
  padding is `blend(blend(contentPaddingInline, expandedPaddingInline, expanded),
paddingInline, search)`, so search wins, as on CSS.
- **sideSheet:** new tokens `layer` (`zIndex("dialog")`; `modal: false` sets `raised`) and
  `coplanar` (a flag). The root's `zIndex` is `blend(layer, zIndex("base"), coplanar)`.

**Rule in the docs:** component-guidelines.md §4 now has the bullet "Two variant groups must not
set the same property on the same slot", naming the spec. component-architecture.md §5.5 lists
the five rewrites.

**Evidence that the CSS target draws the same:**

- `JSON.stringify(pureform())`: 3,199,864 → 3,196,557 bytes. Per component: iconButton −1,590,
  circularProgress −4,316, appBar +1,848, sideSheet +609, card +142. Nothing else changed.
- CSS adapter output, `compileCss(pureform())`: 1,398,635 → 1,396,553 bytes. iconButton +1,721,
  circularProgress −4,368, appBar +826, sideSheet +218, card −489.
- **Chromium computed styles, CSS target, before and after:** 0 differences. Each slot's
  computed style (every property but custom properties and `transition*`) was dumped with the
  anatomy nested, so root tokens reach the slots. That is 2,876 selections across the
  components touched, plus linear progress and toolbar as controls, in ltr and rtl, at rest,
  hovered, disabled, pressed, selected and focused: 34,512 slot styles.
    - The selections were the full product of the overlapping groups: circular and linear
      progress `indeterminate × color × shape × thickness`, iconButton
      `variant × shape × toggle`, card `variant × interactive`, appBar
      `size × search × collapsed`, sideSheet `modal × coplanar`, toolbar
      `placement × orientation × color`.
    - "Before" ran on 00729f1's preset build.
    - The dumping test was temporary, not committed.
- The screenshots, the indication fixtures, rn-parity and rn-indication pass unchanged.
    - One exception, on Panda: the `progress` section's reference had the indeterminate
      `color: success` spinner in primary, Panda's bug. It passed only within the comparator's
      tolerance. After the fix it draws green, as on CSS. The reference was re-recorded
      (`bdb49f7`) and inspected.
    - The same section's determinate circle also differs from the old reference, which was
      evidently recorded at another moment. Both new runs were pixel-identical at threshold 0.
- **Panda regression check:** `tests/browser-e2e-tests/src/parity.e2e.test.ts`.
    - New `COMBINATIONS` cover circularProgress `indeterminate+success` and
      `indeterminate+error+wavy`, iconButton `outlined+circle` and `outlined+cookie9Sided+xlarge`,
      card `outlined+interactive false`, appBar `mediumFlexible|largeFlexible + search`, and
      sideSheet `modal false + coplanar`. They render nested as the anatomy nests.
    - New scenario: "every variant value where shape() can't clip". It drops every
      `@supports (clip-path: shape(…))` block from both sheets.
    - At 00729f1 it fails for the circular progress (Panda primary vs CSS success), the app bar
      (16px vs 4px), the side sheet (`z-index` 100 vs 0), and, in the no-clip scenario, the
      xlarge shaped outlined icon button (3px vs 1px). It passes after the fix.
    - The first shaped icon-button combination (small, 1px either way) can't show it.
    - Panda's order isn't purely alphabetical: in this build `color_success` sorts before
      `indeterminate_true` but `color_secondary` after. The check uses `success`.
    - Failures now print the differences (`expect(differences, differences.join("\n"))`).
- `packages/rn-adapter/src/geometry.spec.ts` "drawings" now selects with `withSetTokens`, as the
  factory does, so it sees the `shaped` flag.

## Step 2: token-driven wave clips (r4 finding b)

**React Native first:** `geometry.spec.ts` "shape points that read tokens". A test component's
clip has points `[0, edge]` and `[100%, edge + 2·edge]`. They resolve per token set:

- the theme's default (2px): `[0,2,100,6,50,40]`;
- a variant's (5px): `[0,5,100,15,50,40]`;
- an instance's (8px): `[0,8,100,24,…]`.

This passed as written, so rn-adapter needed no change. A second spec checks the real wavy linear
progress on React Native: its band's lowest point is 10px default and 14px thick.

**Change:** `waveBand({ waves, wavelength, top, bottom, amplitude })` and
`wavyRing({ waves, thickness, amplitude })` now take lengths (`NumericValue`), which may read
tokens. A point is the edge shifted by a multiple of the amplitude, as `calc`:

- `waveBand` point: `top − s·amplitude`;
- `wavyRing` coordinate: `50%+50%·cos − cos·(1−s)·amplitude [− cos·thickness]`.

- Linear: one band from `amplitude`, `amplitude + height`, `amplitude`. It follows `height`,
  which `thickness: thick` sets, and `amplitude`.
- Circular: one ring from `thickness` and `amplitude`. Before, it was in fractions of a 48px
  circle; it is now in px, so at a non-default `size` the ring keeps the tokens' widths rather
  than scaling.
- Compounds: linear `{wavy, thick}` and circular `{wavy, thick}` and
  `{wavy, indeterminate, thick}` went. Circular `{wavy, indeterminate}` stays (§5.5's
  exception).
    - By the doc's count, 25 → 22.
    - Counting every `compoundVariants` entry in `pureform()`, it is 29 → 26 (the doc's count
      leaves out the badge's 2 and counts the FAB as fewer).
    - Updated in component-architecture.md §5.5 and in the gap analysis (§ linear/circular
      progress, and the variants table).
- Size: JSON 3,196,557 → 3,402,043 bytes (linearProgress +30 KB, circularProgress +175 KB).
  CSS 1,396,553 → 1,531,735 bytes (+135 KB raw; linear +58 KB, circular +77 KB). These are the
  `calc()`s per point r4 predicted.
- **Screenshots:** `loading-and-wavy` is pixel-identical at threshold 0, so the wave sections
  didn't move by even a sub-pixel. All 42 visual screenshots pass at the normal tolerance.
- Public API: `waveBand`/`wavyRing` (exported from `@pureform/preset`) take lengths now, not
  percentages or fractions. That is a signature change.

## Step 3: provided tokens (r4 finding c)

**Design note first** (`5130a5c`), component-architecture.md §5.5, "Provided tokens". It was
refined in the implementation commit once the app bar needed per-slot providers. It covers:

- `providedTokens` next to `tokens`, by component and token name, stored by path;
- values resolved at the container, so no chained tokens;
- the web: inherited custom properties on the providing slot's rule;
- React Native: per slot through `ProvidedTokens`, laid over the provider's overrides so the
  nested component's own variant and instance tokens win;
- Solid/React: a context for code without the cascade, merged as instance tokens;
- the scope rules: nearest wins, the nested component's own styles win, no `valueType` tokens,
  and portals.

**Implementation:**

- **core:** `StyleMap.providedTokens` (by path). `TypedStyle.providedTokens` takes
  `{ component: { token: value } }` or paths, and `qualify` stores paths. Any slot may provide;
  only own `tokens` stay root-only. `validateConfig` checks each provided path names a token of
  its component when the config has that component. A pruned or absent component is skipped.
- **css-lowering** (so CSS, Tailwind and Panda): each provided token becomes the nested
  component's custom property on the slot's rule, for example
  `--pf-components-iconButton-accent: var(--pf-components-toolbar-content, …)`.
- **rn-adapter:**
    - `lowerStyle` lowers them under a private `provided:` prefix.
    - `selectWithTransitions` moves them out to `Selected.providedTokens[slot]`, by theme key.
      They are resolved with the container's set tokens, through `withSetTokens`.
    - New `OverridesLayer` in `./react` lays values over the provider's overrides for a subtree.
- **binding-core:** `ProvidedTokens` (type), `providedTokensFromPaths`, `providedTokenPaths`,
  `mergeProvidedTokens` (nearest wins per token), `providedTokensFor` and `withProvidedTokens`.
- **Solid and React:** a `ProvidedTokens` provider and `useProvidedTokens(component)`.
  `useComponent` merges the component's share under its own `tokens`.
- **React Native:** `ProvidedTokens` (context plus `OverridesLayer`) and `useProvidedTokens`. The
  toolbar wraps its bar in its root's provided tokens. The app bar wraps `leading` and `trailing`
  in theirs.

**Used:**

- **Toolbar `color: vibrant`:** provides `iconButton.accent = ref("content")`
  (onPrimaryContainer). Visible change: the vibrant toolbars' accent icon buttons (the selected
  "I" and the link) and the vertical vibrant toolbar's buttons draw in onPrimaryContainer, not
  primary. The `toolbars` screenshot was re-recorded and inspected: only the vibrant rows'
  glyphs changed.
- **App bar:** its colours were wrong per M3. The leading navigation icon button drew primary
  (M3: on-surface) and the trailing ones primary (M3: on-surface-variant), although the preset's
  own `leadingColor`/`trailingColor` already named those roles. `leading` and `trailing` now
  provide `iconButton.accent` from them. Visible change: the leading arrow goes from primary to
  onSurface, and the trailing ⋮ to onSurfaceVariant. The `app-bars` screenshot was re-recorded
  and inspected.

**Tests on every target:**

- **Web (Panda, CSS, Tailwind):** `tests/browser-e2e-tests/src/provided-tokens.e2e.test.ts`.
    - An icon button in a vibrant toolbar computes the toolbar's colour.
    - One outside doesn't.
    - `color: "secondary"` computes the standalone secondary colour.
    - An inline instance `--pf-components-iconButton-accent` wins.
    - The app bar's leading and trailing icon buttons take their parts' (different) colours.
- **React Native:** `packages/react-native/src/toolbar/toolbar.spec.tsx`, "provided tokens".
    - A vibrant toolbar's icon glyph is onPrimaryContainer, and a standard one's isn't.
    - Under `ProvidedTokens`, the provided accent applies, `color="secondary"` wins, the
      `tokens` prop wins, and a nested provider wins.
    - The app bar's leading glyph is onSurface and its trailing glyph onSurfaceVariant.
- **Solid and React:** `src/provided-tokens.spec.tsx` covers a provided accent, the instance
  `tokens` prop winning, and the nearest provider winning.
- **Specs:** core (`typed.spec.ts`: paths, any slot, validation), binding-core
  (`provided-tokens.spec.ts`), preset (`toolbar.spec.ts`: the vibrant root's Panda output and
  the provided path).

## Step 4: r3's parked proposals

- **`sheetMotion` folded into `overlayMotion`.**
    - `OverlayMotionStep` has an optional `rtl` keyframes name. The step is then
      `when().on("rtl", rtl).on("reducedMotion", fade).else(keyframes)`, the sheets' old order.
    - `sheet.ts` now exports `BOTTOM_SHEET_MOTION` and `SIDE_SHEET_MOTION`, and the sheets use
      `overlayMotion(...)`.
    - `sheetFadeIn`/`sheetFadeOut` left `SHEET_KEYFRAMES`; the sheets fade with
      `overlayFadeIn`/`overlayFadeOut`, which have the same frames.
    - `sheetMotion` and `SheetEdge` are gone (public exports of `@pureform/preset`).
    - Output: only the keyframe names in the sheets' reduced-motion animations, and the 2 removed
      `@keyframes`. JSON −269 bytes; CSS −247 bytes.
- **`notificationAction(ref, color)`** (`shared.ts`) builds the snackbar's `action` and the
  toast's `actionTrigger`.
    - The toast's own `flexDirection: row` only repeated `pressableRoot`'s. Reassigning a key
      keeps its position, so both recipes' JSON and CSS are unchanged; dropping it changed
      nothing.
    - So the "flexDirection that keeps both rendering the same" is `row` from `pressableRoot`,
      with nothing extra.

No visible change in step 4. The screenshots and indication fixtures pass unchanged.

## Verification

- After each step: `omni run build test -b 00729f1 -w -o continue` passed 101 tasks, with 49
  skipped as disabled.
    - Step 1's first run failed on `rn-adapter`'s geometry spec (fixed in `597d73e`).
    - React Native's carousel "scrolls … smoothly otherwise" failed under the run's load
      (expected 216 to be less than 216) and passed alone. omni then replays the cached failure,
      so rerun it with `-f failed`.
    - `rn-web-demo`'s e2e once couldn't resolve `@pureform/rn-adapter` while it was rebuilt in
      the same run. It also failed in the setup build at 00729f1, and passed alone and in later
      runs.
- tsc is clean in core, preset, rn-adapter, binding-core, solid, react and react-native.
- Whole gate, once at the end: `omni run build test -f all -o continue` passed 102 tasks with 0
  failures (50 skipped as disabled). No suite needed a rerun, and no known flake fired.
  `bun install --frozen-lockfile` made no changes.

## Deviations from the design

- **Public changes:**
    - `waveBand`/`wavyRing` take lengths.
    - `sheetMotion` and `SheetEdge` are removed (use `overlayMotion` with
      `BOTTOM_SHEET_MOTION`/`SIDE_SHEET_MOTION`).
    - New public pieces:
        - `StyleMap.providedTokens`;
        - `Selected.providedTokens` (rn-adapter, required field);
        - `OverridesLayer` (rn-adapter `./react`);
        - binding-core's provided-token helpers;
        - `ProvidedTokens`/`useProvidedTokens` in Solid, React and React Native;
        - `notificationAction` and `tint` (preset internals);
        - the tokens `iconButton.shaped`, `appBar.expanded`/`search`,
          `sideSheet.layer`/`coplanar`.
- **Provided tokens on any slot:** the brief said "on a slot (the container's root)". The app
  bar's leading and trailing parts need different colours, so any slot may provide. Own `tokens`
  stay root-only.
- **Solid/React:** the context is merged as instance tokens. A styled container provides through
  the cascade, so the bindings' toolbars and app bars don't use the context. An unstyled
  container provides nothing, since it draws none of its colours; see open questions.

## Merge notes (for the c5 branches merging after this)

- `variant-overlap.spec.ts` checks every component in `pureform()`, so a picker whose groups
  overlap fails it. Fix it with a token or flag (§5.5), or allow-list the pair with a reason.
- The parity suite's `COMBINATIONS` is keyed by component name. Add a picker's risky pairs there.
- Shared files touched:
    - `packages/preset/src/components/shared.ts` (`notificationAction`), `shaped.ts`
      (`shapedOutlineStroke`, `shapeVariant`, `tint`), `overlay.ts` (`rtl` steps);
    - binding-core `index.ts` (provided-token exports);
    - the Solid/React `parts.tsx` `useComponent` and `index.ts`;
    - React Native `index.ts`;
    - rn-adapter `select.ts`/`lower.ts`/`values.ts`/`react.ts`;
    - core `typed.ts`/`path.ts`/`ast/style.ts`;
    - css-lowering `style-map.ts`.
- `Selected` (rn-adapter) has a new required `providedTokens` field. A hand-built `Selected` in a
  c5 branch needs it.
- Rerun `omni run generate -f all` after merging: the registries embed the recipes.

## Open questions

- **iconButton:** the shaped outline's fallback border is 1px (the shape's), not the size's
  `outlineWidth` (2px large, 3px xlarge). This only shows where a target can't clip. It was kept
  as the CSS target drew it. Should the fallback follow `outlineWidth`?
- **circularProgress:** an instance `activeColor` now wins over a non-default `color` group, as
  §5.5's precedence says. Before, the group's direct colours won.
- **Unstyled containers in Solid/React:** they provide nothing. Should an unstyled vibrant
  toolbar still recolour its (styled) icon buttons? Doing that would need the web factories to
  emit provided values per selection at codegen.
- **Provided values on the web and portals:** a menu portaled out of a vibrant toolbar doesn't
  inherit. The menu items aren't icon buttons today, so nothing is affected.
- **The `progress` screenshot:** the reference at 00729f1 didn't match a strict run, beyond the
  spinner. It looks recorded at another moment. It's re-recorded now. Strict (threshold 0) runs
  of the visual suite also differ on about ten unrelated sections on this machine, so only the
  normal tolerance is a gate.
