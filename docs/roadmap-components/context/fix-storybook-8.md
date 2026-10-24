# fix-storybook-8: progress ends, track, React Native width, tree nesting, select typing

Branch `fix-storybook-8` from main `ced21174`. Not pushed; main untouched. Logs under
`/tmp/opencode/fix-storybook-8-*`. Commits: `git log --oneline main..fix-storybook-8`.

| Commit     | What                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `33e7b426` | Items 1, 2: circular arcs end rounded (cap parts); `track={false}` hides the dot |
| `a753c528` | Item 3: React Native reads a CSS pixel token as pixels in calc                   |
| `d9ed6b6a` | Item 4: tree nests each branch's group in its treeitem (web, React Native)       |
| `1b92f740` | Item 5: web select opens on the option typed on the closed field                 |
| `2358b95d` | Checks: machines spec, steadier specs, gap analysis parts                        |

`preset/src/components/progress.ts` (the parallel fix-progress-keyframes edits its keyframes):
this batch touched only the imports (`translateY`, the `NumericValue` type), the file's markup
comment, the circular tokens (`cap`) and `createCircularProgress`. The keyframes and the linear
indicator are as on main.

## Items

### 1. Circular progress gap ends rounded

- **Cause:** the arcs are ring borders clipped by halves, so every end (and so each gap's) was
  cut square; Compose draws round stroke caps.
- **Done:** four new slots, each a dot as wide as the ring: `trackTailCap`, `trackHeadCap` (in
  `track`) and `tailCap`, `headCap` (in `root`, after the halves). A dot sits centred in its box,
  turned to its place (`rotate(at × 3.6deg)`, mirrored under rtl) and moved out to the ring's
  middle line (`translateY(-(size - thickness) / 2)`), so it needs no `transform-origin` and runs
  on React Native too. The indicator's dots sit at 0 and `value`, the track's at either end of
  what it draws; each shows only while its arc has a length (`opacity: clamp(0, length, 1)`).
  A dot reaches past its arc by the new `cap` token (half the thickness as a share of the ring's
  middle line: `1.45` for 48/4, `3.18` set by `thickness: thick`), so the track turns
  `value + gap + 2·cap` and draws `100 − value − 2·gap − 4·cap`, and the space between the ends
  stays `gap`. Wavy: the track's dots sit on its smaller ring (inset by `amplitude`); the
  indicator's are `display: none`, its ends follow the wave as before. Every renderer (React,
  Solid, React Native) renders the parts; registry fixtures, anatomy (regenerated), binding-core
  part docs, READMEs (preset, React, Solid, React Native), gap analysis row.
- **Tests:** preset `new-components.spec.ts` "rounds every circular arc's ends with a dot…" and
  the circular snapshot (re-recorded: only `circularProgress`); browser
  `progress-motion.e2e.test.ts` "rounds the circular arcs' ends, keeping the gap between them"
  (ltr and rtl, Panda, CSS, Tailwind: each dot 4px, round, centred on the ring at its angle, the
  space between the indicator's head and the track's tail ≈ 4.1px) and the indeterminate track
  turn updated for the caps; `direction.e2e.test.ts`'s circular fixture has the dots; React Native
  `progress.spec.tsx` "the circular arcs' ends" (both engines: the four dots on the ring at their
  angles). React and Solid `linear-progress.spec.tsx` part lists. Checked by eye at 6× zoom
  (round ends, even gaps). Visual `progress`, `loading-and-wavy`, `search-and-feedback`,
  `color-groups` and `expandables` pass unchanged (the dots are within the tolerance), so nothing
  was re-recorded.

### 2. `track={false}` hides the stop dot too

- **Done:** the ready-made `LinearProgress` leaves out `StopIndicator` with the track (React,
  Solid, React Native). The circular one has no stop dot; its track's rounded ends go with the
  track. `ProgressReadyMadeProps.track`'s doc and the READMEs say so (composed: leave out `Track`
  and `StopIndicator`).
- **Tests:** React and Solid `linear-progress.spec.tsx` "leaves the track and the stop dot out
  with track={false}"; React Native `progress.spec.tsx` (same name).

### 3. React Native: an instance's own linear indicator width reaches the track parts

- **Checked:** a percentage override (`tokens={{ indeterminateWidth: "20%" }}`) and a number
  (`60`) already reached the parts' keyframes (the parts stay a gap from the indicator mid-slide).
