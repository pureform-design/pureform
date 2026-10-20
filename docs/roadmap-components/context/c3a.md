# c3a: Snackbar queue and toast (output context)

Commits: see `git log c57cab9..c3a-snackbar-queue-toast`.

## Built

- **Preset `toast`** (`packages/preset/src/components/toast.ts`, exported with `TOAST_TYPES` and
  `ToastType`): slots `group, root, icon, title, description, actionTrigger, closeTrigger`
  (structure `group: [root]`, `root: [the rest]`). `group` is the outermost part, as in Zag, so
  it holds the tokens (and the indication tokens) and stacks at `zIndex("snackbar")`. The root is
  a column on `surfaceContainerHigh` (`surface(…, "level3")`), `radius("medium")`, 356px wide,
  with the icon (start) and close button (end) absolutely placed in its inline padding
  (`add(paddingInline, iconSize, spacing 3)` at the start, `closeSize` at the end), and
  `tweens("transform", "opacity", "height")`. `type`: `info` (default; the icon reads the
  `accent` token, `sys("info")`), `success`, `warning`, `error`, and `loading` (`primary`); each
  sets the icon's `color` to the theme's color group. 0 compounds (before 0, after 0). Two
  indication entries (`actionTrigger`, `closeTrigger`). Registered in `pureform.ts` and
  `index.ts`; contrast pairs; specs (`toast.spec.ts`, `pureform.spec.ts`, `a11y.spec.ts`,
  `new-components.spec.ts` snapshot). `generated.ts` regenerated (`toastAnatomy`, root `group`).
- **Success and warning colors:** no new roles were needed. `@pureform/theme`'s
  `BASE_COLOR_GROUPS` already has `success`, `warning` and `info`, and the Material palette fills
  them (fixed hues in `core-palette.ts`) for a static theme and a runtime seed alike.
  `toast.spec.ts` checks both set `success*`/`warning*`; the component suites' themes test checks
  a named theme and a runtime seed draw the toasts.
- **Machines:** `snackbar/snackbar.queue.ts`, `createQueue<Options>(prefix?)` (exported from
  `@pureform/machines/snackbar` with `Queue`, `QueueItem`, `QueueOptions`): `items`, `current`,
  `subscribe`, `show`, `dismiss(id?, reason?)` (the shown one becomes `closing` and its
  `onOpenChange` hears the reason once; a waiting one leaves unseen), `gone(id)`, `clear()`. New
  subpath `@pureform/machines/toast` (`src/toast/index.ts`): `@zag-js/toast` re-exported, with
  `anatomy = zag.anatomy.extendWith("icon")` and `connect` adding `getIconProps()` (`aria-hidden`,
  `data-type`). Added to the drift test. New dependency `@zag-js/toast` (catalog `^1.46.0`).
- **binding-core:** `components/toast.ts`: `ToastType`, `ToastPlacement`, `ToasterOptions`,
  `TOASTER_DEFAULTS` (bottom-end, max 3, 5000 ms, gap 8, stacked, offsets 16px),
  `toasterOptions`, `ToastAction`, `ToastVariantProps`, `ToasterOwnProps`, `TOASTER_PROPS`,
  `toastSelection(type, props)` (unknown types select `info`), `isToastType`, `TOAST_GLYPHS`
  (text glyphs, React Native), `TOAST_STACK_STYLE` (Zag's `--x/--y/--scale/--opacity/--height`
  as a transform, opacity and height), `toastGroupStyle(style)` (Zag's region style with
  physical `left`/`right` and without its max `zIndex`). `components/snackbar.ts`:
  `SnackbarQueueOptions<Node>`, `SnackbarQueueApi<Options>`, `SnackbarHostPlacementProps<L>`
  (`offset`), and `onExitComplete` on `SnackbarRootOwnProps`. Usage entry `toast` (`type` is per
  toast, so every value is kept).
