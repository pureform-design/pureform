# c5b: Time picker and time input (output context)

Commits: see `git log 00729f1..c5b-time-pickers`.

## Built

- **Preset** (`packages/preset/src/components/`):
    - `time.ts` (shared by the two): `timeTokens()` (surface, headline, field colours and 96px
      width with `radius("small")`, separator, period selector colours/outline/52px width, root
      `radius("extraLarge")`, padding, gaps, indication tokens) and `timeSlots(ref, fieldHeight)`
      (root, headline, body, separator, periodSelector, period, actions). Each component declares
      the tokens under its own name.
    - `time-picker.ts`: `timePicker`, parts `root, headline, body, hourSelector, separator,
minuteSelector, scrollItem, periodSelector, period, dial, dialTrack, dialHandle, dialCenter,
dialLabel, actions`. Variants `mode: dial | scroll`, `color: standard | vibrant`; 0 compounds.
      Extra tokens: `fieldHeight` 80, `dialContainer`, `dialContent`, `dialSelectedContent`,
      `dialHandleColor`, `dialSize` 256, `handleSize` 48, `trackWidth` 2, `centerSize` 8,
      `handDuration` (`medium2`), `handEasing` (`emphasized`), `scrollItemHeight` 56, `scrollGap`.
      Indication: `hourSelector`, `minuteSelector`, `period`. `mode` sets slot styles only, `color`
      only root tokens (no overlap; a spec checks it). The hand (`dialTrack`) turns with a
      `transform` transition through `motionTransition` (dropped under reduced motion).
    - `time-input.ts`: `timeInput`, parts `root, headline, body, hourField, minuteField, input,
fieldLabel, separator, periodSelector, period, actions`; no variants, 0 compounds;
      `fieldHeight` 72, focus outline tokens, `fieldLabelColor`, `fieldLabelGap`.
    - Spec `time-picker.spec.ts` (both components, snapshots). Registered in `index.ts`,
      `pureform.ts` (after `appBar`), `pureform.spec.ts`, `contrast.ts`.
