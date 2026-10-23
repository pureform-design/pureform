# c8c: Resizable panes (output context)

Branch `c8c-resizable-panes`, from main `62e8ed69`. Commits: `git log 62e8ed69..c8c-resizable-panes`.
Not pushed; main untouched.

Sources, read 2026-10-23 (androidx-main):

- `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/DragHandleTokens.kt`:
  container width 24dp; 4×48dp `Outline`, `CornerFull` at rest; 12×52dp `OnSurface`,
  `CornerMedium` pressed and dragged; elevation level 0. `DragHandle.kt` (`VerticalDragHandle`)
  switches size, shape and colour on pressed/dragged with no animation of its own.
- `compose/material3/adaptive/adaptive-layout/.../PaneExpansionState.kt`: no anchors by default
  (`anchors = emptyList()`); a release at ≥ 200px/s (`AnchoringVelocityThreshold`) snaps to the
  nearest anchor the way it was flung (the nearest overall if there's none that way), slower to
  the nearest; the settle is `spring(dampingRatio = 0.8f, stiffness = 380f)`.
- `compose/material3/adaptive/samples/.../ThreePaneScaffoldSample.kt` `PaneExpansionAnchors`:
  `Proportion(0f)`, `Offset.fromStart(240.dp)`, `Proportion(0.5f)`, `Offset.fromEnd(240.dp)`,
  `Proportion(1f)`. These are our default `SPLITTER_ANCHORS`.
- Zag's `@zag-js/splitter` 1.46.0 (new dependency, catalog `^1.46.0`; `bun.lock` gains only it).

## Built

- **Preset** `splitter.ts` (new component, count 67): Zag's parts `root`, `panel`,
  `resizeTrigger`, `resizeTriggerIndicator` (structure `root: [panel, resizeTrigger]`,
  `resizeTrigger: [resizeTriggerIndicator]`); `orientation` horizontal (side by side, default) or
  vertical (stacked); tokens `handleContainer`, `handleColor`, `handleActiveColor`,
  `handleThickness`, `handleLength`, `handleActiveThickness`, `handleActiveLength`, `handleRadius`,
  `handleActiveRadius`, `target`. The pill's active look is `slot("resizeTrigger", "pressed")`
  (`:active` or `data-pf-active`), which the bindings set while a divider is dragged. Panels have
  `overflow: auto` (native scrolling) and `min-width/height: 0`. Focus ring on the trigger, no state
  layer. 0 compounds. Registered in `index.ts`, `pureform.ts`, `pureform.spec.ts`, `contrast.ts`
  (both handle colours against `surface`, UI contrast). Spec `splitter.spec.ts` with snapshot.
- **machines** `splitter/`: Zag's splitter re-exported (`@pureform/machines/splitter`, vite entry,
  README rows), drift pair and the `index.spec` re-export check.
- **anatomy**: regenerated (`splitterAnatomy`, test ids `pf-splitter-*`).
- **binding-core** `components/splitter.ts`: `SplitterRootOwnProps` (`panels`, `size`/
  `defaultSize`/`onSizeChange` in percent or `"240px"`, `anchors`, `keyboardResizeBy`,
  `orientation`, `id`, `testId`, `unstyled`), `SplitterContentProps` (`panes` with `content`,
  `resizeLabel`), `splitterMachineProps`, `splitterSizeProps` (without any size the panes share the
  room from the first render, so the server draws what the browser does), `SPLITTER_ANCHORS`,
  `SPLITTER_FLING_VELOCITY`, `splitterSnap`, `splitterMoveBy`, `splitterLimits`,
  `splitterPercent`, `splitterInitialSizes`, `splitterTriggerId`, `splitterTriggerProps`,
  `createDragVelocity`; `usage.ts` entry. Spec `splitter.spec.ts`.
