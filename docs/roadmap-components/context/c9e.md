# c9e: CopyButton and Rating (output context)

Branch `c9e`, from main `e1011942`. Commits: `git log e1011942..c9e`. Not pushed; main untouched.

## Done

- **Dependencies:** `@zag-js/clipboard` and `@zag-js/rating-group` (1.46.0, the repo's Zag version)
  in the root catalog and `@pureform/machines`; both in React's and Solid's
  `vitest.config.unit.ts` `optimizeDeps.include`.
- **Machines** (`@pureform/machines/clipboard`, `/rating-group`, `ratingGroup` and `clipboard` in
  the index):
    - `clipboard`: Zag's, with `copyToClipboard` replaced so a denied write never rejects (async
      API, then the selection and `execCommand` fallback, then nothing). The machine still goes to
      `copied`, as Zag's does.
    - `rating-group`: Zag's with `withFieldsetRule` (the browser's fieldset rule on the hidden
      input, no reset of its own), and the anatomy extended with the preset's `icon`, `fill`,
      `halfFill`. The drift test has a `rating` pair.
- **Preset `rating`** (`rating.ts`, a spec and snapshot, registered, anatomy regenerated): slots
  `root`, `label`, `control`, `item`, `icon`, `fill`, `halfFill`; variants `color` and `size`
  (`small` 20, `medium` 24, `large` 32); the item is the icon plus 4px around it (its touch size),
  the focus ring is the shared `focusRing`. Filled stars are drawn by laying `fill` (full) or
  `halfFill` (50% wide, `overflow: hidden`, from the inline start, so it mirrors under rtl) over
  the empty `icon`. Components: 67 → 68 (gap analysis §1.8). No compounds.
- **CopyButton has no recipe.** It is the ready-made `IconButton` (the `iconButton` registry entry,
  every variant of it) with the clipboard machine beside the button machine. `binding-core/components/copy-button.ts`
  holds the contract; `usage.ts` has a `copy-button` entry reading `iconButton` and `ripple`.
  Props: `value`, `timeout` (3000), `onCopy`, `label` ("Copy to clipboard"), `copiedLabel`,
  `icon`, `copiedIcon`; the root carries `data-copied` while copied. The toggle, `position` and
  `selected` props are left off.
- **binding-core:** `copy-button.ts`, `rating.ts` (`RATING_ROOT_PROPS`, `ratingSelection`,
  `ratingMachineProps`, `starFill`), glyph paths `copy`, `check`, `star`.
- **React and Solid** (`copy-button/`, `rating/`, exports, vite entries, glyphs, registry fixture,
  specs): Rating has `Root`, `Label`, `Control`, `Item`, `Icon`, `Fill`, `HalfFill` and the
  ready-made `Rating` (`label`, `icon`, `slotProps`). The hidden input is named only when `name`
  is given (Zag defaults to `rating`), the value's none is `0` (Zag's is `-1`: the bindings pass
  `defaultValue: 0`), and a form reset is the bindings' (`useFormReset`, like the checkbox).
