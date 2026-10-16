# p1c: Styles that flip with direction (output context)

Commits: 20ced22..34840d0, plus the `docs(roadmap)` commit that adds this file.

## Built

- **`@pureform/preset`**:
    - Switch (`src/components/switch.ts`): handle and state layer on
      `insetInlineStart: along` (was `left`), centered with
      `when("rtl", transform(translate(pct(50), pct(-50))), transform(translate(pct(-50), pct(-50))))`.
      Their transitions are `tweens("insetInlineStart", …)`, so the computed
      `transition-property` is `inset-inline-start, width, height, background-color` (React
      Native: `start`).
    - Linear progress (`src/components/progress.ts`): `PROGRESS_KEYFRAMES` gains
      `linearProgressSlideRtl` (`translateX(100%)` to `translateX(-250%)`, the mirror of
      `linearProgressSlide`); the indeterminate indicator's `animation` is
      `when("rtl", slide("linearProgressSlideRtl"), slide("linearProgressSlide"))`.
    - `controlInput` (`src/components/control.ts`, used by checkbox, radio, switch, slider)
      resets `marginBlockStart/End` and `marginInlineStart/End` to `0`. Chromium's default
      checkbox margins (`3px 3px 3px 4px`) are physical and shifted the input 4px on the CSS
      and Tailwind targets (Panda's preflight already reset them). Found by the mirrored-box
      test.
    - **The physical-property spec**: `packages/preset/src/direction.spec.ts`. It walks every
      component in `pureform()` (base, variants, compound variants, `states`, `rawRules`),
      `componentBaseStyles`, and `keyframes`, and fails on:
        - properties `left`, `right`, or any name containing `Left`/`Right` (`marginLeft`,
          `borderTopLeftRadius`, …);
        - `translateX` (non-zero), `translate` with a non-zero x, `scaleX` (not 1);
        - a `left`/`right` keyword value.

        It lets through:
        - symmetric uses: `left: 0` (or `right: 0`) with the other side `0` or `width: 100%`;
          centering with `left: 50%` and `translate(-50%, …)` in the same style;
        - anything under a direction condition: a conditional with an `ltr`/`rtl` case
          (the whole conditional, base included), a `states.ltr`/`states.rtl` block, and
          keyframes named only by animations under such a conditional;
        - **exceptions**: the `ALLOWED` list at the top of the file,
          `{ where: "component.slot", property, reason }`. To allow one, add an entry with
          its reason. Today: `ripple.ripple` `left` (placed from pointer coordinates).

        A second test runs the walker on a probe config to prove it catches each kind.

- **`@pureform/rn-adapter`**: no source change. New `src/direction.spec.ts`: selection with
  `{ rtl: true }` keeps `start` and gives `translateX: "50%"`; the indeterminate linear
  progress's animation is `linearProgressSlideRtl`. `reduced-motion.spec.ts` expects `start`.
- **`tests/browser-e2e-tests`**:
    - **Mirrored-box helpers**, `src/mirror.ts`:

        ```ts
        export interface Box {
            x: number;
            y: number;
            width: number;
            height: number;
        }
        /** Each element's box relative to root's border box (transforms included). */
        export const boxesWithin: (
            root: Element,
            elements: Record<string, Element>,
        ) => Record<string, Box>;
        /** x' = width - x - w */
        export const mirrorBox: (box: Box, width: number) => Box;
        /** One line per box whose rtl box isn't the mirrored ltr box (± tolerance, default 0.5px). */
        export const mirrorMismatches: (
            ltr: Record<string, Box>,
            rtl: Record<string, Box>,
            width: number,
            tolerance?: number,
        ) => string[];
        /** Appends markup inside a <div dir> to doc.body, measures every [data-part] against the
         *  [data-root], removes it. prepare(root) runs before measuring. */
        export const measureIn: (
            doc: Document,
            dir: "ltr" | "rtl",
            markup: string,
            prepare?: (root: HTMLElement) => void,
        ) => { width: number; boxes: Record<string, Box> };
        /** measureIn both ways, then mirrorMismatches; also fails if the root's width differs. */
        export const mirroredBoxMismatches: (
            doc: Document,
            markup: string,
            prepare?: (root: HTMLElement) => void,
            tolerance?: number,
        ) => string[];
        ```

        Use: `expect(mirroredBoxMismatches(doc, markup)).toEqual([])`; the failure lists each
        part's expected and actual box.

    - `src/direction.e2e.test.ts` (15 tests): Panda, CSS, Tailwind × switch off, switch on,
      determinate linear progress, indeterminate linear progress paused at 300ms and 900ms
      (`pauseAt(time)` pauses every animation under the root via `getAnimations`).
    - `reduced-motion.e2e.test.ts` expects `inset-inline-start` for the switch handle.
- READMEs updated: `packages/preset` (new "Direction" section), `packages/rn-adapter` (new
  "Direction" section), `tests/browser-e2e-tests` (suite table, `mirror.ts`). Design doc §5.9
  records the decisions.

## Deviations from the design

- None in behavior. Added beyond the phase: the control input's margin reset (above), and
  the spec's `ALLOWED` list (the design names only symmetric and direction-conditioned
  exceptions; the ripple needs a third kind).
