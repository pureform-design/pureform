# c9b: FileUpload (output context)

Branch `c9b`, from main `e1011942`. Commits: `git log e1011942..c9b`. Not pushed; main untouched.
Read first: [conventions](../conventions.md), [c9](../phases/c9-beyond-m3.md), [c8](c8.md), [m3](m3.md).

## What was done

- **Machine** (`@pureform/machines/file-upload`, `packages/machines/src/file-upload/`): Zag's
  `@zag-js/file-upload` 1.46 as it is (new catalog entry and dependency; `bun.lock` updated), with
  the anatomy extended by the preset's drawn-only parts (`icon`, `headline`, `supportingText`,
  `error`) and a `Schema` type. The drift spec pairs it with the preset's anatomy; a browser spec
  covers the dropzone, the chosen/rejected files, the drag-over state and removal. Both bindings'
  `optimizeDeps` list the new Zag package.
- **Preset** (`packages/preset/src/components/file-upload.ts`, registered in `index.ts` and
  `pureform.ts`): `fileUpload` slot component, slots `root, label, dropzone, icon, headline,
supportingText, itemGroup, item, error`, variants `color` (a group colours the drag-over state,
  the button's `groupTokens`) and `invalid`; **0 compounds** (so §5.5's compound count is
  unchanged). The dropzone is dashed; the `dragged` state (`data-pf-dragging`, set from Zag's
  `dragging`) takes the group's container and a solid outline; `invalid` outlines it in the error
  colour; disabled dims it. No `indication` entry (see decisions). Spec and snapshot beside it;
  `color-variants.spec`, `pureform.spec`, `anatomy.spec` (icon parts) updated; component count 68
  (§1.8, checked by `doc-counts.spec`).
