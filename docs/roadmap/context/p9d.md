# p9d: Indication on React Native (output context)

Commits: 2230363..d72e89f, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `2230363` | `feat(react-native)`: interaction sources, indication, the provider's default, the props; usePress/useInk go |
| `96f83b3` | `test(rn-web-demo)`: every surface the anatomy names ripples, the controls' and the snackbar's too           |
| `beaab5b` | `docs`: READMEs (react-native, rn-web-demo)                                                                  |
| `d72e89f` | `docs(design)`: "Built (p9d)" in §9.8                                                                        |

## Built

### `@pureform/react-native`

New dependency `@pureform/machines` (catalog; omni dependency; one lockfile line, `bun install
--frozen-lockfile` reports no changes). Only `@pureform/machines/interaction` is imported; its built
chunk has no Zag or DOM imports.

**`src/interaction.ts`**

```ts
useInteractionSource(): MutableInteractionSource;          // stable, useState(createInteractionSource)
useInteractionState(source: InteractionSource): InteractionState; // useSyncExternalStore
FOCUS_AFTER_PRESS_MS = 500;
focusFollowsPress(): boolean; // a pointer press in progress anywhere, or one ended < 500 ms ago
interface PressableEvent { nativeEvent?: object; currentTarget?: unknown }
interface PressableHandlers { onPressIn; onPressOut; onHoverIn; onHoverOut; onFocus; onBlur }
class NativeInteraction {        // wraps InteractionEmitter (machines)
    emitter: InteractionEmitter;
    press(event?); release(event?); cancel(event?); hoverIn(event?); hoverOut(event?);
    focus(event?); blur(event?); dragStart(); dragStop(); end();
    readonly handlers: PressableHandlers; // spread on a Pressable
}
useNativeInteraction(source, disabled?): NativeInteraction; // ends on unmount and while disabled
useInteraction(given, disabled?): { source; interaction; state } // internal; given ?? own; state idle while disabled
interactionStates(state, own?): State; // { ...own, pressed, active, hover, focus, focusVisible }
```

A press's pointer: `"keyboard"` when the native event has `key` or a `key*` type (React Native Web's
Enter/Space), `"virtual"` without finite `pageX`/`pageY`, else its `pointerType`, `"mouse"` for a
`mouse*` type, else `"touch"` (React Native's own touches). Origin `{ x: pageX, y: pageY }` (page
coordinates, not viewport), `"center"` for keyboard/virtual. Touch never hovers (also skipped in
`hoverIn`). The emit's origin argument is `event.currentTarget`.

**`src/indication-tokens.ts`** (internal): `providerIndicationValues(indication): ThemeValues | undefined`
(six theme paths from `THEME_INDICATION_TOKENS`, raw values), `instanceIndicationTokens(indication,
providerColor)` (provider color, then the prop's seven tokens, raw), `withIndicationTokens(selection,
tokens)` (under the selection's own `tokens`).

**`src/indication.tsx`**

```ts
materialIndication(options?: MaterialIndicationOptions): Indication;
//   { ...binding-core's materialIndication(options), native: MaterialRipple }, frozen, cached per
//   web object; names "material", "material:ink-sparkle"; { ripple: false } is binding-core's own.
DEFAULT_INDICATION; // materialIndication()
nativeIndication(indication): Indication; // binding-core's Material objects → React Native's; others as given
resolveIndication(own, state): Indication; // own ?? provider ?? default, mapped, dev warning once for thickness 0
surfaceOf(selected, slot): NativeIndicationSurface;
IndicationLayer({ indication, source, surface, centered }); // renders indication.native, or nothing
useSurfaceIndication(entry: IndicationAnatomy, { indication?, interactionSource?, disabled?, interactive? }):
  { source, interaction, handlers, indication, interactive, state, states(own?), select(selection), layer(selected) }