- `transition` property names (`tweens("left")`) aren't checked by the spec; a physical
  property is caught where it's set, which is enough.

## Stubs and gaps

- **Where direction comes from** is binding work, none of it started: the provider's
  `dir="ltr" | "rtl"` writing `dir` on its element and passing it to Zag machines (p2a
  Solid, p2b React); React Native's `dir` defaulting to `I18nManager.isRTL` and passing
  `rtl` into selection (p8). Today `useComponentState` passes no `rtl`, so on a native RTL
  device `start` flips but the switch's translation doesn't, until p8 sets it.
- The icon `mirror` (`data-pf-mirror`, `scaleX(-1)` under `rtl`) is p1d. When it lands, its
  `scaleX(-1)` must sit under `when("rtl", …)` or a `states.rtl` block, or the spec fails.
- The web `rtl` condition is `:where([dir=rtl], :dir(rtl)) &`, an ancestor match: an `ltr`
  island inside an `rtl` page still matches `rtl` (and `ltr` matches too). Pre-existing,
  same as Panda's built-in `_rtl`; fine while the provider sets `dir` on its own element
  only at one level. `&:dir(rtl)` would fix it, with Panda's condition overridden as p1b did
  for `motionReduce`. Not done; nobody needs nesting yet.
- The circular progress already uses `insetInlineStart/End` halves with `rotate`, so it
  mirrors its layout but still turns clockwise in `rtl`. Not covered by the mirrored-box
  test (rotation isn't a box mirror); Material doesn't call for a change.
- Keyboard suites in both directions (§5.9 "Testing") belong to the component suites (p3c,
  p6), once the bindings pass `dir` to Zag.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" fails (99 diff lines now,
  none for the switch, progress, or controls).

## How to verify

- `task_run` `build` and `test:unit` over the workspace: all pass.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests` (`force: true` after rebuilding the
  preset; needs `.env.local`): 208 of 209 pass; the failure is the pre-existing rn-parity
  case.
- Single files: `cd tests/browser-e2e-tests && bun x vitest --config vitest.config.e2e.ts run
src/direction` (after `set -a; source .env.local; set +a`). Reverting `switch.ts` and
  `progress.ts` makes 12 of its 15 tests fail, with the expected and actual boxes listed.
- Unit: `packages/preset/src/direction.spec.ts`, `packages/preset/src/components/controls.spec.ts`
  ("centers the handle and state layer on their inline start, flipped under rtl"),
  `packages/rn-adapter/src/direction.spec.ts`.

## Notes for the next phases

- **p3c, p6 (component suites):** for each component with anything direction-aware, render it
  both ways and assert `mirroredBoxMismatches(...)` is `[]`. Mark the root with `data-root`
  and each part with `data-part="<slot>"`; for rendered framework components, measure with
  `boxesWithin` + `mirrorMismatches` directly. Pause animations at a fixed time (see
  `pauseAt` in `direction.e2e.test.ts`) before measuring. The suite's context emulates
  reduced motion, so moving transitions are already off.
- **Any new preset style:** use logical properties; if one can't be, wrap it in
  `when("rtl", flipped, normal)` (or `states.rtl`) or add it to `ALLOWED` with a reason.
  New keyframes that move horizontally need an `Rtl` twin picked under `rtl`.
- **p1d:** the icon `mirror` is the next direction-conditioned style; see above.
- **p2a, p2b, p8:** the provider's `dir` is what makes these styles apply; on React Native
  pass `rtl` into the selection state.
- Preset snapshots changed (`controls.spec.ts.snap`, `new-components.spec.ts.snap`); later
  phases regenerate after rebasing.
- omni caches builds by hash: after reverting and restoring a source file, the cached `dist`
  may be stale; rebuild with `force: true`.
