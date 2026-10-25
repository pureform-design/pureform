# m1: Springs foundation

**Depends on:** c6 (main at `d849f3e2`). **Single agent.** Part 1 of spring motion: core,
theme, material, and preset plumbing. No component changes its motion here;
[m2](m2-spring-components.md) migrates them.

Read first: [design doc §5.8](../../design/component-architecture.md#58-reduced-motion) (motion,
reduced motion), `packages/core/src/ast/nodes.ts` and `ast/helpers/motion.ts`,
`packages/css-lowering/src/compile-node.ts`, `packages/rn-adapter/src/lower.ts` and the
React Native engines, the theme's motion contract and refs, `materialMotion`, and the preset's
`tweens`/`motionTransition` and `overlayMotion`.

## Build

1. **Core.** A `linear` easing kind (CSS's `linear()`, `linearEasing(...)`); a `SpringNode`
   (`stiffness`, damping ratio, `mass`; `spring(...)` by physics or by perceptual duration and
   bounce); `sampleSpring` (closed-form, settle time within a tolerance, adaptive sampling and
   simplification, capped points), the one sampler for every web adapter; transitions and
   keyframe animations take a `Timing`, a duration and easing or a spring, never both (type and
   `validateConfig`); `CoreConfig.springs`; the reduced-motion rule for springs.
2. **Lowering.** CSS, Panda, and Tailwind write a spring token as `<name>-duration` and
   `<name>-easing` vars and read both from a transition or animation; a literal spring is sampled
   in place. React Native lowers a spring timing to its sampled timing plus
   `{ type: "spring", stiffness, damping coefficient, mass }`; Animated runs `Animated.spring`,
   Reanimated the sampled `linear()`; `timeScale` and reduced motion apply.
3. **Theme.** `SPRING_ROLES`, `MotionContract.springs`, the `spring(role)` ref, the resolver's
   name and kind checks.
4. **Material.** `materialMotion({ scheme, springs, durations, easings })` with M3's published
   standard and expressive springs (source cited in code); `emphasized` becomes M3's two-segment
   path as a `linear()` easing.
5. **Preset.** `pureform()` carries the springs (base and themes); `tweens`, `tween`,
   `motionTransition`, and each overlay step accept a spring timing.

## Done when

- [x] Every existing component's output is unchanged except through the emphasized easing's
      value and the new spring vars.
- [x] A spec checks each spring's sampled duration and curve against the physics.
- [x] Snapshot tests per web adapter; React Native lowering, engine, and `timeScale` tests.
- [x] `bun install` and `--frozen-lockfile` pass; build and test pass for core, css-lowering, the
      CSS, Panda, and Tailwind adapters, rn-adapter, react-native, theme, material, preset, the
      component suites, and the browser tests; tsc is clean in the touched packages.
- [x] §5.8 has the springs subsection; the core, theme, and material READMEs match; `/tmp/opencode/m1.md`
      is written.
