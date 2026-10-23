# r9c: Components and forms (output context)

Branch `r9c`. Commits: `git log main..r9c`. Not pushed; main untouched. Siblings r9a (React Native
adapter and layout), r9b (motion) and r9d (duplication and tests) ran in parallel; nothing here
touches their items.

## Done

- **NativeSelect follow-ups:** the select's own `aria-describedby` joins the Field's ids instead of
  replacing them (`binding-core` `field-primitives.ts` / `native-select.ts`). React and React Native type `value`, `defaultValue` and `onValueChange` by `multiple`
  (a union on `multiple: true`), as Solid already did. Tests: field-primitives spec; the bindings'
  native-select specs ("joins aria-describedby", "types the value by multiple" with
  `@ts-expect-error` cases).
- **Forms suite and files:** `component-cases` types gain file entries; FileUpload's case has a form
  case (its files reach `FormData` under its `name`); React and Solid FileUpload write their files
  into Zag's hidden input at mount and on form reset (`writeInputFiles` in `binding-core/dom.ts`,
  `useFormReset`), and take `form`. The forms e2e and harness `page.ts` read file entries. Tests: file-upload
  specs (React, Solid), `forms.e2e.test.ts`.
- **Server-rendered number fields:** the React and Solid READMEs say to pass `locale` when server
  rendering; a number-field spec pins that `locale` wins over the environment's
  (`numberFieldLocale`).
- **Side sheet drag everywhere:** `side-sheet-drag.ts` drags the coplanar sheet on the web (it
  pushes the content as it moves) and React Native's standard (non-modal) side sheet drags too.
  Tests: `side-sheet-drag.spec.ts`, React Native `overlays.spec.tsx`, `side-sheet.e2e.test.ts`.
- **Sheet expanded events:** `onExpandedChange` fires only for the user's drag or press, not when an
  uncontrolled sheet reopens at another rest (`sheet-drag.ts` passes a user flag). Tests:
  `sheet-drag.spec.ts`, React and Solid bottom-sheet specs.
- **Overlays inside dialogs:** popovers and menus opened in a dialog or sheet layer above their host;
  e2e in `overlays.e2e.test.ts` (solid/panda, react/css, react/tailwind) and a README note.
- **List item trailing controls:** `ListItem` takes `trailingControl`, rendered outside the
  `aria-hidden` trailing part; FileUpload drops its `slotProps` override. Tests: React and Solid
  list-item specs.
- **Slider `thumbSize`:** the slider machine follows a changed `thumbSize`, as the pin input's
  `count` does. Test: `slider.spec.ts`.
- **React Native accessibility in stories:** the modal views (dialog, full-screen dialog, side
  sheet, bottom sheet) say `aria-modal` only on devices (`modalViewProps`; React Native Web's `Modal` is already
  the dialog) and the `Modal` takes the surface's `label` on the web (`aria-dialog-name`);
  the text field's input is labelled by its label; the TextField Disabled story's a11y check is
  back on (`stories.config.ts`). Tests: React Native `components.spec.tsx`, `overlays.spec.tsx`,
  story a11y checks.

## Checks

`omni run build test` over binding-core, machines, react, solid, react-native, component-cases and
preset; `tsc --noEmit` clean in each; `omni run build -p @pureform/storybook-web` passes. In the
full run, React Native's "snackbar queue with reanimated … holds while the pointer is over it" and
HorizontalSharedAxis "takes the instance's fade tokens", and rn-adapter's two preset-wide
`factory`/`codegen` specs, timed out under load; narrowed reruns of the React Native ones pass, and
rn-adapter isn't touched here (timing only).

## Declined refactors

None.

## Open questions

- rn-adapter's preset-wide specs sit near their 60 s / 120 s timeouts when the whole monorepo's
  tests share the machine (r9d's flakes list).
