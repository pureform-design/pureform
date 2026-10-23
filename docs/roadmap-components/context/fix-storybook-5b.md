# fix-storybook-5b: React Native and shared

Branch `fix-storybook-5b` from main `c89ab31b` (r9 merged), the "5b" items of
[fix-storybook-5](../phases/fix-storybook-5.md). Not pushed. Each item was checked first in
`storybook dev -p 6452` (Playwright screenshots of the iframe, per renderer) on the merged main.

## Items

### 1. Menu `submenu` prop on every renderer

- **Already fixed?** No: the web only cascaded, React Native only drilled.
- **Layer:** component (binding-core, React, Solid, React Native).
- **Fix:**
    - binding-core (`components/menu.ts`): `MenuSubmenu` (`"cascade" | "drill" | "auto"`),
      `submenu` in `MenuContentProps` (and `MENU_CONTENT_PROPS`), `MENU_CASCADE_MIN_WIDTH` (600),
      `menuSubmenuMode(submenu, windowWidth)`, `menuDrillLevel(items, groups, path)` (what a
      drilled menu shows at a path), `MENU_BACK_VALUE` (`"pf-menu-back"`, safe in a DOM id).
    - React and Solid ready-made: `drill` renders a submenu item as a plain `Item`
      (`closeOnSelect={false}`, `aria-haspopup="menu"`, the end chevron); choosing it pushes the
      path, the back row (leading start chevron, the submenu's label) pops it, only leaves reach
      `onSelect`; the path resets when the menu closes; the first row of a new level is
      highlighted (`HighlightOnDrill`, `api.setHighlightedValue`). `auto` reads the window's width
      once mounted (and on resize), so a server's render and hydration agree (cascade).
      Composed menus (`Menu.Submenu`) still cascade.
    - React Native: `cascade` opens the submenu over the page through the portal host,
      `Anchored` against the pressed item's row (`measureInWindow`), placed by
      `submenuPositioning` (right-start, flips); pressing the row again or picking puts it away.
      `drill` is the old behaviour on `menuDrillLevel`. `auto` reads `useWindowDimensions()`.
- **Tests:** binding-core `components/menu.spec.ts`; React and Solid `menu.spec.tsx` (existing
  cascade tests now say `submenu="cascade"`, since Vitest's browser viewport is 414 wide; new
  "drills into a submenu…" and "cascades by default in a wide window and drills in a compact
  one" with `page.viewport`); React Native `components.spec.tsx` ("cascades a menu item's
  submenu beside its row", the auto test, the drill test with `submenu="drill"`). New case
  example "with a drilled submenu" (`component-cases/src/cases/menu.ts`), so Storybook has the
  story and the server-rendering suite renders it.

### 2. Solid carousel: uneven items, jumps to page 2

- **Already fixed?** The uneven sizes yes (the fixed frame from fix-storybook-4 / r9): measured
  in Storybook, Solid's and React's masks now match (`198×5, 186, 56, 56`). The jump wasn't:
  `ArrowRight` from item 1 made page 2 current in Solid at once (React: 1).
- **Cause (machine, shows in Solid):** `setMatchingPage` (`machines/src/carousel/index.ts`) runs
  Zag's `setSnapPoints`, then reads `pageSnapPoints` back from the context. Solid's bindable shows
  a write only at its next flush, so it read the snap points measured before the items were
  sized.
- **Fix:** the action hands `setSnapPoints` a context that remembers what it writes and reads that
  back. Carousel Light/Dark story tests re-enabled (`stories.config.ts`).
- **Tests:** `Carousel.stories.ts` on `storybook/solid` and `storybook/react`: 24 passed (Light
  and Dark failed `expected 2 to deeply equal 1` before). A Solid unit test acting right after
  mounting passed with and without the fix (the fake registry draws nothing), so it wasn't kept.

### 3. SearchView (React Native): list items don't fill the container

- **Already fixed?** No (280px-wide items).
- **Cause (component):** the suggestions were a whole `Menu`, whose surface has the menu's
  `maxWidth` (280), container and elevation. The web draws only the items in its content.
- **Fix:** `MenuItems` (`react-native/src/menu/menu.tsx`): the menu's items without its surface
  (an internal `bare` flag); the search view uses it.
- **Tests:** React Native `components.spec.tsx` "draws its suggestions across the whole view…"
  (fails without the fix).

### 4. Size animations on React Native for expanding components

- **Already fixed?** No. `useExpandMotion` used `LayoutAnimation`, which React Native Web ignores,
  and which only tweens a layout React Native mounts at once.
- **Fix:** `Expanding` (`react-native/src/expand.tsx`, replacing `expand.ts`): keeps the part
  mounted while it shuts, measures the content's own height, springs an `Animated` height
  between it and 0 on the theme's `spatialDefault` spring (clipped meanwhile; no height of its
  own at rest open), nothing under reduced motion. Used by the accordion's content, the tree's
  groups, the list item's region and the vertical stepper's content. It never touches a scroll.
- **Tests:** `accordion.spec.tsx` "grows an accordion's content open and shrinks it shut…"
  (part way, then whole; the content stays while shutting). `stepper.spec.tsx`'s structure check
  reads the item with `closest` (two wrapper views now).

### 5. Toolbar (React Native): layout broken

- **Already fixed?** No: the floating bar stretched across the column.
- **Cause (component):** the web's floating root is `inline-flex`; React Native's view stretched.
- **Fix:** a non-docked toolbar's root goes through `inFlowInline` (fix-layout's helper).
- **Tests:** `toolbar.spec.tsx` "hugs its elements when floating … fills its edge when docked".

