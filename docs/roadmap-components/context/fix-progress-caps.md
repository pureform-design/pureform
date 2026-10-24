# fix-progress-caps: circular progress ends derived from size and thickness; wavy ends rounded

Branch `fix-progress-caps` from main `708bac57`. Not pushed; main untouched. Logs under
`/tmp/opencode/fix-progress-caps-*`. Commits: `git log --oneline main..fix-progress-caps`.

| Commit     | What                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| `6b7d744d` | CSS trigonometry in core (`sin`, `tan`, `asin`, `atan2`, `ratio`), React Native too  |
| `ddeefc76` | Items 1, 2: the ends' angle derived, `cap` removed, gap 4px; wavy ends on their wave |

Files: `core/src/ast/{nodes.ts,helpers/math.ts}`, `rn-adapter/src/values.ts`,
`preset/src/components/{progress.ts,shape-paths.ts}`, the preset README, and specs. Only the
circular part of `progress.ts` changed (the linear indicator and keyframes are as on main).
Nothing in r12's area (codegen, bundler).

**Setup note:** main's fresh `bun install` doesn't build: `48c5953a` removed
`@typescript/typescript6`, and `unplugin-dts` 1.1.2 still needs it under TypeScript 7
("does not provide the JavaScript Compiler API"). In this worktree only, it was linked into
`node_modules` by hand (no `package.json` or lockfile change). Every other worktree with a
fresh install hits the same; someone should bump `unplugin-dts` or restore the package.

## Items

### 1. The ends' spacing follows the size and thickness

- **Cause:** `cap` was a share of the circle set by hand for 48px at each thickness, so any
  other size or thickness changed the gap; `gap` was a share of the circle too (3%, 4.15px at 48).
- **Done:** the `cap` token is removed (no manual override kept: the derived angle is exact for
  every size, thickness and gap, so an override would only break it). `gap` is now a length,
  `px(4)`. The recipe works out the turn between neighbouring ends' centres,
  `2 × asin((gap + thickness) / (size − thickness − 2 × inset))` (a chord of the ring's middle
  line, so the dots' edges are exactly `gap` apart), with CSS trigonometry: `ratio(a, b)` is
  `tan(atan2(a, b))`, the only portable way to divide two lengths in CSS. The track turns
  `value × 3.6deg + apart` and draws `360deg − value × 3.6deg − 2 × apart`; sweeps are angles now,
  and the track arcs' and dots' opacity is `clamp(0, sin(min(sweep, 90deg)) × 64, 1)` (0 at no
  length, 1 from about a degree). The dots take the angle directly (`cap(at: angle)`).
    - Core: new `TrigNode` (`TrigFnNode`, `Atan2Node`, interfaces so `isRecord` narrowing in
      `path.ts` keeps working) in `MathFnNode`; helpers `sin`, `tan`, `asin`, `atan2`, `ratio`.
      CSS lowering is generic (`fn(args)`), so CSS, Panda and Tailwind print them unchanged.
    - React Native: `values.ts` `evaluate` works them out (angles in and out as `deg`, `atan2`
      on one unit, `px` lengths as numbers as before).
    - The wavy track is now inset on four sides rather than sized `calc(100% − 2 × amplitude)`
      (the base track too, `inset 0`): React Native ignored the sized form, so its wavy track was
      48px, off-centre by the amplitude. Same output on the web.
    - Preset README: the `gap` is a length, 4px; the ends' angle formula; `cap` is gone.
- **Tests:** preset `new-components.spec.ts`: "keeps the gap between the circular ends at …"
  (48/4, 48/8, 24/4, 96/4, 96/12, and wavy 48/4, 64/8: the compiled CSS evaluated, the chord
  between the head and the track's tail, and between the track's head and the indicator's tail,
  less the thickness, is 4px to 6 places); the cap test checks `cap` is gone and `gap` is 4px.
  Snapshot re-recorded (only `circularProgress`). Core `ast.spec.ts` (the helpers); rn-adapter
  `resolve.spec.ts` "works out CSS trigonometry…". React Native `progress.spec.tsx` "the circular
  arcs' ends" on animated, reanimated, animated-svg and reanimated-svg: at 48/4, 48/8, 24/4,
  96/12 set by `tokens` only, every dot `thickness` wide, round, on the middle line, the
  indicator's at 0 and 40%, and each gap between dot edges 4px. Browser `progress-motion`: the
  ends' test widened to sizes/thicknesses (ltr and rtl, Panda, CSS, Tailwind), the indeterminate
  track's turn uses the derived angle. Seen by eye at 6× and 14× (round ends, even 4px gaps at
  every size).

