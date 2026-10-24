# a11y-roles: ARIA roles from neutral-readers' open questions (output context)

Branch `a11y-roles` from main `48dc9253`. A single agent, beside `fix-storybook-6a`/`6b`. Not
pushed. Answers the first two [open questions of neutral-readers](neutral-readers.md#open-questions)
and the tree's structure, as the user chose them, after the WAI-ARIA APG.

Commits: `5859ec19`..(this file's commit).

## Built

### 1. The web's search view trigger is a native button (React, Solid; React Native's ARIA)

- `SearchView.Trigger` renders a `<button>` from Zag's dialog `getTriggerProps()`: `type="button"`,
  `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (the surface's id), `data-state`,
  and `aria-label` from `searchViewLabel` (`aria-label`, else the placeholder, else "Search").
  `disabled` follows Root's. Enter, Space, the down arrow, or a character open it; a character
  (not Space) carries into the query (`searchViewCarriedKey`, binding-core).
- Its own look is reset (`SEARCH_VIEW_TRIGGER_STYLE`, binding-core: block, full width, no
  border, padding, background; font and colour inherited). The ready-made's `SearchBar` inside is
  `as="span"` and `inert`: only the look, nothing focusable or named in a button.
- React Native's button over the bar now says `aria-expanded` too (and `SearchViewTriggerProps`
  carries it); Space opens without typing a space.
- **Readers:** `cases/search-view.ts` finds the bar as the one button with
  `aria-haspopup="dialog"` and reads its `aria-expanded` like every overlay. `OverlayAria`'s
  `expands: false` and `leaving` are gone (they were only for this); `leavingOnWeb` stays for the
  snackbar. Space joins the keys (`change`: it opens).

### 2. React Native's select is a select-only combobox over a listbox

- `MenuListbox` (`react-native/src/menu/menu.tsx`): the menu's surface with `role="listbox"`, the
  given `nativeID`, and options (`role="option"`, `aria-selected` for the value, no
  `aria-checked`). The combobox's `aria-controls` points at the listbox itself (was its wrapper),
  and the listbox is named by the select's label.
- **Keys on React Native Web, as the web's select:** on the field, Space and the up and down
  arrows open (Enter already did), the arrow keys sideways choose the next or previous enabled
  option by direction, Home and End the first and last, without opening. Open, `MenuKeys` (now
  exported, options among its items) focuses the chosen option (else the first); arrows, Home,
  End move; Enter and Space choose (an option takes Space itself: React Native Web presses only
  buttons on it); Escape and Tab close. Focus goes back to the field a frame after the `Modal`
  lets go (its focus trap holds it while mounted).

### 3. React Native's tree

- On the web, a leaf's row is its `treeitem`; a branch's `branch` view is the `treeitem`, holding
  its row (`role="button"`, as Zag's branch control) and its `group`. Every tree item says
  `aria-level`, `aria-setsize`, `aria-posinset`, `aria-selected`, `aria-expanded` (branches),
  `aria-disabled`, and is named from its row's text (`aria-labelledby`, the text's `nativeID`).
- On iOS and Android (no tree item there) the row says it: `nativeTreeRow` gives
  `accessibilityLabel` "<label>, level N" (text labels) and `accessibilityState` (`selected`,
  `disabled`, `expanded` on a branch).
- A branch's Space comes from React Native Web's button; the leaf keeps its own Space handler.

## Tests

- React and Solid `search-view.spec.tsx`: the button's ARIA, the inert bar, Space and Enter
  opening (Space types nothing), focus back on Escape; the other tests click/focus the trigger.
- React Native `a11y-roles.spec.tsx` on both engines (`animated`, `reanimated`): the listbox,
  options and `aria-controls`; the select's keys and focus return; the tree's structure, names,
  levels and places, and Space/Enter on a branch row; the search view trigger's
  `aria-expanded`; `nativeTreeRow`. `presence.spec.tsx` follows the listbox (its wrapper is now two
  up), `components.spec.tsx` picks an `option`.

## How to verify

- `omni run build test -p @pureform/binding-core -p @pureform/react -p @pureform/solid -p
@pureform/react-native -p @pureform/component-cases`: passed.
- Story tests, Solid, React, React Native: SearchView, SearchBar, Select, NativeSelect, Tree
  (`bunx vitest run -c vitest.config.storybook.ts src/stories/generated/<C>.stories.ts`): 207
  passed after the Tree skip below (regenerate stories with `node scripts/generate-stories.ts`
  after editing `stories.config.ts`).
- After `omni run generate prepare -p @pureform/panda-fixture`, from `tests/component-suites`,
  `solid/css` and `react/css`, `-t "SearchView|SearchBar|Select|Tree"`: accessibility and
  keyboard 318 passed; overlays and controllable `-t SearchView` 18 passed.
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, react, solid, react-native,
  component-cases and storybook-web. `omni run build -p @pureform/storybook-web` passes. No
  conflict markers.

## Deviations from the design

- **The trigger holds an inert search bar.** A `<button>` may not hold interactive content, so
  the ready-made's bar is `inert` inside it. A composed `SearchView.Trigger` must hold no
  interactive element either (said in its doc comment).
- **A branch's row is a `button`**, mirroring Zag's branch control on the web, rather than the
  tree item taking focus itself (APG's own example); every renderer reads the same.

## Refactoring hints

- **Helpers that look generic:** `MenuKeys` (`react-native/src/menu/menu.tsx`) is now used by the
  select too; `searchViewCarriedKey` (binding-core) is the search view's alone.
- **Code that looks like a sibling's:** the select's sideways keys (`onFieldKey` in
  `react-native/src/select/select.tsx`) repeat what Zag's select trigger does on the web.
- **Suggested home:** none yet; a React Native listbox keys helper if the autocomplete moves to
  a listbox too.
- **What must not change:** the specs above; the web's search view screenshots (the trigger is
  now a button around the bar; its reset keeps the same box).

## Open questions

- The React Native tree's level in `accessibilityLabel` is English ("level N"); a `levelLabel`
  prop would localise it.
- The Tree's React Native stories turn off axe's `label-content-name-mismatch`: a branch named
  from its row holds its children's labels too, which the heuristic counts as visible text left
  out of the name.
- React Native's autocomplete still lists suggestions as `menuitem`s (`CHOICE_ROLES` keeps them);
  the select has no typeahead on React Native Web.
- `tsc -p tsconfig.project.json` in storybook-web reports only errors inside `node_modules`
  (`@pandacss/types`, `@types/node`, react-native-svg's `GProps`), none from the sources.
