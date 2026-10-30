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

### 1. Immediate: one-line or one-file fixes

- **Solid date picker icons:** `packages/solid/src/date-picker/date-picker.tsx` (~445) renders the
  prev/next `IconButton`s with no `icon`; pass `ChevronStartIcon`/`ChevronEndIcon` and `mirror` as
  React does (glyphs exist). Also check Solid's docked picker and date input.
- **Select arrow doesn't open (Paginator, every React/Solid Select):** add `pointerEvents: none` to
  the trailing icon from `icon()` in `packages/preset/src/components/field.ts` (as `native-select.ts`
  does).
- **Rating small star on hover (React, Solid):** add `flexShrink: 0` to the glyph in the
  `filled(0.5)` box in `preset/.../rating.ts` so `overflow: hidden` clips it instead of it scaling.
- **RN Paginator label twice:** `react-native/src/paginator/paginator.tsx` passes `label` to `Select`
  as well as drawing it; use an accessibility label (React uses `aria-label`).
- **RN DateInput separators highlighted:** style the `/` literals from a focus-free selection, not
  the root `segment` style that carries focus.

### 2. Scene fixes: story or host, not the component

- **RN Scrim:** add a native scene with page content inside a sized, positioned frame.
- **SideSheet > Open standard:** no scrim on web is correct (non-modal). For RN, give the scene a row
  container aligned to the end, and controlled `open`/`onOpenChange` so the X closes it.
- **BottomSheet > Opened standard (RN):** give the scene a bottom-aligned column frame.
- **Toast on RN:** give the scene a tall positioned frame (the `Toaster` positions against the story
  root, not the viewport).
- **Toolbar > Opened overflow:** web (menu) is correct; give the case a fixed narrow width on every
  renderer. If RN still doesn't overflow in a fixed-width parent, it is an RN measuring bug.
- **Carousel arrow keys:** expected on touch-first RN; mark it a known difference in the stories.

### 3. Small decisions, then a small fix

- **Card width:** the web card is a shrink-wrapping `<button>` and RN stretches; choose the intended
  width, then set it in the preset card root or RN's root.
- **SearchView trigger width (React, Solid, probably RN):** the trigger is `width: 100%` while the
  `SearchBar` is capped at 720px; make the trigger shrink-wrap (`width: fit-content; max-width:
  100%`) or carry the same cap.
- **RN RadioGroup `orientation`:** vertical is the RN/Material default, but `orientation` is
  ARIA-only on RN; map `horizontal` to a wrapping row or document it.
- **Table row hover parity:** the preset specifies a hover tint (not from Material), absent on RN;
  keep it (add pointer enter/leave to RN rows) or drop it from the preset.
- **Draggable list item ripple (React, Solid):** a swipe only sets the pressed layer, and M3 shows
  the dragged state, so probably by design; confirm the spec.

### 4. Measure first

- **TimeInput border radius (RN, Solid vs React):** same `fieldRadius` token everywhere; compare
  each renderer's computed `border-radius` (suspect Panda's `radii.small` fallback in React).

### 5. New behavior

- **RN TextArea `autoGrow`:** a no-op on RN (`fieldSizing` is dropped, `autoGrow` is never read).
  Track `onContentSizeChange` and set the height, clamped to the minimum rows. (Web is CSS
  `field-sizing`; check the browser before calling a web report a bug.)
- **Carousel arrow-key parity on react-native-web (optional):** add `onKeyDown` focus-and-scroll on
  the masks.

### 6. Complex

- **RN wavy indeterminate, circular:** linear already animates (slide plus wave clocks, SVG engine
  only). On web the circular arc grows and shrinks by animating `value`; on RN that needs the SVG
  path redrawn per frame (Reanimated or JS-driven), while the rotation alone is cheap on the native
  driver. Decide whether to add a circular timeline.

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