### 6. DockedDatePicker (React Native): label over the placeholder when empty

- **Already fixed?** No.
- **Cause (component, shared field):** `Field` passed the input's placeholder while the label
  rested in its place.
- **Fix:** `text-input.tsx`: a labelled field drops the placeholder until it's focused (the
  web's `placeholder=" "` rule), for every field built on it.
- **Tests:** `date-pickers.spec.tsx` "shows the format hint in the input only once focused…".

### 7. DateInput (React Native): segments like the web

- **Feasible, done.** binding-core: `dateTextSegments(locale)`, `dateSegmentTexts`,
  `dateFromSegments`, `dateSegmentStep`. React Native's input is a row (`role="group"`) of
  numeric `TextInput`s (`role="spinbutton"`, `aria-label` month/day/year, `aria-valuenow`), the
  locale's separators between; a full segment moves on, Backspace in an empty one goes back, and
  on the web ArrowLeft/Right move by direction and ArrowUp/Down step. Each segment sizes itself
  from a hidden copy of its digits (or placeholder) and shows the focus color only while
  focused. The label is always floated, as the web's.
- **Tests:** binding-core `date-picker.spec.ts` ("date segments"); React Native
  `date-pickers.spec.tsx` (segments and placeholders per locale, moving and stepping, typed
  confirm).

## Checks run

- `omni run build test -p @pureform/binding-core -p @pureform/machines -p @pureform/react
  -p @pureform/solid -p @pureform/react-native -p @pureform/component-cases`: React Native's
  `indication.spec.tsx` ripple and `presence.spec.tsx` FAB stagger failed once (timing, under
  load); `-f failed` passed.
- `omni run generate prepare -p @pureform/panda-fixture`, then component suites:
  `overlays`, `server-rendering`, `controllable`, `keyboard` on `solid/css` and `react/css`
  `-t "Menu|Carousel"` (300 passed); `overlays`, `server-rendering` on `solid/panda` and
  `react/tailwind` `-t Menu` (120 passed).
- Browser suite: `rn-parity` and `rn-indication` (202 passed).
- Story tests: `Carousel.stories.ts` and `Menu.stories.ts` on `storybook/solid` and
  `storybook/react` (24 and 34 passed). There's no `storybook/native` project.
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, machines, component-cases, react,
  solid, react-native and the app; `omni run build -p @pureform/storybook-web` passes.
- Storybook screenshots (React Native) after each fix: search view, toolbars, docked date picker,
  date input (empty, typed, day first), menus cascading and drilled in all three renderers.

## Refactoring hints

- **Helpers that look generic:** `Expanding` (`react-native/src/expand.tsx`) is what any React
  Native part that appears and disappears in flow wants (a select's supporting text, a snackbar
  in a column). The window-width hooks (`useWindowWidth` in React's `menu.tsx`, `windowWidth` in
  Solid's) are generic too: a `binding-core/dom` subscription with a per-binding wrapper would
  serve any `auto` that follows the window class.
- **Code that looks like a sibling's:** React Native's date input `Segment` follows the code
  field's `Cell` (per-cell focus, moving on and back); React's and Solid's drill logic in the
  ready-made menus are the same steps (path, back row, highlight) over `menuDrillLevel`.
- **Suggested home:** a React Native `useSegmentFocus` (the ordered refs, `focusAt`, Backspace)
  shared by the code field and date input; the window-width subscription in `binding-core/dom`.
- **What must not change:** the menu specs in all three bindings, the date pickers spec, the
  accordion motion test, `rn-parity`.

## Open questions

- **`auto` is the window class, not a measurement:** it cascades in a window at least 600 wide
  (Material's compact class ends there), else drills. A menu near the edge of a wide window
  still cascades and the submenu flips to the other side. Measuring the room beside the open
  menu would switch the rows' kind after opening; I kept the rule simple. Revisit if a wide
  window with a narrow container (a side panel) should drill.
- Composed web menus (`Menu.Submenu`) always cascade; `submenu` is the ready-made's.
- React Native's cascading submenu isn't in the menu's arrow-key loop on the web (it's another
  portal entry); a press works, and Escape closes the whole menu.
- The React Native date input's segments read the value once (as the text field did): a
  controlled `value` changed from outside doesn't rewrite the digits.
- `Expanding` adds two views around each expanding part; a test or style that reads the part's
  parent directly needs `closest`.
- The labelled-field placeholder rule changes every React Native text field with both a label
  and a placeholder (as the web's already did).
- Storybook's `/tmp/opencode` screenshots kept disappearing (another agent's cleanup); the
  ones referenced are under `/tmp/opencode/fix-storybook-5b/`.