- **Anatomy:** regenerated; `anatomy.spec.ts`'s `INDICATION` gains both.
- **Machine** (`packages/machines/src/time-picker/`, `@pureform/machines/time-picker`): pureform's
  own, in Zag's shape (`machine`, `connect`, `anatomy` and `timeInputAnatomy`, `props`). One
  machine serves both components. Props: `value`/`defaultValue`/`onValueChange` (`HH:mm`),
  `view`/`defaultView`/`onViewChange` (`"hour" | "minute"`), `hourCycle` (12 | 24, else the
  locale's), `locale`, `translations`, `disabled`, `readOnly`, `name`, `form`. States `idle` and
  `dragging` (the dial's pointer). API getters for every part, plus `getHiddenInputProps`,
  `dialLabels`, `scrollItems(view)`, `periodNames`, `spokenValue`. `time-picker.time.ts` holds the
  framework-free arithmetic (`parseTime`, `formatTime`, `displayHour`, `stepTime`, `timeAtEdge`,
  `withPeriod`, `parseField`, `localeHourCycle`, `localePeriods`, `spokenTime`, `dialLabels`,
  `dialHand`, `timeAtPoint`, `dialLabelSelected`), which React Native uses too. Spec
  `time-picker.spec.ts`; `anatomy-drift.spec.ts` gains both.
- **binding-core** (`components/time-picker.ts`): `TimeBehaviorProps`, `TimePickerRootOwnProps`,
  `TimeInputRootOwnProps`, `TimeContentProps<Node>` (`headline`, `actions`), the `*_ROOT_PROPS`
  lists, `TIME_PICKER_HEADLINE`/`TIME_INPUT_HEADLINE`, `timeMachineProps`,
  `timePickerSelection`, `timeInputSelection`. Usage entries `time-picker` and `time-input`.
- **Solid and React:** `time-picker/` (`TimePicker` with `Root`, `Headline`, `Body`,
  `HourSelector`, `Separator`, `MinuteSelector`, `PeriodSelector`, `Period`, `Dial`, `Actions`;
  `useTimePicker()`) and `time-input/` (`TimeInput` with `Root`, `Headline`, `Body`, `HourField`,
  `Separator`, `MinuteField`, `PeriodSelector`, `Period`, `Actions`). Shared `src/time.tsx`
  (`useTimeMachine`, `machinePart`) outside the component folders, so the usage scan doesn't count
  the picker as drawn by the input. Exports, `vite.config.ts` entries, registry fixtures, specs.
- **React Native:** `time-picker/` (`TimePicker`: a dial on the responder system, `adjustable`
  with increment/decrement actions, or scroll fields) and `time-input/` (`TimeInput`: number-pad
  `TextInput`s); shared `src/time.tsx` (`useTime`, `timeLocale`, `TimeButton`, a toggle part with
  its own selected and interaction state). Spec `time-picker/time-picker.spec.tsx`.
- **Tests:** component suites `components/time-picker.ts` (both; 828 tests pass with
  `-t "TimePicker|TimeInput"`), the browser suite's `time-pickers` screenshot (12h, 24h, vibrant
  under `sharp`, scroll, input), indication fixtures (web and native), `reduced-motion` (the hand:
  `transform` → `none`), `RN_COMPONENTS` (rn-parity passes).
- **Theme conformance:** radii from roles except the dial (below); colours from tokens (static
  teal/sharp/dense and the seed theme pass the themes suite); logical properties except the dial's
  placement; interaction states through the state layer; motion through `motionTransition`; type
  roles (`displayLarge`, `displayMedium`, `titleMedium`, `labelMedium`, `bodyLarge`, `bodySmall`).
  No density (M3 gives the time picker none).

## Deviations from the design

- **Parts beyond the gap analysis draft:** `body` (the row), `period` (each AM/PM button: the
  draft had only `periodSelector`), `dialHandle` (the selector circle), `scrollItem` (scroll
  mode's values); the input gains `input` and `fieldLabel` inside each field. §4.0's draft rows
  are updated.
- **The dial is a shape exception (guidelines §5.1), but not on `radii.spec`'s allow-list:** it
  uses `circle` (50%), which isn't a fixed px radius, so the spec doesn't flag it (an allow-list
  entry would be "stale"). Instead the dial, handle and centre set `cornerShape: round`, and
  `corners.ts` now leaves a style that sets its own `cornerShape` alone, so a bevel or squircle
  theme keeps the dial round. Documented in the preset README and the gap analysis.
- **A clock doesn't mirror:** the bindings place the labels, handle, track and centre in physical
  percentages of the dial (inline `left`/`top`), and the preset centres them with a `translate` by
  half their token size. `direction.spec.ts` allows those three translates; the component suites'
  direction test gains `fixed` parts (kept in place, not mirrored). Under `rtl` the left arrow
  steps forward, as on a slider.
- **Not modal by itself:** the picker is the surface; put it in a `Dialog` for M3's modal time
  picker. There's no keyboard-icon toggle between picker and input (two components; the app
  switches).
- **Selectors' names include their value** ("Hour 9"), for axe's label-content-name rule.
- The track's start is the centre's left edge (1px off centre at the default 2px width): an inline
  `left: 50%` with no half-width offset, so React Native needs no `calc`.

## Stubs and gaps

- No landscape layout (M3's horizontal time picker), no hide/disable of times (min/max).
- No form reset handling (the hidden input submits; a reset doesn't put the time back).
- React Native: no keyboard on the dial (only accessibility actions); scroll fields step by press
  or accessibility action, not a swipe.
- The scroll mode is our reading of Compose 1.5's `TimePicker` scroll display (values above and
  below the current one); its exact visuals and `vibrant` colours are unconfirmed.

## How to verify

- `omni run build test -b 00729f1 -w -o continue`, then `-f failed`: 101 succeeded, 0 failed (the
  first run failed only on the indication fixtures, regenerated on purpose: additions only).
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "TimePicker|TimeInput"`
  (828 passed).
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
-t time-pickers`, `src/reduced-motion.e2e.test.ts`, `src/rn-parity.e2e.test.ts`,
  `src/panda-factories.e2e.test.ts`.
- tsc clean in anatomy, binding-core, machines, preset, solid, react, react-native,
  panda-fixture, browser-e2e-tests, component-suites. `bun install --frozen-lockfile`: no changes
  (no new dependencies).

## Notes for the next phases

- Shared files touched (one-line or small additive edits): preset `index.ts`, `pureform.ts`,
  `pureform.spec.ts`, `contrast.ts`, `corners.ts` (+ `corners.spec.ts`), `direction.spec.ts`
  (three allow-list entries); anatomy `anatomy.spec.ts`; machines `index.ts`, `package.json`,
  `vite.config.ts`, `anatomy-drift.spec.ts`; binding-core `index.ts`, `usage.ts`; each binding's
  `package.json`, `vite.config.ts`, registry fixture; component-suites `components/index.ts`,
  `components/types.ts` (`fixed`), `direction.e2e.test.ts` (the `fixed` check),
  `harness/scene.ts`, both `scene.tsx`; browser-e2e `rn-components.ts`, `visual.e2e.test.tsx`,
  `reduced-motion.e2e.test.ts`, indication fixtures; panda-fixture `page.tsx`. Rerun `generate`.
- Positioned interactive parts: inside an interactive card, the card's touch target (absolute)
  covers unpositioned children, so the periods and inputs are `position: relative`. Any picker
  part that takes the pointer should be positioned.

## Refactoring hints

- **Helpers that look generic:**
    - `machinePart(use, element)(part, label, machine)` in Solid's and React's `src/time.tsx`: a
      plain part that spreads the machine's props, the `plainParts` of r4 plus `machine`. c5a's
      pickers will want the same; move it next to `plainParts` in `parts.tsx`.
    - `time-picker.time.ts`'s locale helpers (`localeHourCycle`, `localePeriods`, `spokenTime`):
      c5a's date picker needs week starts and month names from `Intl` the same way; a shared
      `machines/src/locale.ts` could hold them.
    - React Native `TimeButton` (`src/time.tsx`) is `SurfaceButton` plus a `selected` state and a
      text child. `SurfaceButton` could take `states` and a text mode instead.
- **Code that looks like a sibling's (c5a):** the headline and actions slots (`timeSlots`) are
  what c5a's `datePicker` and `dateInput` draw (labelMedium headline, end-aligned actions row,
  `surfaceContainerHigh` surface with `extraLarge` corners). The time input's field box resembles
  c5a's date input fields (which reuse the text field). Hidden-input submission and a
  `HH:mm`/ISO value prop are alike too.
- **Suggested home:** a `picker.ts` in the preset for the picker surface, headline and actions,
  once c5a lands; `parts.tsx` for `machinePart`; `machines/src/locale.ts` for `Intl` helpers.
- **What must not change:** `time-picker.spec.ts.snap`, the `time-pickers` screenshot, the web
  and native indication fixtures, the component suites' `TimePicker`/`TimeInput` cases,
  `reduced-motion` and rn-parity.

## Open questions

- Unconfirmed values (m3.material.io unreadable): the vibrant colour set (we use
  `primaryContainer` surface, `surfaceContainerLowest` fields and dial, `primary` selected field),
  the scroll mode's look (three values a column, 56px each), the 24-hour rings (outer `00`–`11`,
  inner `12`–`23`, as Compose shows them), the ring radii (39% and 25% of the dial), Page Up/Down
  steps (5 minutes, 3 hours), and the hand's timing (`medium2`, emphasized).
- Should the shape exception be visible in `radii.spec.ts` too? Today the spec can't see a 50%
  radius, so the exception lives in `cornerShape: round` and the docs.
- Should the picker grow a `modal` ready-made (`TimePickerDialog`) over `Dialog`, and a toggle to
  the time input, as M3's modal picker has?
- "Locale-dependent week starts" in the phase's Done-when belong to c5a's calendar; c5b covers the
  locale-dependent 12/24-hour default and period names instead (machine and binding specs).