useIndication(source, { centered?, style?, drawing? }): { surface: PressableHandlers; layer: ReactElement | null };
```

`MaterialRipple` (internal, `withEngine`-keyed) calls `engine.useRipple({ clip: surface.drawing, color:
style.color ?? tokens["colors.onSurface"], radius: style.borderRadius, centered })`, subscribes to the
source, and turns `press` into `handlers.onPressIn({ nativeEvent: { pageX, pageY } | {} })` and its
`release`/`cancel` (by id) into `onPressOut`; it renders `ripples.layer`.

**Provider** (`provider.tsx`): `indication` prop; `PureformState.indication` and
`focusIndicatorColor` through binding-core's `resolveProvider` (same as the web). Overrides are
`merge(merge(parent, providerIndicationValues(indication)), props.overrides)`.

**Index** exports: the above public names, plus `defineIndication`, `noIndication` and types
`Indication`, `IndicationTokens`, `MaterialIndicationOptions`, `MaterialRipple`,
`NativeIndicationComponent`, `NativeIndicationProps`, `NativeIndicationSurface`, `Interaction`,
`InteractionKinds`, `InteractionSource`, `InteractionState`, `MutableInteractionSource`, `PointerKind`,
`PressableEvent`, `PressableHandlers`. **Removed:** `usePress`, `useInk`, `withInk`, `PressHandlers`,
`InkSlotOptions` (`parts.tsx` keeps `useControllable`, `withEngine`, `testIdOf`, `unselectable`).

**Components** (each reads its entry from `<c>Anatomy.indication`; the layer is the last child of the
entry's surface):

| Component                | Props                                                       | Surface (layer inside)       |
| ------------------------ | ----------------------------------------------------------- | ---------------------------- |
| button, chip             | `indication`, `interactionSource`                           | root                         |
| icon button, FAB         | same                                                        | `container`                  |
| card, list item          | same; only while interactive (`onPress`)                    | root (card: new ripple)      |
| checkbox, radio          | same (radio: group's `indication`, item's source)           | root (new ripple)            |
| switch                   | same                                                        | `stateLayer` (new ripple)    |
| slider                   | same; responder grant = press + dragStart                   | `stateLayer` (new ripple)    |
| tabs, nav bar/rail, menu | `indication` on the component, `interactionSource` per item | `tab` / `indicator` / `item` |
| select                   | `indication` (to its menu); items' sources                  | the menu's items             |
| snackbar                 | `indication`; action and close each own a source            | `action`, `close` (new)      |
| search bar               | none (own source: root hover/press, input focus visible)    | no indication entry          |

## Deviations from the design

- **"The component's machine emits"**: React Native has no machines; `NativeInteraction` (over
  machines' `InteractionEmitter`) is the machine's part. `@pureform/machines` becomes a dependency.
- **A press's origin is a page point** (`pageX`/`pageY`), not viewport coordinates as on the web: the
  native ripple measures its layer in page coordinates.
- **The search bar gains no ripple**, though the phase file lists it: the anatomy (p9b) declares no
  indication entry for it (§9.8 "No indication"). The slider gains one, which the phase didn't list,
  because its anatomy entry names its state layer (as the web does).
- **`useIndication`** takes the surface's `style`/`drawing` (the ripple's color and corners) and
  returns Pressable callbacks; there are no forwarded attributes on React Native.
- **Ripple color fallback**: a surface without `color` (controls' state layers) ripples in the
  theme's `onSurface`, where the web uses `currentColor`. `"ink-sparkle"` draws the ink well.
- **Disabled is idle**: a disabled component selects without interaction states even when a shared
  source is pressed, and ends what its own emitter started (per item too, unlike the web's gap).
  An app's own emits to a shared source aren't ended by the component.
- Recorded in §9.8 "Built (p9d)".

## Focus-visible heuristic and its limits

`focusVisible` = the `focus` emit's `visible`, which is `!focusFollowsPress()`: false while any
pointer (not keyboard) press is in progress on any surface, or within 500 ms after one ended (a
browser focuses a tapped element on the compatibility mousedown after touchend). Limits: React Native
has no global key events, so focus moved programmatically more than 500 ms after a press shows the
indicator (a browser would remember pointer modality); a Tab within 500 ms of a click doesn't show it;
focus that arrives during a keyboard press is visible. On React Native Web the responder's press
starts on mousedown, before the browser focuses, so a click never shows the indicator, as before.
The old document-keyboard heuristic (`pressableState` in rn-adapter) is no longer used by the
package (rn-adapter still exports it).

## Stubs and gaps

- **The ripple's opacity** still reads the theme's pressed opacity (`components.ripple.opacity`), not
  the surface's `statePressedOpacity` (p9c's gap, also here).
- **Per-item disabled on the web** still doesn't end a press (p9c's gap; fixed on React Native only).
- **No ripple on the select's field** (it's a field; the menu's items ripple).
- **A pointer press counts globally** for focus visibility; there's no per-window/root scope.

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/react-native`: 88 tests pass, type checks clean.
  `src/indication.spec.tsx` (22): the source from Pressable (hover/press/focus/release order, page
  origin and keyboard center, disabled cancels a press, the slider's press and drag), keyboard-only
  `focusVisible` (focus without a press shows a 3px outline, a click's focus 0px, focus just after a
  press hidden), the provider's default (ripples in every surface incl. the new ones, none under
  reduced motion, no layer on a non-acting card, `noIndication`, provider tokens in `useTokens` and
  the focus color/thickness, nesting), the prop (that component only, a composite's items, a custom
  `native` half's props, the dev warning), a shared source (hover shows on the other, both ripple,
  `useInteractionState`, an app kind), `materialIndication` names and equality, `useIndication`.
- `task_run` `test:e2e` on `@pureform/rn-web-demo` (new: a ripple in each anatomy surface),
  `@pureform/browser-e2e-tests` (p9b's `native.txt`/`web.txt` unchanged), `@pureform/component-suites`:
  pass. Workspace `build` + `test:unit`: 142 results, none failed.
- **Equivalence** (not committed; `/tmp/opencode/p9d/eq.mjs`, `cmp.py`, run against a Vite dev
  server of rn-web-demo on port 4399): every element's computed styles and box in 8 modes (base, dark,
  teal, runtime, reduced, Reanimated, no SVG, crimson), and each of the 86 interactive elements' subtree
  hovered, mouse-pressed, released (base, dark, reduced), and 90 Tab focuses; ripple layers excluded.
  872 snapshots: before vs before2 differ in 1 (a scroll offset), before vs after in the same 1.

## Notes for the next phases

- **p9e**: on React Native, find the layer as the surface's last element child without a test id;
  its children are ripples. Presses from `userEvent.click` arrive as `"mouse"` with a page origin. To
  hold a press, dispatch `mousedown` on the element (React Native Web's responder listens on the
  document) and `mouseup` on the document later. The shared suite can pass `indication` and
  `interactionSource` to RN components with the same names as the web's.
- Tests that check focus visibility must wait `FOCUS_AFTER_PRESS_MS` after any click (module-level).
- Card children that are buttons nest `<button>`s on React Native Web (warning); use text.
- `apps/solid-demo/solid-env.d.ts` can change on workspace builds; restore it before committing.
