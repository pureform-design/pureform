# c5a: Date picker, docked date picker, date input (output context)

Commits: see `git log 00729f1..c5a-date-pickers`.

## Built

- **Dependencies** (`chore(deps)`): `@zag-js/date-picker` and `@zag-js/date-input` 1.46.0, and
  `@internationalized/date` ^3.12.4 (their peer), in the root catalog and
  `packages/machines/package.json`. `bun install` refused the lockfile ("Workspace dependency
  @pureform/machines not found"), so the five lockfile entries (`@internationalized/date`,
  `@swc/helpers`, `@zag-js/date-input`, `@zag-js/date-picker`, `@zag-js/date-utils`), the catalog
  lines and the machines workspace lines were **added by hand**. `bun install --frozen-lockfile`
  passes with no changes.
- **Preset** (registered in `index.ts`, `pureform.ts` after `autocomplete`):
    - `calendar.ts` (shared): `CALENDAR_TOKENS`, `CALENDAR_SLOTS`, `calendarParts(ref)` (`controls`,
      `prev`, `next`, `weekdays`, `weekday`, `grid`, `week`, `yearList`; every row a flex row of
      `cellSize` cells), `calendarControlButton(ref)`, `PICKER_TOKENS` (named apart from a text
      field's: `pickerContainer`, `pickerRadius`, …), `PICKER_HEADER_SLOTS`, `pickerActions(ref)`,
      `pickerChrome(ref)` (root, header, headline, selectedDate, modeToggle, divider, actions).
    - `calendarCell` component (in `calendar.ts`): slots `root` (the gridcell, draws a range's
      band) and `trigger` (circle or pill); variants `view` (day, month, year), `selection`
      (`CALENDAR_SELECTIONS`: none, selected, rangeStart, rangeMiddle, rangeEnd), `today`,
      `outside`. Each group sets only tokens: `selected`, `ranged`, `today` are **0%/100% flags**
      that the trigger's colours mix through `colorMix`, `todayOutlineWidth` is set from the theme
      token `todayOutline`. No two groups set one property (r4 investigation a); 0 compounds.
      Indication: trigger/trigger, centered.
    - `datePicker` (`date-picker.ts`): the modal surface; no variants, 0 compounds.
    - `dockedDatePicker` (`docked-date-picker.ts`, `createDockedDatePicker`): `affixField` (the text
      field: variant, color, icons, affixes, density; outlined + trailing icon by default; the
      field's 1 compound) plus the popup (`content`, `controls`, `prev`, `monthButton`, `next`,
      `yearButton`, weekdays/grid, `monthList`, `yearList`, `actions`).
    - `dateInput` (`date-input.ts`, `createDateInput`): `pickerChrome`, the affix field under a
      `field` wrapper (its variants' root tokens stay on the surface's root, `underField`), the
      `input` a group of `segment`s; outlined by default; the field's 1 compound.
    - Specs: `date-pickers.spec.ts` (incl. a per-component variant-overlap check) with snapshots;
      `pureform.spec.ts`, `icons.spec.ts`, `contrast.ts` entries.
- **Anatomy:** generated `calendarCellAnatomy`, `datePickerAnatomy`, `dockedDatePickerAnatomy`,
  `dateInputAnatomy`; hand-written composites `datePickerOverlayAnatomy` (dialog shape),
  `datePickerBackdropAnatomy`, `dockedDatePickerOverlayAnatomy` (Zag's positioner between root
  and popup) with `compositeTestIds`; specs updated (`anatomy.spec.ts` icon parts and indication).
- **Machines:** `@pureform/machines/date-picker` (Zag's re-exported, `anatomy`,
  `dockedAnatomy`, `cellAnatomy`, `toISO`) and `/date-input` (Zag's, `anatomy`); in the drift
  spec and `index.spec.ts`.
- **binding-core** (`components/date-picker.ts`): ISO-date helpers (`parseIsoDate`, `isoDate`,
  `addDays`, `addMonths`, `monthWeeks`, `weekStartOf` (Intl week info, CLDR region fallback),
  `weekdayLabels`, `formatIsoDate`, `parseDateText`/`formatDateText`, `dateFormatHint`,
  `todayIso`), selection helpers (`calendarCellSelection`, `chooseDate`, `isSelectableDate`,
  `selectedDateText`), `dateMachineProps(props, parse)` (always passes `startOfWeek` from the
  locale, so every target lays out the same weeks), root/content prop types and key lists,
  selections; glyphs `chevronStart`, `chevronEnd`, `calendar`, `edit`; usage entries
  `date-picker`, `docked-date-picker`, `date-input`.
- **Solid and React** (`@pureform/<b>/date-picker`, `/docked-date-picker`, `/date-input`):
  compound parts plus ready-mades. Modal: `dialogParts` + Zag's date picker inline holding a draft
  (OK commits, Cancel drops); focus opens on the chosen day; view trigger toggles day ↔ year.
  Docked: Zag's popover; prev/next for month and (`unit="year"`) year; month/year lists. Date
  input: Zag's date input segments, the container always filled. Shared `calendar-parts.tsx` in
  each binding. Solid adds `CancelTrigger`/`ConfirmTrigger`; React adds `useDatePicker()`/
  `useDateInput()` for composed pickers (same need, different shape: see open questions).
- **React Native:** ready-mades only, on the binding-core helpers (no Zag): `src/calendar.tsx`
  (`CalendarCell`, `DayGrid`, `CellList`), the three components, `date-pickers.spec.tsx`.
  `text-input.tsx`'s `Field` accepts `dockedDatePicker` and now chains `inputProps.onBlur`.
- **Tests:** component suites `components/date-pickers.ts` (every suite, binding and target,
  incl. direction, keyboard (date input arrows by direction), indication on the first day,
  overlays, themes, server rendering); browser `date-pickers` screenshot (reviewed),
  indication fixtures (additions only), `RN_COMPONENTS` (+4), reduced-motion fixture
  `calendarCell.trigger`. `rn-parity` now renders a skipped slot's children (the date input's
  segments under its `input`).
- **Docs:** gap analysis §1.5 rows, §3, §4.0 split and draft rows, §7 row and "removed"
  (nothing). READMEs of preset, anatomy, machines, binding-core, solid, react, react-native.

## Deviations from the design

- Each calendar cell is its own `calendarCell` component, not a `day` slot of each picker: a
  slot's variants are its component's, so per-day states (today, range position, outside) need
  a component per cell, as the list item is the list's. Selected is a variant too (Zag puts
  `aria-selected` on in-range cells as well, so the `selected` condition can't tell them apart).
- The date input is an inline surface (header, field, actions); the app puts it in a dialog or
  swaps it with the date picker through `onModeToggle`. Neither ready-made switches modes itself.
- The docked picker commits on choice and closes; it renders no actions by default.
- Days outside the month are hidden (`outsideOpacity` 0), as M3 draws them.

## Stubs and gaps

- React Native: no arrow-key navigation between days; icons are text glyphs; some labels
  ("Previous month", …) are fixed English; docked field writes only a range's first date.
- Year lists: Solid shows Zag's decade grid; React and RN a longer list. M3's scrolling year list
  isn't matched exactly.
- No density on the calendar (M3 gives the pickers none). No `color` variant on the calendar:
  the selected day is `primary` through tokens.
- 12/24-hour: the date pickers have no time; it is c5b's (time picker/input). Zag's date input
  supports `hourCycle` if a time granularity is ever added.
- The modal picker submits a hidden input of comma-joined dates (React) — the form story for the
  pickers is minimal; no form-reset handling.

## How to verify

- `omni run build test -b 00729f1 -w -o continue`: 100 succeeded, 1 failed (React/tailwind
  Autocomplete "controlled", the known flake); `-f failed` → 101 succeeded.
- tsc clean in preset, anatomy, machines, binding-core, solid, react, react-native,
  panda-fixture, browser-e2e-tests (component-suites only shows the known errors inside other
  packages' `dist`).
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "DatePicker|DockedDatePicker|DateInput"`:
  1175 passed.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx src/indication.e2e.test.ts src/rn-parity.e2e.test.ts src/reduced-motion.e2e.test.ts src/rn-indication.e2e.test.ts`.
- `bun install --frozen-lockfile`: no changes.

## Notes for the next phases

- Merge: shared files touched additively: preset `index.ts`, `pureform.ts`, `pureform.spec.ts`,
  `contrast.ts`, `icons.spec.ts`; anatomy `composites.ts` (+spec, `anatomy.spec.ts`); machines
  `package.json`, `vite.config.ts`, `index.ts`, `index.spec.ts`, `anatomy-drift.spec.ts`;
  binding-core `index.ts`, `usage.ts`, `usage.spec.ts` (now also reads `calendar-parts.tsx`/
  `calendar.tsx` as shared files), `glyphs.ts`; each binding's `package.json`, `vite.config.ts`,
  `glyphs.tsx`, registry fixture, README, `vitest.config.unit.ts` (optimizeDeps); RN
  `text-input.tsx`; suites' lists; `panda-fixture/src/page.tsx` (one line; the section is in
  `date-pickers.tsx`); browser `SECTIONS`, `RN_COMPONENTS`, reduced-motion fixtures,
  `rn-parity.e2e.test.ts`; root `package.json` and `bun.lock`. Rerun `generate`.
- c5b will touch the same registration lists (expect union conflicts).
- Gap analysis rows were padded by hand; a few cells are wider than their column. §1.8 totals
  were left for the merge: preset components +4 (calendarCell, datePicker, dockedDatePicker,
  dateInput), missing −3, zag covered −3, zag machines wrapped +2 (date-picker, date-input).

## Refactoring hints

- **Helpers that look generic:**
    - `colorMix` with 0%/100% flag tokens (`calendar.ts`) is the colour version of `blend`: a
      `blendColor(from, to, flag)` in `shared.ts` would serve any colour that follows two groups.
    - binding-core's ISO-date helpers are framework-free; c5b's time helpers could sit beside
      them (a `dates.ts`).
    - `pickerChrome`/`pickerActions` (preset) for c5b's time picker and time input header and
      actions (same headline, mode toggle, actions).
- **Code that looks like a sibling's:**
    - `docked-date-picker.ts` and `date-input.ts` repeat `selectField`'s assembly of
      `affixField` (`parts`, `density`, variants, defaults); a `fieldComponent({ extraSlots,
rootAs })` in `field.ts` would serve select, autocomplete, docked picker, date input, c5b's
      time input. `underField` (date input) is the "field under another root" case.
    - Bindings: the docked picker's field parts copy `select-field-parts.tsx` (Solid casts into
      it with a dummy item context); the date input repeats them again. A field-only parts factory.
    - Bindings: the ISO ↔ Zag value mapping (`useControllable` + parse + `toISO`) is in all three
      Roots per binding: a `useDateValue` hook.
    - Bindings: header/selected date/mode toggle/actions duplicated between `DatePicker` and
      `DateInput` (all three bindings) — and c5b's time picker will want the same.
    - Solid's `CancelTrigger`/`ConfirmTrigger` vs React's `useDatePicker()`: align on one.
    - React Native: the docked picker copies autocomplete's measure-then-open, `Portal` +
      `Anchored`, trailing `Pressable`; the modal copies `ModalDialog`'s trigger and positioner.