- **Solid and React:** `Snackbar.Root` takes `onExitComplete`. `snackbar/queue.tsx`:
  `createSnackbarQueue()` (`queue`, `show`, `dismiss`) and `SnackbarHost` (`queue`, `offset`: a
  fixed, centered row at `calc(offset + var(--spacing-4, 16px))` from the bottom, showing the
  queue's front snackbar as the ready-made, `open` until it's closing, `gone` on exit). New
  `toast/` subpath: `createToaster(options)`, `Toaster` (ready-made), `Toast` (= `Toaster` with
  `Group`, `Root`, `Icon`, `Title`, `Description`, `ActionTrigger`, `CloseTrigger`), types
  `ToastStore`, `ToastData`, `ToasterProps`, `ToastGroupProps` (children
  `(toast, index) => …`), `ToastRootProps` (`toast`, `index`), `ToastPartProps`,
  `ToastButtonProps`. `glyphs.tsx` gains `ToastIcon` (an SVG per type). Package exports, vite
  entries, unit-test `optimizeDeps`, registry fixtures, specs (`snackbar/queue.spec.tsx`,
  `toast/toast.spec.tsx`).
- **React Native:** `useSnackbar` now runs on the machines' `createQueue` (same behavior and
  tests), and each `show` takes `offset` (points above the host's bottom inset) and `layout`.
  New `toast/` subpath: `createToaster` (Zag's store) and `Toaster`, a column at the store's
  placement (absolute, inside the portal host's insets) that times each toast itself
  (held while hovered or pressed; `loading` stays), fades it out on `dismiss`, then `remove`s
  it. Tests in `overlays.spec.tsx` (both engines).
- **Suites:** component-suites case `toast.ts` (`Toast` scene per binding: a toaster with the
  scene's `toasts`, each `duration: Infinity`); its examples are the empty region and its toasts
  are `opened`, since Zag adds them on the client. New `ComponentCase.themedProps` (the themes
  suite's props) so the named and runtime themes draw real toasts. Browser suite: a `toasts`
  section on the Panda fixture page (each type, base and teal) with its screenshot, `toast` in
  `RN_COMPONENTS` (parity, native indication), the indication fixtures (additions only), and a
  React Native indication case (`inCard: false`, a new `RnCase` flag: the toaster is placed over
  the page, not in a card).
- Docs: gap analysis (§1.2 rows, §2.2 snackbar row, §4.0 row, §4.1 "Done", §7 rows and the
  removed note), READMEs (preset, machines, binding-core, solid, react, react-native, anatomy,
  component-suites).

## Deviations from the design

- **No new color roles.** The phase asked to add success and warning roles; they already exist
  as Material color groups that every palette fills, so the toast uses them.
- **The `type` variant sets the icon's color, not a token.** Only the outermost slot can set
  tokens, and the group holds toasts of every type. `accent` stays the `info` icon's token.
- **`group` is the toast's anatomy root.** The anatomy spec's "nests every part inside the root"
  now allows `group` for the toast (`packages/anatomy/src/anatomy.spec.ts`), and the preset's
  indication spec reads the outermost slot (`packages/preset/src/indication.spec.ts`).
- **No shared "notify" API.** The snackbar queue and the toaster stay separate (one at a time
  vs a stack with types); see the hints.
- **Zag's region placement:** Zag converts `start`/`end` to left/right by `dir`, then writes them
  as `insetInlineStart`/`insetInlineEnd`, which the region's own `dir` flips back, and stacks it
  at the maximum `zIndex`. `toastGroupStyle` writes physical `left`/`right` and drops the
  `zIndex`, so the region follows the provider's direction and sits at the theme's layer.
- **Snackbar placement** is a host-level `offset` rather than measuring the FAB or navigation bar.
- **Solid `createBindable` fix** (`packages/solid/src/internal/zag/bindable.ts`): an updater
  `set(prev => …)` now reads the last write, not the value Solid shows until the next flush.
  Zag's toast group adds three toasts in one go with updaters; only the last survived.

## Stubs and gaps

- No swipe to dismiss, no hotkey focus jump on React Native; the React Native toaster times
  toasts itself (Zag's machines need the DOM) and has no overlap mode or `promise` pending UI
  beyond what the store does.
- The loading icon is a static partial ring (the style AST has no rotation animation); React
  Native shows text glyphs (`TOAST_GLYPHS`).
- The toast's action sits at the start under the text (the AST has no `alignSelf`).
- The toast's width is a fixed 356px token; narrow screens are capped by `maxWidth: 100%` on
  React Native only.
- Not added to the rn-web demo or the Solid demo.
- `bun.lock` was not updated (see "Notes"): `@zag-js/toast` is in the root catalog and
  `packages/machines/package.json` only.

## How to verify

- `omni run build test -b c57cab9 -w -o continue` (targeted to what changed).
- `bunx vitest run` in `packages/preset`; `bunx vitest run -c vitest.config.unit.ts src/toast
src/snackbar` in `packages/machines`, `packages/solid`, `packages/react`;
  `src/overlays.spec.tsx` in `packages/react-native`.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "Toast|Snackbar"`.
- `omni run test:e2e -p @pureform/browser-e2e-tests`.
- `bunx tsc --noEmit -p tsconfig.json` in preset, machines, binding-core, solid, react,
  react-native.

## Notes for the next phases

- `bun install` fails at c57cab9 ("Workspace dependency @pureform/machines not found", r2's open
  question). This worktree installed with the lockfile moved aside and restored it after; the
  merge must regenerate `bun.lock` (now with `@zag-js/toast` too).
- Overlay cases whose content Zag adds on the client (the toaster) can't be in `examples`
  (server rendering hydrates them); use `opened` and `themedProps`.
- Run `generate` after merging (`toastAnatomy`).

## Refactoring hints

- **Helpers that look generic:**
    - The plain-button pattern again: `toastButton` in Solid/React `toast/toast.tsx` is the
      snackbar's `snackbarButton` with other part names (own source, `useInteractionHandlers`,
      `combinePartProps` over the machine's props). With the split button, input chip remove and
      full-screen dialog actions, r2 left this for r3: a `machineButton(part, getProps)` factory
      in each binding's `parts`.
    - React Native's `ToastButton` (`toast/toast.tsx`) is `SnackbarButton` (`snackbar.tsx`)
      with the component name and selection swapped: one `SurfaceButton(component, part, …)`.
    - React Native's "held while hovered or pressed, then a timer" (`QueuedSnackbar` in
      `snackbar/queue.tsx`, `ToastItem` in `toast/toast.tsx`): a `useHeldTimeout(duration, open,
onTimeout)` hook with the `Pressable` wrapper.
    - `ToastIcon`/`CloseIcon` in each binding's `glyphs.tsx` are written twice (Solid, React)
      with the same paths: the paths could live in binding-core (`GLYPH_PATHS`).
- **Code that looks like a sibling's:** c3b's sheets and c3c's search view also render overlays
  from Zag in Solid/React; the "Zag style that a fixed element resolves against its own `dir`"
  issue (`toastGroupStyle`) may show up for a side sheet's inline placement. The empty-region /
  `opened` / `themedProps` pattern in the suites applies to any overlay whose content mounts on
  the client.
- **Suggested home:** `machineButton` in `packages/{solid,react}/src/parts.tsx`; the RN button and
  timer hook in `packages/react-native/src/overlay.tsx`; glyph paths in
  `packages/binding-core/src/glyphs.ts`.
- **What must not change:** the `toasts` screenshot, the indication fixtures' toast entries, the
  `new-components` snapshot's toast recipe, the snackbar's queue order and timing tests
  (machines, Solid, React, React Native), and `JSON.stringify(pureform())`.

## Open questions

- The toast's surface (`surfaceContainerHigh`, `radius("medium")`, 356px) and type colors on the
  icon only are our design calls (M3 has no toast); a filled container per type is the other
  reading.
- Should the snackbar host measure a FAB or navigation bar itself rather than take `offset`?
- One notify API (`notify.snackbar(…)`, `notify.toast(…)`) was suggested by the gap analysis;
  worth it once there's a need for both from one call site.
- The Solid `createBindable` updater fix touches every Zag machine on Solid; the targeted suites
  pass, but the whole run should confirm it.
