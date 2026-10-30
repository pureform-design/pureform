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

Each was traced through the story scene and component code. "Real" means the component or preset is
at fault; "scene" means the story host or scene differs from the others. Confirm in the storybook
before changing, then fix the scene or component as marked.

Real bugs:

- **Solid date picker icons:** `packages/solid/src/date-picker/date-picker.tsx` (~445) renders the
  prev/next `IconButton`s with no `icon`; React passes `ChevronStartIcon`/`ChevronEndIcon` and
  `mirror`. Glyphs already exist in Solid. Also check Solid's docked picker and date input.
- **Select arrow doesn't open (Paginator, any React/Solid Select):** the trailing icon from `icon()`
  in `packages/preset/src/components/field.ts` is absolutely positioned over the input with no
  `pointerEvents: none`, so clicks miss the input that opens the list (`native-select.ts` already
  sets it). Fix in the preset; this is not Paginator-specific.
- **Rating small star on hover (React, Solid):** `filled(0.5)` in `preset/.../rating.ts` is a
  clipped box, but its `svg` is a flex item that shrinks to half width and scales down. Add
  `flexShrink: 0` to the glyph so `overflow: hidden` clips it.
- **RN Paginator label twice:** `react-native/src/paginator/paginator.tsx` draws a `pageSizeLabel`
  and passes `label` to `Select`, which floats it. Use an accessibility label instead (React uses
  `aria-label`).
- **RN DateInput separators highlighted:** the `/` literals use the root's `segment` style, which
  carries the focus state whenever any segment is focused. Style them from a focus-free selection.
- **RN TextArea `autoGrow` is a no-op:** `fieldSizing` is dropped by the adapter and `autoGrow` is
  never read. Track `onContentSizeChange` and set the height, clamped to the minimum rows. (On web it
  is CSS `field-sizing`; check the browser before calling a web report a bug.)
- **RN RadioGroup `orientation`:** vertical is the RN/Material default, but `orientation` is
  ARIA-only on RN and never changes the layout. Map `horizontal` to a wrapping row, or document it.
- **Table row hover parity:** the preset specifies a hover tint on body rows (not from Material), so
  React/Solid have it and RN has no hover state. Decide to keep it (add pointer enter/leave to RN
  rows) or drop it from the preset.
- **SearchView trigger width (React, Solid, probably RN):** the trigger is `width: 100%` while the
  `SearchBar` is capped at `maxWidth: 720px`, so the button outspans the pill. Make the trigger
  shrink-wrap the bar (`width: fit-content; max-width: 100%`) or carry the same cap.
- **Card width:** the preset's card root sets no width, so web (`<button>` in the case) shrinks to
  content while RN stretches. Decide the intended width, then set it in the preset or RN's root.

Scene or host issues (fix the story or scene, not the component):

- **RN Scrim:** the story uses the DOM stage with a sibling page; the native root has no sized,
  positioned frame. Add a native scene with page content inside a sized frame.
- **SideSheet > Open standard:** no scrim on web is correct (non-modal). On RN a standard sheet
  renders in the app's layout (start edge) and its X is a no-op without `onOpenChange`; give the RN
  scene a row container aligned to the end and controlled state.
- **BottomSheet > Opened standard (RN):** the standard sheet renders in flow, so it sits at the top
  of the 480px frame. Give the scene a bottom-aligned column frame.
- **Toast on RN:** the `Toaster` is inline and positions against the story root, not the viewport,
  so it lands near the button and is clipped. Give the scene a tall positioned frame (or portal).
- **Toolbar > Opened overflow:** web (menu) is correct. RN has the overflow logic, but a
  shrink-wrapped host measures as wide as all items. Give the case a fixed narrow width on every
  renderer; if RN still doesn't overflow in a fixed-width parent, it is an RN measuring bug.
- **Carousel arrow keys:** web's machine moves focus between item masks; RN is a `ScrollView`
  and scrolls. Expected on touch-first RN; add `onKeyDown` focus-and-scroll on react-native-web if
  parity is wanted, otherwise mark it as a known difference in the stories.

Unclear, need a measurement first:

- **Draggable list item ripple (React, Solid):** a swipe only sets the pressed state layer; M3
  shows the dragged state, not a ripple. Probably by design; confirm the intended spec.
- **TimeInput border radius (RN, Solid vs React):** same `fieldRadius` token on every binding, so
  compare each renderer's computed `border-radius` (suspect Panda's `radii.small` fallback in React).
- **RN wavy indeterminate:** linear already animates (slide plus wave clocks, SVG engine only).
  Circular does not: its arc grows and shrinks on web by animating `value`, which on RN needs the
  SVG path redrawn per frame (Reanimated or JS-driven) while the rotation alone is cheap on the
  native driver. Decide whether to add a circular timeline.

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