### 2. Wavy indicator's ends rounded on the wave

- **Done:** the wavy `tailCap`/`headCap` are shown again (were `display: none`), each a dot on the
  wave's middle line at its angle: in from the box by `amplitude × (1 − sin(9 × angle))`, the
  same nine waves `wavyRing` draws (outer edge `R − (1 − s) × amplitude`), so the dot covers the
  band's radial end and the end follows the wave. The track's gap is worked out on the wavy
  track's middle line (inset by `amplitude`), as on the flat circle.
- **Right to left:** the wave wasn't mirrored (the halves swapped shapes but kept the physical
  wave), so `direction.e2e`'s "rtl mirrors ltr" failed once the head dot followed it.
  `wavyRing` takes `mirrored` (x reflected), and the rtl halves use it, so the wave and its ends
  mirror with the circle. Only the rtl wavy circle's look changes.
- **Tests:** preset `loading-indicator.spec.ts` "mirrors the ring…" and the halves' clip test
  updated (rtl is the mirrored ring); `new-components.spec.ts` wavy head transform reads the
  wave. React Native "rides the wavy indicator's ends on its wave…" (four engines: head at
  `20.5 + 1.5 × sin(9 × 144°)`, tail and track ends at 20.5, gaps 4px). Browser `progress-motion`
  wavy cases (ltr, rtl: head on the wave, gap 4px). Seen by eye at 14× (ltr, rtl, thick).

## Checks

- `omni run build test -p @pureform/core -p @pureform/rn-adapter -p @pureform/preset
-p @pureform/react-native`: pass (one run's flaky timeouts, `indication.spec.ts` focus ring,
  `factory.spec.ts` over the preset, react-native `table.spec.tsx` arrow, passed on `-f failed`).
- `bunx tsc --noEmit -p tsconfig.json`: clean in core, rn-adapter, preset, react-native,
  browser-e2e-tests.
- `omni run build -p @pureform/storybook-web`: passes. Story tests on `storybook/solid`,
  `storybook/react`, `storybook/native`, files matching `Progress`: 81 pass.
- Browser `progress-motion -t circular` (30 pass), component-suites `direction.e2e.test.ts`
  on `react/css` and `solid/css` `-t ircular` (22 pass).
- Visual `progress|loading-and-wavy|search-and-feedback|color-groups|expandables`: pass
  unchanged (the gap moved from 4.15px to 4px, within tolerance), so nothing was re-recorded.

## Refactoring hints

- **Helpers that look generic:** `ratio(a, b)` (core) divides two lengths anywhere; any
  component that needs a length as a share (an angle on a ring, a scale from two sizes) can use
  it instead of a hand-set token. The progress `cap` dot and `trackParts(inset)` would serve any
  ring drawn from borders (a circular slider).
- **Code that looks like a sibling's:** none new.
- **Suggested home:** the ring dot in `preset/src/components/shared.ts` if a second ring needs it.
- **What must not change:** `new-components.spec.ts` derived-gap cases and circular snapshot,
  React Native `progress.spec.tsx` arcs' ends, `progress-motion.e2e.test.ts`, the direction
  suite's circular cases.

## Open questions

- **No manual `cap`/angle override:** removed as not useful (it can only make the gap wrong).
  `gap` is the knob; say if a theme should be able to set the ends' angle directly.
- **CSS trigonometry** (`asin`, `tan`, `atan2`, `sin`) needs Chrome 111, Safari 15.4, Firefox
  108; older browsers drop the declarations (the track and dots then sit unturned).
- **React Native indeterminate wavy:** the head dot's radius is a sine of the value, while
  keyframed values are interpolated between frames, so mid-frame it can sit slightly off the
  wave. React Native draws no circular wave clip at all (its wavy ring is a flat band as wide
  as the wave), so there the dots sit within that band, moving in and out with the value.
- **The rtl wavy circle now mirrors** (it didn't before); every other direction is unchanged.
