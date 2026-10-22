# r8: Refactor after f2

**Depends on:** f2. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

Covers f2 (fixes after f1). Read `context/f2*.md`: their refactoring hints, declined refactors
and the "Answers to the open questions" in `context/f2.md`.

## Decided work

- **Shared isolation helper:** tabs' and the switch's raw `zIndex` (`unitless(1)`) move to the
  pattern the list item uses since f2a (`isolation: isolate` on the container). Suggested home:
  an `isolated`/`stackAbove()` pair in `packages/preset/src/components/shared.ts`, used by list
  item, tabs and switch. Must not change the preset snapshots' meaning, rn-parity or the visual
  screenshots.
- **Spring roles on Panda:** the Panda adapter defaults `tokenPrefix` to Panda's own prefix when
  the app sets none, so a role's var names (`--<prefix>-springs-<role>-…`) always match. Test it.
- **React Native role names:** the factory takes a string as a role only on a spring token
  (from the registry's spring-token list); any other string stays a string. Test it.
- **`onClose` and controlled `open`:** document in the sheets' docs (bottom sheet, and wherever
  `onClose` is described) that closing through `open` doesn't ask `onClose`, by design.
- **Menu groups' `first`/`last`:** restore the machine's `first`/`last` option (removed at f2's
  merge) as an override: the bindings mark the groups from DOM order by default
  (`markMenuGroupEdges`), and a group's explicit `first`/`last` wins. Document it as an override
  in the menu docs and the binding READMEs; test both paths.

## Expected duplication to look for

- **Spring checks in three places:** generate's `isSpring` (`shape.ts`), css-lowering's
  `isSpringValue` and rn-adapter's `springFieldNodes`; a core `isSpringToken(node, config?)` (or
  f2e's `tryGetByPath`) may serve all three.
- **`springValues` vs `springTokenValues`** (f2e's hint).
- **f2c's test helpers:** `laidOut` and `dragDown` into `testing/render.tsx`.
- **`closeAsker`:** the bottom sheet uses it; the dialog, full-screen dialog and side sheet share
  `dialogParts`/`useModalOverlay`. Decide whether they take `onClose` (one line each) or record
  why not.
- **`markMenuGroupEdges`:** menu-only today; Select reuses the menu's parts; extract only if
  Select adopts grouped corners.

## Docs

- `component-architecture.md` motion and token sections match f2e's spring-token and role-name
  rules; the preset, styling and rn-adapter READMEs list them.

## Done when

As for r1, with `context/r8.md` for m3's authors.