- **binding-core** (`components/file-upload.ts`, `usage.ts` entry `file-upload`, `index.ts`):
  `FileUploadRootOwnProps` (variants, Zag's file props, `progress`, `errorMessage`,
  `removeLabel`), `FileUploadContentProps`, `fileUploadSelection`, `fileUploadMachineProps`,
  `fileUploadErrorText` (default messages for Zag's six reasons), `fileUploadProgress`,
  `isPreviewable`, `fileUploadItemTestId`; for React Native `FileUploadEntry` and
  `formatFileSize`. Two glyphs added (`upload`, `file`) to `GLYPH_PATHS`.
- **React and Solid** (`src/file-upload/`, `package.json` exports, `vite.config.ts` entries,
  `fileUploadRegistry` fixture, specs): parts `Root` (with the hidden file input), `Label`,
  `Dropzone`, `Icon`, `Headline`, `SupportingText`, `Trigger` (a pureform `Button` with Zag's
  trigger props), `ItemGroup` (`ul`), `Item` (`li`, default content a `ListItem` with the preview
  as its leading part, name and size through Zag's name/size props, a remove `IconButton` with
  Zag's delete trigger props, and a `LinearProgress` under it while `progress(file)` returns a
  number, an indeterminate one for `null`), `Error`; and the ready-made `FileUpload`. Rejected
  files list after the accepted ones with `data-type="rejected"` and their reasons in place of
  the size.
- **React Native** (`src/file-upload/`, export, vite entry, spec in `components.spec.tsx`):
  `FileUpload` with `files` (`FileUploadEntry[]`), `onPick`, `onRemove`, `progress` per entry; no
  Zag (see decisions).
- **Cases** (`@pureform/component-cases` `cases/file-upload.ts`, `FileUpload` in
  `COMPONENT_NAMES`, both scene maps in `tests/component-suites`): 11 examples plus the keyboard
  case; Storybook builds the stories (`omni run build -p @pureform/storybook-web`). `accept` is
  tagged `@control text`; `name`, `id` and `defaultAcceptedFiles` `@control none`.
- **Docs:** gap analysis (matrix row, §1.8 count 68 and Zag 24 wrapped, the Zag table, the parts
  table, §7), the READMEs of machines, preset, binding-core, react, solid and react-native.
- **Deprecated options:** none to remove; this is a new component (nothing had an equivalent).

## Where the design is pureform's own, not M3's

Material has no file upload. The look (a dashed outlined zone, tinted while dragging over it) is
pureform's, built from M3 parts: the trigger is the outlined button, a file is a list item with a
thumbnail or icon, an icon button and a linear progress, and a rejection is the error-coloured
supporting text. The default English texts ("Drop files here", "Choose files", the rejection
messages, "Remove <name>") are pureform's; each is a prop.

## Decisions

1. **The drop zone is not a button.** Zag gives it `role="button"` with a click and Enter/Space
   path, but the trigger sits inside it, and a button holding a button fails axe
   (`nested-interactive`). The bindings call `getDropzoneProps({ disableClick: true })` (role
   `application`, no tab stop): the zone only takes drops, the trigger (a `Button`) opens the dialog
   and is what Tab reaches. So the dropzone has no state layer or focus ring, and the preset has
   no `indication` entry; the trigger button and the remove buttons show their own. Say if you
   want the whole zone clickable instead: it would mean the trigger outside the zone (or a
   zone-only press with no trigger inside).
2. **Zag's names stand for the files:** `acceptedFiles`, `defaultAcceptedFiles`, `onFileChange`,
   `onFileAccept`, `onFileReject`, not the `value`/`defaultValue`/`onValueChange` shape, so there's
   no `state` in the case (the controllable suite needs that shape) and no `form` case (a file
   input submits `File`s, not text entries; the spec checks the hidden input's `name`).
3. **Files don't go in the examples,** which are plain data the server renders too; the specs
   choose files through the hidden input (`userEvent.upload`).
4. **Per-file errors use the reasons Zag gives** (`TOO_MANY_FILES`, `FILE_INVALID_TYPE`,
   `FILE_TOO_LARGE`, `FILE_TOO_SMALL`, `FILE_INVALID`, `FILE_EXISTS`) and the app's own from
   `validate`; `errorMessage(code, file)` overrides the text.
5. **Upload progress is the app's.** The machine doesn't upload; `progress(file)` is read on every
   render of the list, so the app drives it with its own state.
6. **React Native has no Zag machine:** there's no file dialog or drop. The app picks (the
   trigger calls `onPick`; no trigger without it), keeps `files` and reports `progress`; a file
   with `errors` shows them. An `image/*` entry with a `uri` shows an `Image` thumbnail.
   `dragging` draws the drag-over look for a host that has one. No accept/size/count limits on
   React Native: the picker and the app apply them.
7. **Remove buttons sit in the list item's `trailing` part,** which the list item marks
   `aria-hidden` (it's meant for icons). Both bindings pass `slotProps.trailing["aria-hidden"] =
false` so the buttons are reachable. A list item with an interactive trailing control could
   own this (hint below).
8. **Visual suite and `RN_COMPONENTS` not extended:** a new screenshot section needs a baseline
   and `rn-components.ts` feeds the recorded indication fixtures (`web.txt`, `native.txt`); both
   are the orchestrator's single full run. Neither is registered here.
9. **Outside my files:** `packages/solid/src/internal/zag/bindable.ts` now creates its signal with
   `ownedWrite: true`. Removing a hovered Solid `Button`/`IconButton` (the remove button, after
   the press) made the interaction emitter end its hover from a cleanup, which the button
   machine's source subscription turned into a write to the machine's context: Solid threw
   `REACTIVE_WRITE_IN_OWNED_SCOPE` and the file stayed listed. Any Solid machine written to from a
   cleanup had the same fault; it only showed up now.

## Tests

- `omni run build test -p @pureform/machines -p @pureform/preset -p @pureform/anatomy`: passed
  (the preset's carousel spec timed out once under load and passed on `-f failed`).
- `omni run build test -p @pureform/react -p @pureform/solid -p @pureform/binding-core`: passed
  after fixes; `-p @pureform/react-native`: passed (rn-adapter's `factory.spec.ts` "for every
  variant value" timed out at 60s once under load, passed on `-f failed`). Snapshot and
  `.snap` files aren't omni inputs: after `vitest -u` the omni rerun needs `-f failed`.
- e2e after `omni run generate prepare -p @pureform/panda-fixture`, from `tests/component-suites`
  with `vitest.config.e2e.ts`, projects `solid/panda`, `react/css`, `react/tailwind`, `-t FileUpload`:
  `accessibility.e2e.test.ts` 66 passed; `direction`, `keyboard`, `server-rendering`, `themes`,
  `indication`, `forms`, `controllable` 174 passed (the rest skipped by `-t`).
- `bunx tsc --noEmit -p tsconfig.json` clean in anatomy, machines, preset, binding-core, react,
  solid, react-native and component-cases. In `tests/component-suites` it reports errors inside
  `packages/solid/dist/*.jsx` (the build's output, resolved without the `development` condition)
  and the CSS/Tailwind registries before they're generated; none in the files c9b touched.
- `omni run build -p @pureform/storybook-web`: passed; `FileUpload.stories.ts` is generated.
- oxfmt and oxlint on the changed files. No conflict markers.

## Refactoring hints

- **Helpers that look generic:**
    - `fileUploadProgress(progress, file)` and the per-item `ListItem` + `IconButton` +
      `LinearProgress` row in `packages/{react,solid}/src/file-upload/file-upload.tsx`: any list of
      removable, uploading or downloading things (a download list, a queue) would want it. The
      default `Item` content is the candidate to move into a shared `RemovableListItem` part.
    - The `trailing: { "aria-hidden": false }` slot override (decision 7): the list item could drop
      `aria-hidden` itself when its trailing part holds a control, or have a `trailingControl` part.
    - `formatFileSize` (binding-core `components/file-upload.ts`) next to Zag's own `getFileSize`
      (which the web uses); React Native could use Zag's `@zag-js/i18n-utils` `formatBytes`
      directly, if r9 wants one formatter.
    - The `ownedWrite` bindable fix is generic to every Solid machine.
- **Code that looks like a sibling's:** the root with a hidden native input
  (`useFieldsetDisabled`, hidden input ref) copies tags-input's; the preset's
  `Object.fromEntries(groups…)` `color` variant copies `colorTokenVariants`' shape without its
  `{ root: {} }` for the default group, because `color-variants.spec` expects `primary` to be `{}`
  for the fields; `colorTokenVariants` for button/FAB/fabMenu returns `{ root: {} }`. r9 could make
  the two agree. c9a's NumberField and CodeField build the same text-field-like parts.
- **Suggested home:** a shared item row in `packages/binding-core/src/components/` plus a binding
  part per framework; the glyph helpers already live in `glyphs.ts` of each binding.
- **What must not change:** `file-upload.spec.ts` (machines, preset with its snapshot), the
  bindings' `file-upload.spec.tsx`, `components.spec.tsx`'s "file upload", the `FileUpload`
  component suites on all three targets, `anatomy-drift.spec.ts`, `doc-counts.spec.ts`.

## Open questions

- **Whole-zone press:** decision 1 trades the zone's click for valid markup. Want a prop that
  makes the zone the control (trigger omitted), as Zag intends?
- **Multiple files default:** Zag's `maxFiles` defaults to 1, so one file replaces the last
  unless `maxFiles` is raised. Kept (Zag's default); say if the ready-made should default higher.
- **Previews:** image files get an object-URL thumbnail (revoked on unmount); other types get the
  document glyph. No video/PDF preview.
- **English defaults** ("Drop files here", "Choose files", the six rejection messages) aren't
  localised beyond the props that replace them; Zag's own `translations` (the dropzone's
  `aria-label` "dropzone") aren't exposed yet.
- **React Native:** no drag-and-drop (a React Native Web host could set `dragging`), no limits.
  An `expo-document-picker` example in the demo would show the intended pairing.
- **Screenshots and `RN_COMPONENTS`** (decision 8) are left for the phase's single run.