- **React and Solid** `splitter/`: `Splitter.Root` (the machine; `useControllable` for `size`, so
  the default is read once and a switch warns), `Splitter.Panel`, `Splitter.ResizeTrigger`
  (`role="separator"`, named by `label`, holding the indicator), ready-made `Splitter` over
  `panes`. Snapping: the trigger records a pointer drag and its velocity (`createDragVelocity`, on
  the trigger's captured pointer moves); Zag's `onResizeEnd` then sends `SIZE.SET` with
  `splitterSnap`'s sizes. The keys are Zag's (arrows 1%, Shift 10%, Home/End) and never snap. The
  room is the root's length less its dividers. Exports, vite entries, unit `optimizeDeps`, registry
  fixtures, specs.
- **React Native** `splitter/`: ready-made `Splitter` only (`panes`, sizes, `anchors`,
  `keyboardResizeBy`, `orientation`, `resizeLabel`, `testId`). Panes by `flexGrow`; each divider a
  `PanResponder` (moves by `splitterMoveBy`, snaps on release with `vx`/`vy`); `role="adjustable"`
  with increment/decrement actions; arrow keys on the web. The pill reads `pressed` per divider
  (each divider calls `useComponentSlots` with its own state). Export, vite entry; specs in
  `components.spec.tsx` ("c8c: splitter").
- **Suites**: `component-cases` `cases/splitter.ts` (examples horizontal, vertical, a third and
  two, three panes, free resizing; controllable `size`; keyboard with arrows by direction) and
  `Splitter` in `COMPONENT_NAMES`; both component-suites scenes. Browser suite: `panes` section in
  the Panda fixture (horizontal and vertical, one divider shown pressed) with a new screenshot,
  `splitter` in `RN_COMPONENTS`, and the indication fixtures' new lines (additions only: 6 each).
- **Docs**: gap analysis (§1.3 row, §1.8 count 67, the new-components table row), READMEs
  (preset, binding-core, machines, React, Solid, React Native).

## Tests

- `omni run build test -p` preset, binding-core, machines, react, solid, react-native,
  component-cases, anatomy: 62 succeeded, 0 failed.
- Unit: React and Solid `src/splitter/` (5 each, run in two projects: 10 passed), React Native
  `components.spec.tsx -t splitter` (3 passed), binding-core `splitter.spec.ts`.
- Component suites (after `omni run generate prepare -p @pureform/panda-fixture`), files
  accessibility, controllable, direction, keyboard, server-rendering, themes, indication with
  `-t Splitter` on `react/css`, `solid/panda`, `react/tailwind`: 183 passed. (The first run failed
  server rendering without a default size and the controllable "reads the default once" and
  "warns once" checks; fixed by `splitterSizeProps` and `useControllable`.)
- Browser suite: `visual -t panes` (new screenshot recorded), `indication -t "compute as the
fixtures recorded"` (re-recorded, additions only), the five parity/indication/factory files with
  `-t splitter` (6 passed).
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, binding-core, machines, anatomy, react,
  solid, react-native, component-cases, component-suites, browser-e2e-tests, panda-fixture. oxfmt
  and oxlint on the changed files. No conflict markers.

## Merge notes

- Shared files touched additively: preset `index.ts`, `pureform.ts`, `pureform.spec.ts`,
  `contrast.ts`; binding-core `index.ts`, `usage.ts`; bindings' `package.json`, `vite.config.ts`,
  `vitest.config.unit.ts`, registry fixtures (`displayRegistry`); component-cases `cases.ts`,
  `scene.ts`; component-suites scenes; `rn-components.ts`; `visual.e2e.test.tsx`'s section list;
  root `package.json` and `bun.lock` (`@zag-js/splitter` only). `generated.ts`: rerun generate.
- The indication fixtures (`web.txt`, `native.txt`) gained 6 lines each after `dragHandle.root`;
  re-record after merging if a sibling adds lines too.
- The gap analysis's §1.10 "optional extras" row still lists `splitter`; I left it so the table
  doesn't realign (merge conflicts). Drop it at the merge.

## Refactoring hints

- **Helpers that look generic:** `createDragVelocity` (binding-core `splitter.ts`) is a pointer's
  speed over its last 100ms, which c8a's sheet settle and the list item swipe also need (they read
  React Native's `vx`; the web has no velocity today). `splitterSnap`'s rule is Compose's
  `getPositionOfTheClosestAnchor`; c8a's partly-open sheet snaps between snap points the same way
  and could share the "nearest, or next that way past a fling threshold" choice.
- **Code that looks like a sibling's:** React's and Solid's `splitter.tsx` mirror each other (as
  every binding pair does); `roomOf` and the trigger's pointer bookkeeping are duplicated between
  them. React Native's divider follows `list-item.tsx`'s `PanResponder` pattern (`latest` ref).
- **Suggested home:** a `drag.ts` in binding-core for `createDragVelocity` and an anchor chooser
  (`nearestAnchor(positions, at, velocity, threshold)`) used by the splitter and c8a.
- **What must not change:** `splitter.spec.ts.snap` (preset), the `panes` screenshot, the
  indication fixture lines, the component suites' Splitter cases, the bindings' splitter specs.

## Open questions

- **No settle animation.** A snap jumps to the anchor on every target; Compose settles on
  `spring(0.8, 380)`. On the web it would need a `flex-grow` transition that's off while dragging
  (or a `linear()` spring sampled with the release velocity, c8a's helper); React Native could
  spring the sizes with `Animated`. Say if wanted.
- **Default anchors.** Compose has none by default; ours default to its sample's
  (`SPLITTER_ANCHORS`), because the phase asks for snapping. `anchors={[]}` turns it off.
- **Proportion anchors** are of the panes' room (the root less the dividers), and offset anchors
  measure from the start of the panes; with three panes they apply to the dragged divider's
  position in the whole room. Compose has two panes only.
- **Minimum widths** are the app's (`minSize`, default 0). Compose's list-detail doesn't set one
  on the drag either (its panes have preferred widths); a default such as 240px could be added.
- **The vertical `DragHandle`** (`orientation="vertical"`, "for a pane divider") stays: it has no
  behaviour and is not deprecated, but the splitter now draws its own pill from Compose's tokens
  (24 container, `outline`, pressed growth), where the drag handle's vertical pill is
  `onSurfaceVariant` with no pressed look. Unifying them (the splitter rendering `DragHandle`, or
  dropping `orientation`) changes the drag handle's look; left for a decision.
- **React Native** has no composed parts (ready-made only), and no `disabled` divider.
- **Keyboard steps** are Zag's (1%, Shift 10%); Compose's drag handle semantics move between
  anchors instead. Keys never snap.
