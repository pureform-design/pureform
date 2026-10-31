# Follow-up backlog

Pending work only; completed work lives in the code, its comments and the package READMEs
(`packages/css-lowering/README.md#reduced-motion`, `packages/animate-core/README.md`,
`packages/rn-adapter/README.md`). Device and assistive-technology work is a separate lane:
unavailable hardware is blocked, not passed, and doesn't block other work. Record device/OS/engine/AT
results and recordings.

## Open follow-ups from finished work

- **Page transitions:** Native device carry (the native driver reports values asynchronously, so
  verify on devices, V3).
- **Live auto-submenu:** drills deeper than one level stay until backed out, by design (a drill into
  a deeper level isn't re-cascaded while it's open); tune the 16px stability margin
  (`MENU_SUBMENU_MARGIN`) against real layouts; Native device measurement (V3).
- **Select multiple:** screen-reader verification (V4); Native device keyboard/touch (V3). Searchable
  options and chips are out of scope.
- **Native wave, drill and FAB menu:** frame rates and RTL mirroring on devices (V3).

## Native circular progress

- **RN wavy circular indeterminate still spins a fixed half circle (decided: leave until V3):** the
  flat indicator grows and shrinks (`react-native/src/circular-progress-motion.ts`: the preset's
  token keyframes are baked into one linear shared clock's piecewise channels, so spin, arcs, caps
  and track gaps stay in step on the native driver, each keyframe keeping its own easing). The wavy
  arc is an SVG path of fixed point topology, so sampled shapes interpolate. Plan: bake the whole
  wavy indeterminate indicator (arc growth, spin, track gaps and caps) into one self-contained
  keyframed drawing, which both SVG engines already animate (`drawing.keyframes`: Animated on its
  JS loop, Reanimated as a CSS `d` animation on the UI thread, CSS/SMIL on the web). One clock per
  drawing means nothing to drift, and no new API. About 60 frames a cycle, with the easing baked
  into the offsets and played linearly (eased steps on sparse frames cut chords across the circle).
  Don't add an external shared clock to the SVG API: Reanimated can't read an Animated value, so two
  clocks would remain. Verify per-frame cost and timing on devices (V3) before building it.

## Deferred designs

- **F1. NativeSelect option customization:** defer API design, not customization. The wrapper must
  expose renderer-supported capabilities; define web options, Material fallback items and OS-owned
  menu actions separately and don't promise unsupported OS-menu features.
- **F2. Token, theme and @property pruning:** separate design; account for runtime token/theme
  references and dynamic usage (keyframe pruning is done in `narrowConfig`).

## External verification and maintenance

- **Full-gate timing failures (load, not reproduced alone):** under the parallel full workspace
  gate a few specs fail once and pass alone: browser-e2e `rn-motion.e2e.test.ts` (30s setup
  hook), RN `table.spec` ("only hovers actionable rows") and `fullscreen-dialog.spec` ("draws a
  label (Save)"), RN `rows.spec.tsx` ("a menu's items render again only those whose selection changed"), browser-e2e `parity.e2e.test.ts` ("every variant value at rest", 60s test limit; the file takes ~150s alone), and the earlier component-suite `overlayShrinkOut`. The Reanimated FAB-menu
  stagger test (`presence.spec.tsx`) now waits on its own 6× slowed motion's budget (30s) rather
  than `until`'s 10s, and passed two full RN runs; rerun the whole workspace gate to confirm.
  Look for what starves the browsers (workers per core) before widening any other timeout.

- **V1. Slider focus-ring clipping:** obtain the nested-icon-button scene before changing clipping.
  Handle clearance and styled inset-icon reading pass (`slider-inset-icon.e2e.test.ts`); swipeable-row
  inset focus is intentional.
- **V2. Hover flicker:** capture browser/version, OS, pointing device and a recording of Menu Default
  and navigation items. Not reproduced headless, including a 1px sweep. Guard first-frame opening and
  keyboard highlighting; don't switch highlight ownership on speculation.
- **V3. Native devices:** NativeSelect `multiple`/`keepsMenuPresented`, SVG/native-driver ripple and
  morph paths, Reanimated path updates, toast swipe, `measureInWindow` submenu bounds, Android
  TouchTarget slop, both engines where applicable. Keep the optional native-menu peer unadvertised
  until verified.
- **V4. Assistive technology:** Snackbar announcements and click-only activation have DOM/API tests,
  not speech or click-delivery evidence. Verify persistent live regions, one iOS announcement per
  message and one virtual press/release per click with VoiceOver, TalkBack, NVDA or JAWS.
- **V5. Zag upgrades:** recheck Splitter's internal resizeObserver patches and long-press support
  (700 ms now; consider 500 ms only if upstream exposes it). Don't fork timing without upstream.
