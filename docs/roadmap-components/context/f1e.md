# f1e: React Native tabs spring

## What changed

- The tabs indicator's slide on Animated (`animated` engine) runs `settle()` on the indicator's
  `spatialDefault` spring instead of the sampled curve (`useAnimatedSlide`,
  `packages/rn-adapter/src/animate/slide.ts`). `SlideMotion` gained `spring` and `velocity`.
- `springProgress(spring, velocity, seconds)` (`rn-adapter/src/motion.ts`) gives a spring's
  progress and speed in closed form, with a start speed, for the damping *coefficient* the
  adapter's `Spring` holds.
- `useIndicatorSlides` (`react-native/src/tab-indicator.ts`) finds where an interrupted slide
  has got to and how fast it moves (spring or curve), and starts the next slide at that speed
  (the centre's, or the width's where the centre doesn't move).
- `MotionEngine.slideSpring` says whether an engine's slide takes a spring; Animated sets it.
  Reanimated's CSS animations have no springs, so tabs strip the spring off the transition and it
  keeps the sampled duration and curve.
- Tests: `motion.spec.ts` (spring progress, all three damping cases); the existing
  `tab-indicator.spec.tsx` (both engines, retarget mid-slide) passes.

## Checks

- `bunx tsc --noEmit -p tsconfig.json` clean in `rn-adapter` and `react-native`.
- `react-native`: `vitest.config.unit.ts` on `tab-indicator.spec.tsx` and navigation specs pass.
- `rn-adapter`: `motion.spec.ts` passes. `factory.spec.ts`'s "gives what selection gives, for
  every variant value" times out at its fixed 60s under the machine's load (load average 40+),
  also with `--testTimeout`, since the test sets its own timeout; it doesn't touch slides. It
  blocks `omni run build` of rn-adapter while it fails, so I built with `vite build` for the
  type check and tests.
- No web target changed, so no e2e files were run.

## Refactoring hints

- **Helpers that look generic:** `springProgress` (`rn-adapter/src/motion.ts`): a spring's
  state at a time with an initial velocity; presence/overlay interrupts could use it too.
- **Code that looks like a sibling's:** `useAnimatedSlide`'s spring branch and `animate()` in
  `animate/curve.ts` both start an `Animated.spring` with the same rest thresholds.
- **Suggested home:** `rn-adapter/src/animate/` for the shared spring start.
- **What must not change:** `tab-indicator.spec.tsx` (both engines) and `motion.spec.ts`.

## Open questions

- A spring slide with a `delay` waits with `setTimeout` before settling; tabs have none today.
- f1f brings back tabs' `indicatorSpring`; this reads the lowered `transform` transition's
  `spring`, so it should carry over unchanged.
