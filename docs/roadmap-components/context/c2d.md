# c2d: Badge (output context)

Commits: see `git log main..c2d-badge`.

## Built

- Preset (`packages/preset/src/components/badge.ts`): a new single-part `badge` (`root`), error
  color (`container` `error`, `content` `onError`), tokens `radius`, `smallSize` (6px),
  `largeSize` (16px), `largePadding`, and the anchored offsets (`smallOffsetBlock/Inline`,
  `largeOffsetBlock/Inline`). Variants: `size` (`small` dot, `large` label in `labelSmall`,
  default `large`) and `placement` (`flow` default, `anchored` = `position: absolute` with
  the offsets, via two compound variants, at the top end corner). No color variant. Registered in
  `index.ts` and `pureform.ts` (after `avatar`); spec and snapshot in `badge.spec.ts`.
- Positioning contexts checked and tested (`badge.spec.ts`): nav bar and rail `icon` (position
  relative, shared in `navigation.ts`) and tabs `tabContent` (relative) already are contexts, so
  **no change to the nav or tabs presets was needed**.
- Anatomy regenerated (`generated.ts`: `badgeAnatomy`, `pf-badge-root`).
- binding-core: `components/badge.ts` (`BADGE_ROOT_PROPS`, `badgeSelection`, `badgeRootProps`:
  `role="img"` + `aria-label` with `label`, `aria-hidden` for a dot without one), `usage.ts` entry
  `same("size", "placement")`, exports.
- Solid and React: `Badge` (`src/badge/`, `createSinglePart`, a `<span>`), package export, vite
  entry, registry fixture; specs added to each avatar spec file. React Native: `Badge` in
  `single-part.tsx`, `./badge` export and entry, `components.spec.tsx` case.
- Suites: `badge` case in `component-suites/src/components/static.ts` (`themed: false`, since the
  error color doesn't follow a seed), scenes and `COMPONENT_NAMES`; panda-fixture page has a
  `badges` section, screenshot `badges-chromium-linux.png` added to the visual suite.
- Docs: gap analysis matrix row, three nav/rail/tabs verdicts (now "Composed"), counts
  (33 preset components, 21 missing, 5 styling/machine); preset, solid, react, react-native,
  binding-core READMEs.

## Deviations from the design

- The badge has a `placement` variant (`flow`/`anchored`) beyond the roadmap's `size`: the
  anchored corner is what nav/tabs need, and the flow default keeps it usable inline. The
  value is `flow`, not `inline`, since Tailwind's scanner turned the word `inline` in the
  generated modules into a `.inline` utility (the tailwind-adapter scanner test failed).
- The offsets (-4px/-8px large, 0 small) are approximations of M3's, not measured.

## Deprecated options

None existed on the badge or the nav/tabs presets for this; none removed or kept.

## Stubs and gaps

- Not wired into the nav bar, rail or tabs ready-made bindings (the roadmap says composed): a
  consumer places `<Badge placement="anchored">` inside `icon`/`tabContent`.
- No anchored example in the component suites (the suite renders the badge alone, with no
  positioned parent); it's covered by the panda page's `badges` section screenshot.
- The rn-web demo and `RN_COMPONENTS` don't include the badge (no rn-web scene); the RN unit
  spec renders it.
- The screenshot's envelope icon glyph renders as a missing-glyph box in the test font.

## How to verify

- `omni run build test -p @pureform/preset -p @pureform/binding-core -p @pureform/solid -p
@pureform/react -p @pureform/react-native -p @pureform/tailwind-adapter -p @pureform/css-adapter`.
- `omni run prepare -p @pureform/panda-fixture -f all`, then in `tests/component-suites`
  `bunx vitest run -c vitest.config.e2e.ts -t Badge` and in `tests/browser-e2e-tests`
  `bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx src/panda-factories.e2e.test.ts`.

## Notes for the next phases

- After merging, run `generate` (`generated.ts` conflicts are regenerated), and reconcile the
  gap analysis counts (33 components etc.) with the sibling subphases' edits.
- A stale fixture hides renamed variants: rerun `prepare` with `-f all`.

## Refactoring hints

- **Helpers that look generic:** the single-part `Badge` in solid/react is the same shape as
  `Avatar` and `Separator` (a root element, a `machine` of aria attributes); `badgeRootProps`
  duplicates the "label names it, else hidden" rule of `avatarRootProps` and the icon's.
- **Code that looks like a sibling's:** the anchored-corner offsets (`absolute` + `inset*` tokens)
  resemble the tabs `indicator` and nav `activeIndicator` positioning.
- **Suggested home:** `binding-core/src/components/` for a shared `labelledOrHidden(props)`;
  `shared.ts` for an `anchoredCorner(tokens)` style.
- **What must not change:** `flow` default computed styles; the snapshot apart from new tokens.

## Open questions

- Should `placement` go away in favor of a part-level anchoring in nav/tabs (c-later)?
- Are the M3 anchored offsets right for the rail and tabs (not measured)?
