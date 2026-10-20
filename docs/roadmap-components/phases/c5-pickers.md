# c5: Pickers

**Depends on:** c4 and r4 (needs the text field with affixes c1a, button and icon button, menu,
dialog, select, and the app bar's header patterns). **Subphases:** c5a, c5b, parallel. **Gap
analysis:** §4.0, §1.5.

## Read first

The r4 context; gap analysis §4.0 (anatomy of each picker); zag's `date-picker` and
`date-input` parts.

## c5a: Date picker, docked date picker, date input

One subphase: they share a `calendar…` sub-anatomy (`weekdays`, `weekday`, `grid`, `day` with
today, selected, outside-month and range states) and the same zag machine family.

- `datePicker` (modal): header, headline, selected date, mode toggle, calendar, actions; zag
  `date-picker` and `dialog`.
- `dockedDatePicker`: text field, month and year buttons, `prev`, `next`, calendar, year list,
  actions; zag `date-picker` and a popover.
- `dateInput`: headline, text fields, actions; zag `date-input` (beta).
- Own files: new `calendar.ts` (shared), `date-picker.ts`, `docked-date-picker.ts`,
  `date-input.ts`, machines, bindings.

## c5b: Time picker and time input

One subphase: they share headline, period selector and actions.

- `timePicker`: `mode` dial or scroll; dial (centre, track, labels), scroll (two scroll fields
  with accessible focus and selection announcements); `vibrant` colour set. `timeInput`: two
  text fields and a period selector.
- Own machine (no zag machine): hour and minute state, 12 and 24-hour, selection mode.
- Own files: new `time-picker.ts`, `time-input.ts`, a machine, bindings.
- The dial is geometry: check whether it is a shape exception (guidelines §5.1) and record it.

## Done when

As for c1, plus keyboard and screen reader paths are tested, and 12 and 24-hour and
locale-dependent week starts are covered.
