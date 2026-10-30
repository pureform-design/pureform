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

### 4. Not reproduced

- **TimeInput border radius:** the input, period selector and root radii are identical on Solid,
  React and React Native in the storybook and the suites (28px root, 8px fields). Reopen with a
  screenshot of the scene that differs.

### 6. Complex

- **RN circular indeterminate, the arc doesn't grow and shrink, needs a design:** measured on the
  animated, animated-SVG and Reanimated-SVG engines (motion `full`): the root's spin runs, but the
  arc stays a half circle, because the keyframes also animate the `value` token (10 to 87 and
  back) and RN can't animate a token. Parts that depend on `value` (halves' and track's rotations,
  caps, the wavy path) are resolved once at rest. Plan, engine-aware:
    1. Flat: sample the styles at a few `value`s (`useSelectedStyles`, a fixed number of calls),
       then interpolate each part's rotation and opacity from one shared timeline clock on the
       native driver, so there are no per-frame React renders. Open point: the cycle's easing is per
       step between frames (10, 87, 10); the timeline's clocks ease a whole cycle, so keep the spin
       and the arc on the same clock or add a stepped clock, or they drift apart.
    2. Wavy: the arc's SVG path changes with `value`; interpolate sampled paths with an animated
       `d` (needs an animated path in the rn-adapter SVG drawing) or, on Reanimated SVG, animated
       props on the UI thread; elsewhere keep the spinning half-circle wave.
    3. Reduced motion keeps the static half circle; test the rendered rotations over time.

## Pending Storybook observations

Ordered from easy to complex. "Real" is a component or preset bug; "scene" is the story host.

### Needs a reproduction first

- **React DatePicker year list (unconfirmed):** React and Solid both render Zag's `getYearsGrid`
  (12 years, a decade). Only React's `Cell` sets the day view on a year click
  (`react/src/calendar-parts.tsx:440`). The report ("few years", the list not reflecting the pick)
  may be that view switch, or the 288px scrolling `yearList`. Compare React, Solid and RN in the
  storybook, then decide whether the year view should be a longer scrollable range everywhere.
- **RN "Two lines, expanded" doesn't toggle (unconfirmed):** the press handler toggles correctly
  (`react-native/src/list-item/list-item.tsx:290`), so check whether the story's args make it
  controlled (`expanded`), and the `Expanding` phase on RN-web (`expand.tsx`, `onLayout`, reduced
  motion).

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

- **Full-gate timing failures:** RN `presence.spec.tsx`'s Reanimated FAB-menu stagger test
  failed waiting for the menu to disappear, and browser-e2e `rn-motion.e2e.test.ts` exceeded
  its 30s setup-hook limit during a full workspace run. Both passed isolated reruns; neither
  is declared fixed. Investigate load sensitivity and animation cleanup before increasing
  timeouts. The earlier component-suite `overlayShrinkOut` failure did not recur in that run.

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