- **Fixed:** a CSS pixel string (`"60px"`, as on the web) threw ("calc can't combine "60px" and
  4") as soon as the track part's `indeterminateWidth + gap` was evaluated. rn-adapter's calc
  (`values.ts` `quantity`) now reads a `px` length as React Native's plain number.
- **Tests:** React Native `progress.spec.tsx` "moves the parts with an instance's own indicator
  width" (`20%`, `60px`, `60`, both engines; `60px` failed before); rn-adapter `resolve.spec.ts`
  "reads a CSS pixel length … as pixels".

### 4. Tree: each branch's group inside its treeitem

- **Done (web, `machines/src/tree-view`):** Zag's own structure again for the roles: the branch's
  element is the `treeitem` (`aria-level`, `aria-selected`, `aria-expanded`, …), holding the row
  (Zag's branch control) and then the group. `connect` gives the branch element the node's id and
  roving `tabIndex` (so Zag's `focusNode` lands there), its focus handler (target-checked), and
  `aria-labelledby` the row's text (`branchTextId`, set on `getBranchTextProps`), so it's named
  from its own row. The control drops `role`, `id`, `tabIndex` and its focus handler; a click on
  it focuses the treeitem around it. Zag's tree `onKeyDown` finds the node from the event target's
  control or item, so on a branch element the event is retargeted to its control (a `Proxy`
  over `target`/`composedPath`): APG keys unchanged. The branch element forwards focus, blur and
  Enter/Space to the row's interaction emitter (the row stays the indication trigger). No
  `aria-owns`.
- **Styles (`preset/src/components/tree.ts`):** a leaf's row is its treeitem and reads its own
  ARIA as before. A branch's row has none, so it reads its parent's through `rawRules` with a
  child combinator (`[role=treeitem]<state> > &`, and `> * > &` for the leading icon and the
  indicator): selected (container and content, with the state layer), keyboard focus (the ring
  and the focus tint on the row; the treeitem draws no outline), disabled, and expanded (the
  indicator turned). The child combinator keeps a branch's state off its children's rows. Slot
  conditions on the branch slot weren't used: they lower to a descendant combinator and their
  `:has()` alternatives (expanded, focus-visible-within), which would reach the children.
- **React Native (`tree/tree.tsx`):** on the web, a branch's view is the treeitem (the same ARIA,
  `aria-labelledby` the row's text, roving `tabIndex`, focus and blur forwarded to the row's
  indication, Enter and Space pressing the row); its row is a plain `Pressable` out of the tab
  order whose focus moves on to the treeitem. The row's styles come from the selection's states,
  as before. A leaf's row is still its treeitem. iOS and Android unchanged (the row says it).
- **axe:** `label-content-name-mismatch` now fires on the web too (axe reads the children's labels
  inside the branch's treeitem as its visible text), so the exception stays and covers every
  renderer: `stories.config.ts` (Solid, React, React Native), and the component cases' new
  `axeExceptions` (the Tree case), which the accessibility suite turns off per component.
- **Tests:** machines `expandable.spec.ts` (branch element is the treeitem, named from the row,
  the row plain; click focuses the treeitem; arrows, Enter, Home, End); React and Solid
  `expandable.spec.tsx` "makes each node a treeitem holding its row and its group…" and the
  existing tree tests on the treeitem; React Native `a11y-roles.spec.tsx` (structure, names,
  "focuses a branch's tree item when its row is pressed, and shows the focus on the row", keys,
  tab stop); browser `tree-rows.e2e.test.ts` (new; Panda, CSS, Tailwind: a selected branch's row
  tinted and its children's rows not, the indicators, disabled, the focus ring on the row only).
  Component cases: the tree's `focusable` and `focuses` are its treeitems; the indication case
  tabs to the treeitem around the row (`focus`, `focusMoves`). Panda fixture's tree has the
  states on the branch elements; visual `expandables` unchanged.

### 5. Web select: type-to-find on the closed select

- **Done (`machines/src/select.ts`):** the `focused` state's `TRIGGER.TYPEAHEAD` opens the list
  (`setInitialFocus`, `invokeOnOpen`) and highlights the first option starting with the key
  (`clearHighlightedItem`, `highlightMatchingItem`); controlled `open` asks with the highlight
  set. Nothing is chosen by typing (Zag chose without opening, as a native select). Typed again in
  the list, Zag's content typeahead goes on. READMEs (React, Solid).
- **Tests:** React and Solid `select.spec.tsx` "opens on the first option starting with what's
  typed on the closed field, choosing nothing (APG)"; machines `index.spec.ts` now expects this
  one change from Zag's states; the Select case's keyboard keys add `l` (does nothing to the value,
  focus in the open list), run by the keyboard suite and the story tests on every renderer
  (React Native already did this).

## Checks

- `omni run build test -p @pureform/anatomy -p @pureform/preset -p @pureform/binding-core
-p @pureform/machines -p @pureform/rn-adapter -p @pureform/react -p @pureform/solid
-p @pureform/react-native -p @pureform/component-cases`: first run failed the machines spec
  (fixed), my select and RN width specs under load (made steadier) and load flakes elsewhere
  (number field, menu drill, overlays, presence, shared axis); `-f failed` twice: everything
  passes.
- `bunx tsc --noEmit -p tsconfig.json`: clean in anatomy, preset, binding-core, machines,
  rn-adapter, react, solid, react-native, component-cases, storybook-web, browser-e2e-tests,
  component-suites, panda-fixture.
- `omni run build -p @pureform/storybook-web`: passes.
- After `omni run generate prepare -p @pureform/panda-fixture`: browser `progress-motion`,
  `tree-rows`, `rn-parity`, `rn-indication`, `reduced-motion` (`-t "ree|rogress"`), `direction`
  (circular), visual `progress|loading-and-wavy|search-and-feedback|color-groups|expandables`
  (nothing re-recorded). Component suites on `react/css` and `solid/css`: keyboard,
  accessibility, indication, expand-motion, controllable, overlays, direction, themes,
  server-rendering, narrowed to Tree, Select, LinearProgress, CircularProgress: all pass.
- Story tests on `storybook/solid`, `storybook/react`, `storybook/native` for Tree, Select,
  LinearProgress, CircularProgress (174 passed).
- No conflict markers.
- **Not this batch's:** a whole `omni run build` on main fails `@pureform/css-demo#build` and
  `@pureform/tailwind-demo#build` ("components.linearProgress.indeterminateWidth not found": the
  progress keyframes read a token the demos' configs leave out), which fix-progress-keyframes is
  fixing.

## Refactoring hints

- **Helpers that look generic:** the circular `cap` (dot on a ring at an angle, by
  `rotate` then `translateY`, no `transform-origin`) and `capShare` in `progress.ts` would serve
  any ring drawn from borders (a circular slider, the loading indicator's container).
  `retargeted` in `machines/src/tree-view` (a key event seen from another element) is how a
  wrapper element can take a Zag part's keys; nothing else needs it yet.
- **Code that looks like a sibling's:** the tree's `branchRow`/`branchPart` raw rules restate
  `rowParts`' selected, disabled and focus styles for a parent's ARIA. If another row grows a
  wrapper that holds its state (a nested list item), a `rowParts` option "state from the parent"
  (or a core slot condition with a child combinator and no `:has()`) would replace both.
- **Suggested home:** a child-combinator slot condition in `css-lowering/src/conditions.ts`
  (`slotSelector`) if a second component needs it; the ring dot in `preset/src/components/shared.ts`.
- **What must not change:** `progress-motion.e2e.test.ts`, `tree-rows.e2e.test.ts`, the circular
  snapshot, React Native `progress.spec.tsx` and `a11y-roles.spec.tsx` tree tests, the three
  bindings' expandable specs.

## Open questions

- **`cap`** is a share of the circle for the default size (48) at each thickness; an app that
  changes `size` or `thickness` sets `cap` too (README says so), since CSS can't divide a length
  by a length everywhere yet. Off by a little, the gap grows or shrinks slightly.
- **Wavy circular indicator:** its ends follow the wave (no dots); Compose rounds them too.
  A dot would sit off the wave by up to the amplitude.
- **axe `label-content-name-mismatch`** is turned off for the Tree on every renderer: the name is
  right (APG names a parent node from its own label), axe's heuristic counts the nested
  children's text.
- **React Native branch rows** are `tabIndex={-1}` (a press focuses them for a moment, then
  focus moves to the treeitem): React Native Web's `Pressable` ignored `focusable={false}` here.
