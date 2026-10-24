# neutral-readers: renderer-neutral case readers (output context)

Branch `neutral-readers` from main `040b9fc1`, the phase "After r9: renderer-neutral case
readers" of [the storybook plan](../../roadmap-storybook/plan.md). A single agent. Not pushed.
Round 6 of [the storybook context](../../roadmap-storybook/context.md#round-6-renderer-neutral-case-readers-branch-neutral-readers)
has the harness side and the checks.

Commits: `99947a0e`..(this file's commit).

## Built

- **`packages/component-cases/src/aria.ts`:** `roleOf` (explicit or a native element's implicit
  role), `nameOf` (`aria-label`, `aria-labelledby`, a native control's `<label>`, its text),
  `allByRole`/`byRole(host, role, { name, hidden })` (leaves out `aria-hidden` elements unless
  `hidden`), `checkedOf` (`aria-checked`, or a native checkbox's or radio's state, `"mixed"` for
  indeterminate), `flagOf`/`optionalFlagOf` (`aria-pressed`, `-selected`, `-expanded`,
  `-current`), `disabledOf`, `valueNowOf`, `textValueOf` (an input's or textarea's value, else
  its text), `CHOICE_ROLES`/`choiceNamed` (a listbox's option or a menu's item, by name, anywhere
  in the document).
- **`cases/overlay.ts`:** `overlayParts(ids, { role, name | trigger, expands?, leaving? })`: the
  trigger by role and name (`hidden: true`: an open modal hides it), the state its
  `aria-expanded`, a surface with `role` drawn somewhere in the document required while open.
  `tooltipRead` (`aria-describedby`), `expandingTrigger` (the button saying `aria-expanded`,
  the one with `aria-haspopup` among several), `drawn` (waits up to 30 frames for a find),
  `visible` (`checkVisibility`), `leavingOnWeb` (below).
- **`UserEvent.unhover`** joins the interface (Vitest's and Testing Library's both have it).
- **Storybook:** React Native's story tests on by default; per-renderer skips
  (`parameters.pureform.skip`, `RendererSkip`); no play where a renderer lacks the component;
  plays wait for the root or any part.
- **`@pureform/machines/time-picker`:** `timeKeyStep(key, view)` (moved out of the connect, now
  shared with React Native). The carousel's mask says `aria-current` on the current page.

## Per component

"Reader" is what the case reads now (was); "RN fix" is the binding change; "Skip" is React
Native's narrow exception with its reason. Every component not listed passed unchanged on all
three renderers.

### Selection and actions

- **Button, IconButton, Chip.** Reader: `aria-pressed` (already). RN fix: `Button` and `Chip`
  take `defaultSelected`/`onSelectedChange` (were controlled only) and say `aria-pressed`;
  `Button`/`IconButton` said `aria-checked` on `role=button`. Presses pass their event to
  `onPress` (the Actions panel's summary needs its type).
- **ButtonGroup, ChipSet.** Reader: `aria-pressed` (unchanged); the focusable item is the one in
  the tab order (`tabindex` not `-1`), was Zag's `data-focus`. RN fix: through Button/Chip above
  (the known `aria-checked` on `role=button`). Skip: `KeyEnter`, `KeySpace` plays (no bubbling,
  below).
- **Checkbox, Switch.** Reader: the `checkbox`/`switch` role's `aria-checked` (was the native
  input's `checked` against the root's `data-state`). RN fix: Space checks, Enter doesn't, on
  the web (`check-keys.ts`, `useCheckKeys`): React Native Web pressed on Enter for every role and
  on Space only for buttons.
- **RadioGroup.** Reader: radios by role, the checked one's name mapped to its item (was the
  inputs' `value` and `checked` against `data-state`). RN fix: the group's root has the composite
  test id; radios check on Space.
- **Rating.** Reader: the checked star's place among the radios (was the hidden input's value);
  `act` moves the pointer off after clicking (the stars preview the hovered one, in ARIA too).
  The arrow keys start from 2: Zag and React Native both mark the first star checked at 0 (for
  focus), so ARIA reads 0 as 1. RN fix: a key press on a star has no position (crashed).
- **Slider.** Reader: the `slider` role's `aria-valuenow` (was the handle's, against the root's
  inline value token). Skip: the `Empty` story's Interactions-panel check (`src/checks/slider.ts`)
  returns early on React Native: Testing Library's synthetic press reaches the root with its
  position but its responder sets no value (not traced further); the state play's real click
  moves it.
- **CopyButton.** Check (`src/checks/copy-button.ts`): the accessible name says "Copied to
  clipboard" (was `data-copied`).
- **SplitButton, FabMenu.** Reader: `expandingTrigger` and the `menu` role. Skip: SplitButton
  `KeyEnter`, `KeySpace` (no bubbling).

### Overlays

- **Dialog, BottomSheet, FullscreenDialog, SideSheet, Popover, Menu.** Reader: the trigger by
  role and name, `aria-expanded`, the `dialog`/`menu` role drawn while open (was the content's
  `hidden`/`data-state` and the trigger's test id). RN fix: the ready-made triggers pass
  `aria-haspopup` and `aria-expanded` to the default `Button` (now takes `aria-haspopup`,
  `aria-expanded`, `aria-describedby`); the render-function triggers' props gain
  `aria-expanded`; the popover is named by its heading (axe's `aria-dialog-name`).
- **Tooltip, RichTooltip.** Reader: the trigger's `aria-describedby` (unchanged), its tooltip
  drawn. RN fix: the tooltip has a `nativeID` and describes its trigger while it shows. Skip:
  `KeyEnter` (no bubbling).
- **DatePicker.** Reader: overlay parts by the trigger's test id. RN fix: the trigger says
  `aria-haspopup`/`aria-expanded`; the modal window is named; days are `gridcell`s with
  `aria-selected` and a button inside (was `aria-selected` on `role=button`; months and years say
  `aria-pressed`).
- **SearchView.** Reader: the dialog drawn, not `leavingOnWeb` (the web's bar is a plain element
  with no ARIA; see Deviations). RN fix: the trigger has the web's test id; the modal window is
  named; the input's `aria-controls` names its list; the press-outside is out of the
  accessibility tree (was a `div` with `aria-label`, axe's `aria-prohibited-attr`); the bar's
  button opens on Enter, the down arrow or a typed character (carried into the query), and the
  bar's inert input isn't a tab stop.

### Fields

- **TextField, TextArea.** Reader: the textbox's value (was checked against the container's
  `data-pf-filled`).
- **Select.** Reader: the field's shown label; open from the `combobox` role's `aria-expanded`;
  options by `choiceNamed` (was the hidden select's `selectedOptions`, the item's `data-value`).
  RN fix: the combobox names its list (`aria-controls`); the modal window is named; the
  press-outside is out of the accessibility tree.
- **Autocomplete.** Reader: the input's value, its `aria-expanded`, `expandingTrigger`,
  `choiceNamed`. RN fix: `aria-controls` and `aria-expanded` once the list shows; the list
  filters only by what was typed, as the web's (it filtered by the chosen label, so reopening
  showed one suggestion); a list open from the start (`defaultOpen`, or by its owner) is placed
  (it never measured, so `Opened` stories drew nothing: `useFieldPopup` measures when open).
- **DockedDatePicker.** Reader: the input's value; open from `expandingTrigger`; a day by its
  name (the long date). No RN fix beyond the calendar cells.
- **DateInput.** RN fix: its root (`role=dialog`) is named.
- **CodeField.** Reader: each cell's value (was checked against the hidden input). RN fix: one
  cell in the tab order on the web (the focused one, else the first empty), and a disabled cell
  is `disabled`, not `readonly`. Skip: `Disabled` story, axe's `color-contrast` (the label, see
  `DISABLED_TEXT`).
- **NumberField.** RN fix: disabled is `disabled` on the web. Skip: `Disabled`, `color-contrast`.
- **TagsInput.** Reader: the chips' labels (dropped the hidden input check). Skip: `Disabled`,
  `color-contrast`.
- **ColorPicker.** Reader: the hex field's value. RN fix: the area's thumb takes focus and the
  arrow keys (saturation across by direction, brightness up and down, a step of 1 from the
  rounded channels, as the web's).
- **TimePicker, TimeInput.** Reader: the hour and minute (a selector's text, a field's value) and
  the PM period's `aria-pressed` (was the hidden input). RN fix: the selectors and fields take the
  web's step keys (`timeKeyStep`). Skip: TimePicker `KeyEnter` (no bubbling); `TheMinutes`
  `color-contrast` (the chosen minute is white over the dial's handle, a sibling under it, so axe
  reads the dial's surface as its background).
- **FileUpload.** Skip: `Light`, `Dark` plays: React Native has no file input to give files to
  (its trigger calls the app's `onPick`); `Disabled`, `color-contrast` (its headline).
- **NativeSelect.** Unchanged: a native `<select>` on every renderer; its value is the element's.

### Navigation and display

- **Accordion.** Reader: each header's `aria-expanded` (dropped the content `hidden` check).
- **Tree.** Reader: the `treeitem`s with `aria-expanded` are the branches, in order (was the
  branch's `data-value` and its group's `hidden`). RN fix: a row takes Space on the web.
- **Tabs.** Reader: tabs by role, `aria-selected`, by place (was `data-value` and the panels'
  `hidden`). RN fix: the arrow keys (by direction, going round), Home and End on the web, moving
  focus. Skip: `KeyEnter`, `KeySpace` (no bubbling).
- **Stepper.** Reader: the header that's `aria-selected` (a row) or `aria-current` (a column)
  (was checked against `aria-controls`' content). Skip: `KeyEnter`, `KeySpace`.
- **NavigationBar, NavigationRail.** Reader: `aria-current` by place (was `data-value`). RN fix:
  destinations are buttons (were `link`s with no `href`, which Enter didn't press).
- **Table.** Reader: the rows saying `aria-selected`, by place; the act clicks the first row's
  `checkbox` role (was `data-value` and the native input). Skip: `KeyEnter`, `KeySpace`.
- **Paginator.** Reader: the previous button's `aria-disabled`/`disabled`, the button inside the
  part when React Native wraps it (was the button's `disabled` property).
- **Toolbar.** Reader: its buttons by role (was `[data-pf-toolbar-item]`). Skip: `KeyEnter`,
  `KeySpace`.
- **Carousel.** Reader: the mask with `aria-current` (was `data-current`). Fix (web and RN): the
  current page's mask says `aria-current`. Skip: `Light`, `Dark` plays on React Native: its pages
  follow its native scroll, and arrow keys between items would have to drive it (the native
  scrolling rule).
- **List, ListItem.** Reader: the expandable item's `aria-expanded` (dropped the region's
  `hidden`). RN fix: in a `List`, the item wrapper is the `listitem` and the row isn't (an
  interactive row under `role=list` failed axe's `aria-required-children`). Skip: List
  `KeyEnter`.
- **Snackbar.** Reader: a `status` role drawn and not `leavingOnWeb` (was `hidden` and
  `data-state`). RN fix: `defaultOpen`/`onOpenChange` (was controlled only), closing from its
  action, its close button and Escape inside it. Skip: `KeyEnter`, `KeySpace`.
- **Toast.** Stage (`src/stages/toast.ts`): a toast is open while connected and not
  `data-state` closed; the swipe sends mouse events too (React Native Web's responder).
- **Scrim.** Skip: every play on React Native: each React Native Web view is a positioned
  container, so its scrim fills the story's root view inside the stage's padding, not the stage
  the play measures.
- **Ripple, TouchTarget.** No play on React Native: it has neither component (they draw "isn't
  implemented"; Ripple's text says why).

`NO_BUBBLING` (the key-click skips above): the web's click bubbles from the item a key pressed to
the component's root `onClick`, which the key plays spy on; React Native doesn't bubble a press,
and its composites take no root press. `DISABLED_TEXT`: React Native Web draws a disabled field's
label as plain text in the disabled colours, not a disabled control's `<label>`, which axe
exempts from the contrast rule.

## Deviations from the design

- **Two readings aren't ARIA.** A search view or a snackbar closing on the web still shows until
  its exit ends, and nothing in ARIA says it's leaving (the search view's web trigger is a plain
  element). `leavingOnWeb` reads Zag's `data-state="closed"`; React Native unmounts them once
  closed, so it never holds there. The rating's 0 can't be read (above).
- **Locating isn't reading.** Cases still find elements by the anatomy's test ids where every
  renderer draws them; only state comes from ARIA. The `form` and `overlay` parts (the web
  suites' native forms and Zag's positioners) still read the web's DOM; they never run on React
  Native.
- **Overlay agreement is one way:** open needs a surface drawn; closed allows one still leaving.

## Stubs and gaps

- React Native's select lists its options in a menu (`menuitem`), not a listbox; the readers
  accept either.
- React Native's tree group sits beside its branch row, not inside its `treeitem`.
- React Native's carousel has no arrow keys between items (skipped, above).
- The slider's synthetic-press gap on React Native Web (above) isn't traced.

## How to verify

- `cd apps/storybook-web && bunx vitest run -c vitest.config.storybook.ts --project
storybook/native src/stories/generated/<Component>.stories.ts` (any renderer, any group).
- `omni run build test -p @pureform/storybook-web` (whole story suite: 2841 tests).
- Component suites narrowed, for example `cd tests/component-suites && bunx vitest run -c
vitest.config.e2e.ts src/controllable.e2e.test.ts --project solid/css -t "^Rating\b"`.
- `omni run build test -p @pureform/component-cases -p @pureform/machines -p
@pureform/react-native`.

## Notes for the next phases

- A new case reads state through `src/aria.ts`; add a reader there rather than reading a data
  attribute. A React Native gap the plays find is fixed in the binding; a skip is only for what
  the platform can't do, with its reason in `stories.config.ts`.
- An open modal hides the page, its trigger included, from assistive technology: find a
  trigger with `hidden: true`.

## Refactoring hints

- **Helpers that look generic:** `useCheckKeys` (`react-native/src/check-keys.ts`) for any
  checkable control on React Native Web; the tabs' key handler (`navigation.tsx`) is the roving
  arrow/Home/End a React Native toolbar or segmented control would want.
- **Code that looks like a sibling's:** the `WEB`/`WEB_DISABLED` "disabled, not readonly" switch
  is now in `text-input.tsx`, `field/text-control.tsx`, `number-field.tsx` and `code-field.tsx`;
  the tree row's Space handler and the time button's `onKey` are small `onKeyDown` wrappers like
  the slider's and colour picker's.
- **Suggested home:** a `react-native/src/web-keys.ts` (a typed `onKeyDown` prop for the web and
  the disabled-input props).
- **What must not change:** the story plays on all three renderers, the component suites'
  controllable, keyboard and overlays runs, React Native's specs.

## Open questions

- Should the web's search view trigger (a plain `div` with a click handler) get a role, so its
  state is ARIA too?
- React Native's select as a listbox (`option`s) rather than a menu?
- The rating marking the first star checked at 0 is Zag's choice (for focus); a rating that's
  never set reads as one star to assistive technology on both renderers.
