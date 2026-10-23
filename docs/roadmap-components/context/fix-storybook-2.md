# fix-storybook-2

User-reported Storybook issues (`apps/storybook-web`), fixed on branch `fix-storybook-2`.
Follows [fix-storybook](fix-storybook.md).

## 1. "The 'ariaLabel' prop on 'PopoverProvider' will become mandatory in Storybook 11"

- **Cause:** Storybook's own manager, not our code. Reproduced with Playwright on a running
  `storybook dev` (the warning fires on every manager load, twice, with a stack through
  `PopoverProvider` in `sb-manager/globals-runtime.js`). The only `PopoverProvider` in the
  manager that gets no `ariaLabel` is the preview toolbar's **Zoom** tool
  (`storybook/dist/manager/runtime.js`, `Zoom2`, `padding: "none"`, 10.6.3); every other call
  site, including the "Additional tabs" one, passes it. `.storybook/manager.ts` and the
  toolbar `globalTypes` in `preview.ts` use no `PopoverProvider`.
- **Fix:** not fixed. Hiding the Zoom tool (`parameters.toolbar.zoom.hidden`) would remove a
  working feature to silence a dev warning that Storybook 11 will fix upstream.
- **Source:** Storybook 10.6.3 `storybook/dist/manager/runtime.js` (`Zoom2`) and
  `components/index.js` (`PopoverProvider`'s `deprecate`).

## 2. "Accessing the Story Store is deprecated and will be removed in 9.0"

- **Cause:** the message is `deprecate()` in Storybook's `Preview.storyStore` getter
  (`preview/runtime.js`): any property read on `window.__STORYBOOK_STORY_STORE__` or
  `__STORYBOOK_PREVIEW__.storyStore` logs it. The builder's virtual entry only assigns the
  proxy (it reads no property). Nothing in this repo reads it (grep for `storyStore`,
  `__STORYBOOK_STORY_STORE__`, `__STORYBOOK_PREVIEW__`: only `scripts/system-scheme.mjs`
  uses `__STORYBOOK_ADDONS_CHANNEL__`), and no `@storybook/*` addon package reads it.
- **Not reproduced** in dev with Playwright over 8 stories (Accessibility, Interactions and
  Controls panels, a docs page, an HMR edit of a story file) or in the Vitest story runs. The
  likely reader is something outside the app that enumerates `window` (a browser extension or
  inspector), which touches the proxy's properties.
- **Fix:** none; nothing of ours to migrate.

## 3. Solid ignored some control changes (CodeField `length`)

- **Cause:** neither the Solid component nor the adapter. `CodeField` hands `length` to Zag's
  pin input as `count` through a reactive props getter, and the adapter's args are reactive
  (the new `MachineProps` story shows other props update through it). Zag's machine seeds a
  `count` context from `prop("count")` **once** (`defaultValue: prop("count")`, with a "move
  this to props" TODO) and nothing follows the prop afterwards, so the cells stayed. React
  has the same bug through the same machine (its adapter just re-renders; the machine keeps
  the old count); React Native reads `length` per render and is fine.
- **Fix:** `packages/machines/src/pin-input/index.ts` adds a `watch` that tracks `prop("count")`
  and writes the context. Specs: Solid's `code-field.spec.tsx` ("follows a changed length
  without a remount", keeps the first cell element) and React's ("follows a changed length");
  both failed before the fix. `apps/storybook-web/src/stories/SolidAdapter.stories.ts`
  `MachineProps` mounts a CodeField through the adapter and changes `length` 4 → 6 → 3.
- **Audit:** `grep untrack(` in `packages/solid/src` finds only structural, deliberate reads
  (a list item's `region`/`swipeAction`, `defaultRevealed`, the radio group's reset values,
  initial text and values). In the Zag machines we use, `defaultValue: prop(...)` seeds
  that aren't `default*` props are pin-input's `count` (fixed), carousel's `pageSnapPoints`
  (its watches track `slidesPerPage`, `slidesPerMove`, `slideCount`, `orientation`, `autoSize`
  and `dir`) and slider's `thumbSize` (measured from the DOM when not given; a changed
  `thumbSize` prop isn't followed, not changed here, no control for it).
- **e2e:** `keyboard`, `controllable` and `forms` for `-t CodeField` on `solid/panda` and
  `react/css` pass (52).

## 4. Toast and GridList were missing

- **Cause:** `stories.config.ts` skipped both. Their cases give data (`toasts`, `tiles`) that
  the suites' `ToastScene` and `GridListScene` turn into a toaster and `GridList.Tile`
  children; the bindings' `./toast` export is a compound (React/Solid) or a `Toaster` that
  takes a store, so the generated story could not pass the case's props.
- **Fix:** a renderer's config gets `scenes: { module, components }`; the generator imports
  those components from the module instead of the binding export. `src/solid/scenes.ts`
  (no JSX, `createComponent`), `src/react/scenes.ts` over `scene-builders.ts` (shared with
  React Native), `src/native/scenes.ts`. Hooks `src/stages/toast.ts` and `grid-list.ts` add a
  play (a toast per `toasts` in the `Opened` stories; a tile per `tiles`). Controls still come
  from React's exports. 34 story tests pass in Solid and React; React Native's 17 also pass
  (`SB_RENDERERS=native`, it stays out of the default run).
- **Component fix found on the way:** React Native's `Toaster` group had `aria-label` and no
  role, which axe rejects (`aria-prohibited-attr`); the web group is `role="region"` (Zag), so
  React Native's is too.
- **Spec:** WAI-ARIA landmark `region`; Material 3 specifies a snackbar, not this toaster.

## Checks

- `omni run build test -p @pureform/machines -p @pureform/solid -p @pureform/react` and
  `-p @pureform/react-native`: pass apart from timing flakes under load that moved between
  runs (Solid `fade-through`; React Native `splitter`, `table`, `nested`), each green on its
  own rerun or unrelated to the change.
- `bunx tsc --noEmit -p tsconfig.json` clean in `packages/{machines,solid,react,react-native}`
  and `apps/storybook-web/src/solid`; `apps/storybook-web`'s root config reports the same 275
  errors in `packages/solid/dist/*.jsx` as before (its stories import Solid's built JSX), none
  in our sources.
- `omni run build -p @pureform/storybook-web` passes.

## Open questions

- Hide Storybook's Zoom tool to silence issue 1? Costs the zoom control.
- Issue 2: if it still appears, the browser's console stack (which frame reads
  `__STORYBOOK_STORY_STORE__`) would name the reader.
- The scenes build a toaster once from `toasts`; changing that arg from the controls (it has
  none) wouldn't update it.
