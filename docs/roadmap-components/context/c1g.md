# c1g: Slider on zag (output context)

Commits: see `git log 38e43e0..c1g-slider` (machines, preset, binding-core, bindings, tests, docs).

## Built

- **Machine** (`packages/machines/src/slider/index.ts`, `slider.anatomy.ts`): Zag's
  `@zag-js/slider` (new dependency, root catalog and `bun.lock`), wrapped in Zag's shape
  (`machine`, `connect`, `anatomy`, `props`, `Schema`, `Props`, `Api`). The old own machine
  (`slider.machine.ts`, `connect`, `dom`, `props`, `types`, `snapValue`) is deleted.
    - `machine`: pureform's fieldset rule (`withFieldsetRule`), no Zag reset, `withInteraction`
      (ends what's in progress when disabled), `thumbAlignment: "center"` by default, and
      `ids.control` = the root's id (the root is also Zag's control).
    - `connect(service, normalize): Api` has the preset's parts: `getRootProps`
      (root + control, Zag's control style kept, root style dropped), `getStartTrackProps`,
      `getTrackProps`, `getActiveTrackProps` (Zag's range), `getMarkerGroupProps`,
      `getMarkerProps({ value })`, and per thumb `getHandleProps(i)` (Zag's thumb, role
      `slider`, `aria-invalid`), `getStateLayerProps(i)`, `getValueIndicatorProps(i)` (Zag's
      dragging indicator, `hidden` unless that thumb is dragged), `getInputProps(i)` (hidden
      input, `disabled` while the slider is). Zag's inline position styles are left off. Also
      `percents`, `percentOf(value)`, `disabled`, `focusedIndex`.
    - Up/Down arrows step a horizontal slider too (Zag ignores them; range inputs and the APG
      don't).
    - Interaction: pointer down on the root or a handle → `press`, `dragStart`; release →
      `dragStop`, `release`; root hovers; handles focus/blur.
    - Anatomy: Zag's parts extended with `activeTrack`, `startTrack`, `stateLayer`, `handle`,
      `input`, `valueIndicator`. In c0b's drift test (`pairs.slider`); the todo and pin test are
      gone.
- **Preset** (`packages/preset/src/components/slider.ts`): parts `root, startTrack, track,
activeTrack, markerGroup, marker, stateLayer, handle, valueIndicator, input`; structure
  `handle: [stateLayer]` (the state layer now sits inside the handle), `markerGroup: [marker]`.
  Variants `color`, `handleShape` (bar, round), `size` (xsmall–xlarge), new `orientation`
  (horizontal, vertical). New tokens: `activeStart`, `activeEnd`, `startGap`, `endGap`,
  `stopActive`, `bar` (flag set by `handleShape`), `stopColor`, `stopActiveColor`, `stopSize`,
  `valueIndicator{Color,Content,Width,Height,Gap}`. Geometry is one set of logical insets per
  orientation, and bar vs round is `blend(…, bar)` (radii included: `blend(full, barRadius,
bar)`), so **no compounds** (21 across the preset, unchanged). Indication entry: trigger
  `handle`, surface `stateLayer`, focus `handle`.
- **binding-core** (`components/slider.ts`): `SliderValue = number | readonly number[]`;
  `SliderBehaviorProps<V>`/`SliderRootOwnProps<V>` add `largeStep`, `minStepsBetweenThumbs`,
  `centered`, `stops`, `valueIndicator`, and `orientation` (variant). Helpers:
  `sliderTrackTokens`, `sliderThumbTokens`, `sliderMarkerTokens`, `sliderStops`,
  `sliderStopActive`, `sliderControllableProps`, `sliderValues`, `sliderValueShape`;
  `sliderSelection(props, percents)`, `sliderMachineProps(props, machineId)` (signature change),
  `sliderNativeDefault` joins a range with commas. `ids` is `{ root, handle(i), input(i) }`.
- **Solid / React** (`src/slider/slider.tsx`): generic ready-made `Slider<V = number>`; parts
  `Root`, `StartTrack`, `Track`, `ActiveTrack`, `MarkerGroup`, `Marker` (`value`), and per thumb
  (`index`) `Handle` (holding `StateLayer`), `ValueIndicator` (children default to the value),
  `Input`. Each thumb's and stop's parts set their own tokens through
  `useClasses("slider", { tokens }).root.style`. The ready-made takes `aria-label` per thumb as
  an array. New exported types `SliderThumbPartProps`, `SliderMarkerProps`.
- **React Native**: range (nearest thumb moves; keys move the last dragged), `centered`,
  `stops`, `valueIndicator`, vertical; `Thumb` and `Marker` child components resolve their own
  styles with their own tokens (`useComponentSlots` per thumb/stop).
- **Tests:** machine spec rewritten; preset `expressive.spec.ts` (round kept, orientation
  insets); binding-core display spec; Solid/React slider specs (range, stops, indicator);
  component-suites case (handle is the focusable and the aria element, click on root; new
  examples range, centered, stops, value indicator, vertical); panda-fixture page gains a
  slider samples row (range, centered, stops + value indicator, vertical) and the visual
  `progress` screenshot was regenerated and reviewed; the indication web fixture only
  reordered (handle now before its state layer); registry fixtures of Solid/React updated.

## Deviations from the design

- **`centered` and range are behaviour, not preset variants.** The active track depends on the
  value against the middle; React Native can't take `min()`/`max()` of percentages with pixels,
  so the binding computes the tokens (`activeStart`, `activeEnd`, `startGap`, `endGap`). A
  pure-CSS user sets these tokens (preset README).
- **Indication trigger is the handle** (was the native input). Forwarded states mark the handle;
  the state layer reads the handle's states, which is why it moved inside the handle. A drag from
  the track marks the dragged thumb's handle `pressed`.
- **Removed (with equivalent):** the native `<input type="range">` overlay (replaced by the
  focusable handle plus a hidden input per thumb); the old machine's `snapValue` export; the
  `ids.input` string (now a function per thumb). Nothing deprecated by M3 was removed:
  `handleShape: "round"` has no Expressive equivalent and stays, with a test.
- The panda-fixture's first slider demo still renders an `input` part, which is now hidden
  (`display: none`), so that demo no longer drags; it's a static picture now.

## Stubs and gaps

- The automatic end stop of a continuous M3 slider isn't drawn; `stops` must ask for it.
- A range's two state layers share the component's interaction source (both tint on a press);
  only the round handle draws them.
- The value indicator shows while dragging only, not on keyboard focus.
- React Native: a range has one accessibility element (the root) for both thumbs.
- Inset icon: c7.

## How to verify

Ran (all targeted; the full run is the orchestrator's):

- `bunx tsc --noEmit -p tsconfig.json` in machines, preset, anatomy, binding-core, solid, react,
  react-native, panda-fixture, solid-demo and rn-web-demo (only the pre-existing missing
  generated-module errors in the demos).
- `bunx vitest run` (unit configs) in preset (364), anatomy (101), machines (242), binding-core
  (431), solid (422), react (368), react-native (237; one snackbar-queue flake that passed on
  rerun), css-adapter (41), tailwind-adapter (25), panda-adapter (71), rn-adapter (codegen
  spec 14/14 with a long timeout; `react.spec.ts` fails on Flow parsing, environmental as in
  c0c).
- `tests/component-suites` `-t "Slider|slider"`: 798 passed on all six projects.
- `tests/browser-e2e-tests`: indication, rn-indication, visual, direction, state-matching,
  panda-factories, parity, reduced-motion: all pass (fixtures updated as above).

## Notes for the next phases

- Merge: c1g touches the Solid/React registry fixtures (slider entry only), the panda-fixture
  page (one added block after the error slider), the indication `web.txt` fixture and the
  `progress` screenshot; regenerate those after merging c1b (progress shares the screenshot).
- `bun install` in this worktree didn't write `bun.lock`; the three `@zag-js/slider` lines were
  added by hand (`bun install --frozen-lockfile` accepts them). Rerun `bun install` after merge.
- The gap analysis rows were left unformatted (oxfmt realigns whole tables); run oxfmt on it
  after merging all c1 branches. §2.7's summary lines still list the slider's parts as to do.
- `oxlint` reported "no files found" in this worktree for every path (its ignore patterns
  likely match the worktree's location); lint wasn't checked.

## Refactoring hints

- **Helpers that look generic:** `blend`-based shape switching (`byShape`) and a corner picked
  by a gap flag (`cornerAt`) in `preset/src/components/slider.ts`; the per-orientation segment
  and point builders (`horizontalSegment`, `verticalSegment`, `horizontalAt`, `verticalAt`) are
  what a vertical progress or a toolbar would need. `useOwnTokens` in both web bindings (a part
  setting its own instance tokens through the registry) is generic: binding-core or each
  binding's `parts` could offer `scope.render(part, { tokens })`.
- **Code that looks like a sibling's:** c1b's linear progress track, gap and `stopIndicator` are
  the same geometry as `SEGMENTS` + `marker` here (track pieces cut by a gap, a stop dot coloured
  by the side it's on). `sliderStops`/`sliderStopActive` mirror what a discrete progress or the
  carousel indicators would compute.
- **Suggested home:** a `track.ts` in `packages/preset/src/components/` for segments, gap
  clearance and stops, shared by slider and progress; `useOwnTokens` into each binding's
  `parts` (or `useComponent`'s scope).
- **What must not change:** `new-components.spec.ts.snap` (slider), the `progress` screenshot,
  `indication/web.txt` and `native.txt`, the component-suites slider case.

## Open questions

- Value indicator size (48×44, `labelLarge`, 4px gap) and stop size (4px) and colours (on the
  active track the group's `on` colour, else `onSecondaryContainer`) come from the M3 token
  tables as remembered, not re-read from m3.material.io (unconfirmed).
- At a centered slider's middle with no handle there, the active and inactive tracks meet with
  outer corners and no gap; M3's exact join isn't confirmed.
- Should the value indicator also show on keyboard focus (M3 shows it while the handle is
  focused)? Left to dragging so a click doesn't leave it open.
