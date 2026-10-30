# Follow-up backlog

Pending work only; completed work lives in the code, its comments and the package READMEs
(`packages/css-lowering/README.md#reduced-motion`, `packages/animate-core/README.md`,
`packages/rn-adapter/README.md`). Device and assistive-technology work is a separate lane:
unavailable hardware is blocked, not passed, and doesn't block other work. Record device/OS/engine/AT
results and recordings.

## Open follow-ups from finished work

- **Page transitions:** web reduced-motion tests for the returning-page case; Native device carry
  (the native driver reports values asynchronously, so verify on devices, V3).
- **Live auto-submenu:** drills deeper than one level stay until backed out; scroll-driven changes;
  keyboard focus returning into a re-opened cascade; tune the 16px stability margin
  (`MENU_SUBMENU_MARGIN`); Native device measurement (V3).
- **Select multiple:** screen-reader verification (V4); Native device keyboard/touch (V3). Searchable
  options and chips are out of scope.
- **Native wave, drill and FAB menu:** frame rates and RTL mirroring on devices (V3).

## Storybook observations (code-checked, not yet reproduced in a browser)

Traced through story scenes and component code, grouped from immediately fixable to most complex.
Confirm in the storybook before changing.

### 2. Remaining scene work

### 4. Not reproduced

- **TimeInput border radius:** the input, period selector and root radii are identical on Solid,
  React and React Native in the storybook and the suites (28px root, 8px fields). Reopen with a
  screenshot of the scene that differs.

### 6. Complex

- **RN circular indeterminate (flat and wavy), needs a design:** a mounted indeterminate
  `CircularProgress` on the animated-SVG engine rendered the same markup 500ms apart (rotations
  frozen, motion `full`), so it doesn't spin or grow at all on RN today, not only the wavy one.
  Linear already animates (slide plus wave clocks, SVG engine only). Plan, engine-aware:
    1. Flat: the two halves' rotations are linear in `value`, so drive them from a shared timeline
       clock through Animated interpolation on the native driver (no per-frame React renders).
    2. Wavy: the arc's path changes per frame; draw it with the Reanimated SVG engine's animated
       props (UI thread) where present, and fall back to the flat arc's spin elsewhere.
    3. Reduced motion keeps the static half circle; test the rendered transforms over time.

## Deferred designs

- **F1. NativeSelect option customization:** defer API design, not customization. The wrapper must
  expose renderer-supported capabilities; define web options, Material fallback items and OS-owned
  menu actions separately and don't promise unsupported OS-menu features.
- **F2. Token, theme and @property pruning:** separate design; account for runtime token/theme
  references and dynamic usage (keyframe pruning is done in `narrowConfig`).
- **F3. Anatomy-part names for public customization:** providers use preset style slots
  (`dialog.root` styles the surface), instances use anatomy parts (`dialog.content`). Standardize both
  on anatomy-part names across React, Solid and Native; keep style slots for preset/theme authoring.
  Audit mappings, types, usages and migration; don't silently accept both (overlay `root` is
  ambiguous); cover structural parts, handler/style precedence, accessibility and reactivity/SSR.

## External verification and maintenance

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