- **Suggested home:** `field.ts` (preset), binding `field-parts`/`picker-chrome` modules,
  binding-core `dates.ts`, RN `overlay.tsx`.
- **What must not change:** `date-pickers.spec.ts.snap`, the `date-pickers` screenshot, the
  indication fixtures' calendarCell lines, the component suites' DatePicker/DockedDatePicker/
  DateInput cases, rn-parity.

## Open questions

- Spec values unconfirmed (m3.material.io unreadable): container `surfaceContainerHigh`, 360dp
  width, 28dp (modal) / 16dp (docked) corners, 48dp cells with 40dp circles, year pills 72×36,
  header paddings (24/12, 16/12) and the 36dp headline gap, headline `labelLarge`, selected date
  `headlineLarge`, range `secondaryContainer`, today's 1dp `primary` outline, divider
  `outlineVariant`.
- Should the ready-mades switch between calendar and input themselves (M3's toggle), rather than
  leave it to the app through `onModeToggle`?
- Composed pickers' commit API: Solid `CancelTrigger`/`ConfirmTrigger` parts or React's hooks?
- Weekday names are hidden from assistive technology (Zag's head is `aria-hidden`; each day's
  label names its weekday). OK?
- Should the calendar take a `color` variant?
- Disabled docked picker: its supporting text (the format hint) fails axe contrast while
  disabled, so the suite has no disabled docked example; the text field has the same issue if
  given supporting text.