- **React Native** (`copy-button/`, `rating/`, exports, vite entries, specs): ready-made only.
  `CopyButton` takes `copy` (`Clipboard.setString` or expo's `setStringAsync`) and falls back to
  `navigator.clipboard` on React Native Web, with a one-time warning without either; the icon and
  the name swap for `timeout` ms. `Rating` is `Pressable` stars in a `radiogroup` (`radio` each);
  `allowHalf` reads the press's `locationX` against the star's layout width (mirrored under rtl);
  pressing the chosen value again clears it.
- **component-cases:** `copy-button.ts` (examples, Enter and Space click, indication) and
  `rating.ts` (examples, `value` state read from the hidden input, form submit, keyboard with
  arrows by direction); both in `COMPONENT_NAMES`, `cases.ts` and the React and Solid scene maps,
  so Storybook picks them up. No `@control` tags were needed: the derived controls are right
  (`value` text, `timeout` and `count` numbers, `allowHalf` and `readOnly` booleans, the rest
  functions or tagged `none`).
- **Docs:** gap analysis (matrix rows, Zag table, §7 rows, count 68), the READMEs of binding-core,
  machines, preset, React, Solid and React Native.
- **Deprecated options:** none of either component's; nothing removed.
- **Native scrolling:** untouched.

## Design that's pureform's own (M3 has neither)

- Rating: everything (the star row, half values, the `fill` and `halfFill` layering, sizes).
- CopyButton: the pattern (icon swap, name swap). Compose and M3 have no copy button; the icon
  button's colors, shapes and sizes are M3's.

## Tests

- `omni run build test -p` machines, preset, anatomy (with `generate`), binding-core, react, solid,
  component-cases: pass (the machines `presence.spec` "stays until the last of an exit's animations
  ends" failed once under load and passed on `-f failed`).
- React Native: `omni run build test -p @pureform/react-native`: the new specs pass. Under load a
  few c8 specs fail on the first runs (`c8c: splitter` "rests where it's let go without anchors" /
  "grows its pill while dragged…", the FAB stagger); the splitter one passes alone
  (`-t "rests where it's let go without anchors"`).
- E2E, from `tests/component-suites` after `omni run generate prepare -p @pureform/panda-fixture`:
  keyboard, controllable, forms, accessibility, direction, indication, themes, server-rendering,
  `-t "Rating|CopyButton"` on react/css, solid/panda, react/tailwind: 516 passed, no errors.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, machines, binding-core, react, solid,
  react-native, component-cases, component-suites.
- Not run: the visual suite (see open questions), the other targets and projects.

## Refactoring hints

- **Helpers that look generic:** `copyText` (`machines/src/clipboard.ts`: a clipboard write that
  never rejects) for any copy action (a code block's, a menu's "Copy"); `starFill` is Rating's.
  The "hidden input named only when `name` is given, none is 0, reset by the binding" block in
  React's and Solid's `rating.tsx` will repeat in any value-picking Zag machine with a hidden input
  (the slider's, a color picker's).
- **Code that looks like a sibling's:** React's and Solid's `copy-button.tsx` wrap `IconButton` the
  way a split button wraps its parts; a `useClipboard` hook per binding would be the shared piece
  if c9d (color picker's value field) copies too. `Rating`'s item and `fill` parts repeat the icon
  button's icon-in-a-box (`iconBox`, `iconFill`).
- **Suggested home:** `copyText` stays in `@pureform/machines/clipboard`; a binding-core
  `valueInput` helper (name, none value, reset) beside `form`-related helpers if a third machine
  needs it.
- **What must not change:** `rating.spec.ts` snapshot, `machines/src/index.spec.ts` (clipboard and
  rating group), the Rating and CopyButton e2e above, the `iconButton` recipe and its specs.

## Open questions

- CopyButton has no preset recipe of its own, so no `copyButton` entry in the registry or
  `pureform().components`. Say if a themeable `copyButton` (tokens for the copied color, say) is
  wanted; it would be the `iconButton` recipe under another name.
- No tooltip or snackbar is built in: `onCopy` lets the app show one, and the accessible name
  changes to `copiedLabel`. A polite live region would announce more reliably than a changed
  `aria-label`; not added.
- React Native has no default icons from a font: the copy button's defaults are the text glyphs
  `⧉` and `✓` and the rating's `★`; pass `icon` for a real one. The rating has no arrow-key
  handling on React Native Web, and `copy` has no default off the web.
- Zag's rating group previews the star under the pointer (the filled stars and `aria-checked`
  follow the hover), and takes the arrow keys only while the pointer is off the group. Kept as it
  is; the case reads the value from the hidden input for that reason.
- The rating has no `density` variant and no state layer or ripple on a star (hover is the preview).
- The visual suite and panda-fixture page have no section for either component, since baselines
  need a visual run; add `rating` and `copyButton` (an icon button with a check) to a section.
- A denied clipboard write still shows "copied" (Zag's behaviour, kept). Say if it should show
  nothing, or call an `onError`.
