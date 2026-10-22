# Next roadmap: starting points

What the components roadmap left for the one after it: the spec recheck at r6 (2026-10-22,
[guidelines §2](../design/component-guidelines.md#2-rechecking-against-the-spec)), the work r6
recorded rather than did, and the open questions from every phase's context that are still
open. Nothing here is applied yet. m2 (spring components) is planned separately in
[phases/m2-spring-components.md](phases/m2-spring-components.md).

## 0. Decisions (2026-10-22)

Answers to the questions below and to the orchestrator's follow-ups. Each applies in the
phase named.

- **m2** runs next, after r6, starting with groups A (spatial) and B (overlays), plus the
  extras in [m2](phases/m2-spring-components.md) (swipe snap-back, sheet drag release,
  snackbar enter and stacking, split button chevron).
- **A transitions phase** after the small fix phase: Compose's `FadeThrough` and
  `HorizontalSharedAxis` (§1 #5). Predictive back stays here for later.
- **Before m2:** pre-bundle the dependencies of the component-suites and rn-web-demo e2e runs,
  so a Vite config change doesn't re-optimize mid-run (Solid hydration mismatches, blank page).
- **Alongside m2:** a fresh-build `tsc` check on main, and formatting the unformatted files.
- **Gate:** the fixing agent reruns with `-f failed` only ([conventions](conventions.md)).
- **Small fix phase after m2:**
    - Selection list: single selection by default; multiple stays an option.
    - Rail: replace a destination's `sectionLabel` with a `section` tag on every destination.
      Runs of the same `section` share one heading (grouped like Select's `group`, through
      `selectItemGroups`); the bar ignores it. `sectionLabel` is removed.
    - Avatar: stays a non-`<img>` root, with `role="img"` and an accessible name.
    - Expandable plus swipeable list items: move the swipe action outside the row (§2).
    - Icon button: the fallback outline width follows the size.
    - Vibrant toolbar: an unstyled one recolours its icon buttons.
    - Submenus clipped in grouped menus, the slider cut-off following the theme (§2), and
      chips' expressive corners (§1 #2).

## 1. Spec recheck (2026-10-22)

Sources read: Compose Material 3 release notes to `1.5.0-beta02` (2026-10-21); the commit log of
`compose/material3/material3/src/commonMain` on `androidx-main` from 2026-09-20 to 2026-10-21, and
`tokens/ChipsTokens.kt`; MDC-Android `master` since 2026-05-06 (no `docs/components` change,
latest release `1.14.0`). m3.material.io still can't be read without a browser (the blog post
below returned only its title), so values from there stay unconfirmed.

| #   | Finding                                                                                                                                                                                                                                                                                            | Source                                                                                           | Effect on pureform                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **MDC-Android (Views) is in maintenance mode**: Material Android is Compose-first since Google I/O 2026; no more View feature releases.                                                                                                                                                            | MDC-Android README, commit "Add Material Android Views deprecation notice" (2026-05-19)          | Done in r6: Compose is now the first source in the guidelines (§1, §2) and the gap analysis (§0.2). The View docs freeze at 1.14.       |
| 2   | **Expressive chip tokens**: height 32, unselected shape `CornerMedium`, selected `CornerFull`, pressed `CornerSmall`, avatar `CornerFull`, selected container `secondaryContainer` with a 0 outline, unselected outline `outlineVariant`.                                                          | `androidx-main` `tokens/ChipsTokens.kt` (added 2026-06-23, e7b261707e)                           | Our chip rests on `small` (8) and presses to `extraSmall`. Check the resting role (`medium`?), the pressed role and the outline colour. |
| 3   | **Outlined text field's container is transparent** in the Expressive `OutlinedTextFieldDefaults.tonalColors`; a tonal colour set exists for text fields.                                                                                                                                           | `androidx-main` f06c082512 (2026-10-02)                                                          | Check the outlined field's container and whether a `tonal` colour variant belongs on the text field family.                             |
| 4   | **Adaptive specs for the navigation bar and the wide navigation rail**; the wide rail's container was wider than spec because of its content padding.                                                                                                                                              | `androidx-main` cdb1a6a26d (2026-09-29), 41783c1b1c (2026-10-21)                                 | Recheck `navigationBar` item layout per window size and the expanded rail's 220 width and padding (c1e's values are unconfirmed).       |
| 5   | **Material transitions**: `MaterialTransitions.FadeThrough` and `HorizontalSharedAxis` (with predictive back and a luminance-based scrim colour).                                                                                                                                                  | `androidx-main` 62637abaa5, 9b25d27e14 (2026-10-10)                                              | New motion patterns, not components. Candidate for m2 or a motion phase (page/tab transitions on top of m1's springs).                  |
| 6   | **Time picker scroll mode (`ScrollField`)**: items have no ripple or hover background, and the focus indication is clipped to the field's rounded shape.                                                                                                                                           | `androidx-main` 7514c1785d, bd41a9e8d5 (2026-09-24/28)                                           | Check `timePicker` `mode: scroll`'s `scrollItem` indication (c5b) and that its focus ring follows the shape (inset).                    |
| 7   | **Smaller fixes**: expressive menu items weight their text so trailing content isn't clipped; AM/PM period text auto-sizes at large font scales; the date picker's year menu arrow takes `navigationContentColor`; discrete slider snapping in value space; short modal bottom sheets half-expand. | `androidx-main` 23acf55b06, 50498fe64b, 14e9207a22, 29e4098869, 02b1dbcaeb (2026-10-07 to 10-21) | Check the menu item's label shrink with a long trailing text, the period selector at large text, and the docked picker's year arrow.    |
| 8   | **Compose Material3 A2UI** (agent-to-UI renderer over the M3 components) adds an animated shimmer for loading states.                                                                                                                                                                              | Compose release notes, `material3-a2ui` 1.0.0-alpha01/02 (2026-09-23, 10-21)                     | Not a component. Note only, unless a loading placeholder (shimmer/skeleton) is wanted.                                                  |

No component was added, removed or renamed; the counts (64 preset components, 28 compounds) are
the code's (`doc-counts.spec.ts`).

## 2. Work r6 recorded instead of doing

- **Expandable and swipeable list item together.** Today an item with a `region` doesn't swipe
  (c7 merge). Both need the swipe action outside the expandable header's `<button>`: the row's
  root becomes a wrapper holding the header button and the action as siblings, which changes
  the DOM of every expandable item (screenshots, indication fixtures) in all three bindings and
  the preset's `structure`. Not contained enough for r6.
- **Slider inset icon cutoff following the theme.** `sliderInsetIconOverflows` (binding-core)
  uses `SLIDER_INSET_ICON` (20/10/8) rather than the theme's `insetIconSize`/`insetIconPadding`.
  Following a retuned theme needs the resolved component tokens at runtime: on the web a reader
  for the component's token variables across the Panda, Tailwind and CSS adapters, on React
  Native the component's own tokens (`useTokens` gives only system tokens). Design that reader
  first.
- **Glyph naming:** the stepper's check and warning use `ToastIcon`/`TOAST_GLYPHS`; named
  `check`/`warning` glyphs in `GLYPH_PATHS` would decouple them from the toast (no behaviour
  change).
- **Formatting drift on main:** a few files (`binding-core` `slider.ts`, React Native
  `autocomplete.tsx`, `docked-date-picker.tsx`, `overlay.tsx`) aren't `oxfmt`-clean; a
  `style:` commit would fix them.

## 3. Open questions from the contexts

Collected from every context's "Open questions"; those a later phase settled are left out.
Grouped by area, with the context that raised each.

### Spec values still unconfirmed (m3.material.io unreadable)

Each component's values listed in its context: nav bar/rail sizes (c0a, c1e), affix spacing
(c1a), progress gaps (c1b), button/chip icon spacing and chip radii (c1d; see finding 2),
two-line snackbar height (c1f), slider value indicator and stops (c1g), full-screen dialog
(c2b), input chip sizes (c2c), badge offsets (c2d), button group radii and gaps (c2e), sheets
(c3b), search view and search bar roles (c3c), loading indicator and wave (c4a), app bar heights
(c4b), toolbar sizes (c4c), carousel sizes (c4d), date pickers (c5a), time picker vibrant set and
scroll look (c5b), paginator (c6c), table colours (c6d), stepper header values (c6b), submenu
values (c7b), swipe action colour and width (c7c), scrollable tabs' 52/90 (c7a).

### Behaviour and API

- Text field: should counter overflow mark the field invalid or only colour the counter (c1a)?
  Should the tags input's chips shrink or the field grow (c2c)?
- Menu: should submenus portal out of a `grouped` menu, which clips them (c7b)? Should React
  Native cascade with a second popup instead of drilling in (c7b)? Should `vibrant` become a
  `color` value (c1c)? Should the select use Zag's `groupBy` (c1c)?
- Rich tooltip on Zag `popover` for keyboard-focusable actions (c2a); caret size token (c2a).
- Full-screen dialog: slide up on phones (c2b); should `confirmAction` close by default (c2b)?
- Snackbar host measuring a FAB or nav bar itself (c3a); one notify API (c3a).
- Bottom sheet on Zag `drawer` with snap points and a half-expanded state (c3b; see finding 7);
  `modal` default; the side sheet's two booleans vs one `variant` group (c3b).
- Search view: docked view scrim and focus trap (c3c); autocomplete clearing `value` on edit and
  filtering when opened from the arrow (c3c).
- Progress: wave phase travel (c4a); circular progress and the theme's corner style (c4a);
  gap closing at 0 on the web (c1b).
- App bar: continuous collapse, search bar shadow inside an app bar, `density` (c4b).
- Toolbar: roving tabindex; overflow priority (c4c). Unstyled vibrant toolbar recolouring its
  icon buttons; provided values through portals (r4-findings).
- Icon button: the shaped outline's fallback border following `outlineWidth` (r4-findings).
- Date pickers: ready-mades switching calendar/input themselves (c5a); calendar `color` variant
  (c5a); disabled docked picker's supporting-text contrast (c5a); headline and actions matching
  the time picker's (r5); Solid's date input and an empty range place (r5).
- Time picker: a modal `TimePickerDialog` ready-made and a toggle to the input (c5b); the round
  dial's exception visible in `radii.spec.ts` (c5b).
- Accordion: Angular's 48/64 header height (c6a); segmented tile corners (c6a); other Solid
  machines that move focus during a transition (c6a).
- Stepper: column semantics (disclosure vs tabs), equal header widths, a core `completed` state,
  `labelPosition: bottom`, React Native next/previous (c6b).
- Paginator: numbered pages as a variant (c6c).
- Table: the `dataTable` registry name vs `table` (c6d); row-click selection and a grid keyboard
  mode (c6d); React Native's sort announcement (c6d).
- Grid list: spans, caption colour, data-driven ready-made, more `columns` values (c6e).
- Chip set and tabs: selection list default `multiple` (c7a); scrollable tabs' divider under the
  edge padding (c7a); `flexShrink: 0` on single-line chips (c7a); React Native keyboard for the
  selection list (c7a).
- Rail: `sections` on the ready-made rather than a destination's `sectionLabel` (c7b).
- Avatar: a compatibility path for the old `<img>` root (c7c); Solid runs its machine in `Image`,
  React in Root (c7c; kept, see r6).
- List swipe: a destructive (`errorContainer`) action, swipe past full width to trigger, a
  swipeable item as a link or button, React Native `onPress` (c7c).
- Search bar: elevation on scroll in addition to the colour (c7c).
- Springs: `SlideMotion` and keyframes on `Animated.spring`; two springs per overlay step; settle
  tolerance vs Compose's 0.01; springs as a Tailwind theme namespace (m1).

### Infrastructure

- Anatomy drift the other way (no machine part absent from the preset) (c0b).
- `radii.spec.ts` allow-list pinning the fixed lengths too (c0c).
- `Indication` taking `focusRing` at runtime; the inset ring's exact inset; React Native's
  negative `outlineOffset` on a device (c0d).
- Move Solid's `iconParts`-like helpers into binding-core if the others need them (r1).
- rn-adapter sweep timeouts, or sampling `position` (c2e); composed groups placing buttons
  themselves (c2e).
- `doc-counts.spec.ts` and omni's cache: should the preset's test inputs include
  `docs/design/*.md` (r5)? Should the count be a list siblings append to (c6c)?
- `@pureform/anatomy#generate` can't load the root `oxfmt.config.ts` (r5).
- omni can replay a stale build after files change back; `-f all` remains the workaround (gap
  analysis §5.7).
