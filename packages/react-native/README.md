# @pureform/react-native

pureform's bindings for React Native: the provider, the style registry's hooks, motion engines,
icons, and the components (buttons, chips, controls, text inputs, lists, progress, navigation,
menus, dialogs, snackbars, tooltips, and the single-part components). Each component selects
its styles through the generated registry's `StyleFactory`, with its interaction states in the
selection, and names its parts by the shared anatomy. It mirrors `@pureform/react`'s names
where React Native allows.

## Where it sits

```
@pureform/styling   anatomy   binding-core      (framework-free)
        │              │            │
        └──────────────┼────────────┘
                       │
         @pureform/react-native ──► @pureform/rn-adapter (/react, /factory, /animated, …; peer)
                       │
      react 19, react-native; react-native-svg, react-native-reanimated (optional peers)
```

- **Depends on:** `@pureform/anatomy` (part names, test ids, and where each component shows
  indication), `@pureform/binding-core` (provider nesting, selections from props, controllable
  state, icon style types, the interaction source and the `Indication` interface),
  `@pureform/machines` (only its `/interaction` subpath's `InteractionEmitter`, which has no Zag
  or DOM code), and, as
  peers, `@pureform/styling` (the registry) and `@pureform/rn-adapter` (the factories' runtime,
  the hooks that select and animate, and the engines' drawing). Both peers are core-train
  packages the app's generated registry imports too, so the app and the binding share one copy.
- **Depended on by:** `apps/rn-web-demo`.
- No Zag: React Native has no DOM for its machines. `Pressable`'s callbacks emit each
  component's press, hover, and focus to its interaction source, as a machine does on the web,
  and controlled state goes through `useControllable`.

See the [design doc](../../docs/design/component-architecture.md), §5.1, §5.3, §5.8, §5.9,
§9.6, and §9.8.

## Architecture

| Module                                                                  | What it holds                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                          | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`, `useEngine`                                                                                                                                 |
| `styles.ts`                                                             | `useStyles`, `useStyleFactory` (the registry's hooks), `useComponentSlots`, `useSelectedStyles` (what components use)                                                                                                      |
| `engine.ts`, `engines/`                                                 | `MotionEngine` and the engines: `animated` here, `animatedSvg`, `reanimated`, `reanimatedSvg` at their subpaths                                                                                                            |
| `icon-style.tsx`                                                        | `useIconStyle`, `IconSlot` (what an icon part provides), `Glyph` (a text glyph as an icon)                                                                                                                                 |
| `provided-tokens.tsx`                                                   | `ProvidedTokens` and `useProvidedTokens`: what a container's slot provides its nested components (component-architecture.md §5.5), laid over the provider's overrides for the subtree (the toolbar and app bar use it)     |
| `interaction.ts`                                                        | `useInteractionSource`, `useInteractionState`; `NativeInteraction` (Pressable's callbacks → the source), focus visibility                                                                                                  |
| `indication.tsx`, `indication-tokens.ts`                                | `materialIndication` (with its native ripple), `useIndication`; each component's `useSurfaceIndication` (internal)                                                                                                         |
| `parts.tsx`                                                             | `useControllable`, `withEngine`, `testIdOf`                                                                                                                                                                                |
| `layer.ts`                                                              | `useLayer`: a stacking layer's z-index from the theme, for an overlay's wrapper                                                                                                                                            |
| `presence.ts`                                                           | `usePresence`: an overlay's enter and exit (the preset's motions), present until the exit ends                                                                                                                             |
| `tab-indicator.ts`                                                      | `useIndicatorSlides` (internal): the tabs' indicator sliding from the tab selected before, from `onLayout` boxes                                                                                                           |
| `portal-host.tsx`, `portal.tsx`                                         | `PortalHost` (the root provider holds one) and `Portal`: overlays rendered over the page, sorted by layer                                                                                                                  |
| `overlay.tsx`                                                           | `placeOverlay` (placement, flip, shift), the trigger's box from its source, `useDismiss` (Escape and the back button)                                                                                                      |
| `button/`, `chip/`, `icon-button/`, `fab/`, `card/`                     | One subpath each: the component's file and its `index.ts`                                                                                                                                                                  |
| `checkbox/`, `switch/`, `radio-group/`, `slider/`                       | Controls                                                                                                                                                                                                                   |
| `text-input.tsx`, `text-field/`, `text-area/`, `select/`, `search-bar/` | The text inputs; the field they share (prefix and suffix text, `counterMax`'s counter, and `secure`'s visibility toggle)                                                                                                   |
| `navigation.tsx`, `tabs/`, `navigation-bar/`, `navigation-rail/`        | Tabs and navigation, sharing one file                                                                                                                                                                                      |
| `list/`, `list-item/`, `menu/`, `dialog/`, `snackbar/`, `tooltip/`      | Lists and overlays: each surface, and the ready-made overlay (`snackbar/queue.tsx`: `useSnackbar`; `tooltip-overlay.tsx`, the trigger overlay the two tooltips share)                                                      |
| `progress.tsx`, `single-part.tsx`, and their subpaths                   | Progress indicators; avatar, icon, media, scrim, separator, supporting text, text                                                                                                                                          |
| `loading-indicator/`                                                    | `LoadingIndicator`: turns, drawn in its first shape with an SVG engine (React Native's keyframes carry no clip, so it doesn't morph) and as a circle without one                                                           |
| `tags-input/`                                                           | `TagsInput`: input chips in a text field (submit or the delimiter adds one, Backspace or its remove button removes one)                                                                                                    |
| `toast/`                                                                | `createToaster` (Zag's toast store) and `Toaster`, which shows its toasts in a column at its placement and times them itself; `useSnackbar`'s queue is the machines' `createQueue`, and each snackbar takes an `offset`    |
| `toolbar/`                                                              | `Toolbar`: icon buttons and buttons in a bar, the elements that don't fit in a `Menu` behind an overflow button                                                                                                            |
| `time-picker/`, `time-input/`                                           | `TimePicker` (a dial on the responder system, `adjustable` for assistive technology, or scroll fields) and `TimeInput` (number-pad fields): the time in state, through `@pureform/machines/time-picker`'s arithmetic       |
| `paginator/`                                                            | `Paginator`: the page-size `Select`, the range label and icon buttons for first (optional), previous, next and last (optional) page, over the page and page size it keeps                                                  |
| `carousel/`                                                             | `Carousel`: a horizontal `ScrollView` snapping to each item, masks sized by `carouselItemSizes` as it scrolls, `page` scrolled to at once under reduced motion; no arrow keys                                              |
| `accordion/`                                                            | `Accordion`: a column of item tiles, each a pressable header (`aria-expanded`) over its content while expanded; the expanded items are React state, as there's no Zag machine                                              |
| `tree/`                                                                 | `Tree`: rows (`role="treeitem"`) with a branch's children indented under it while expanded; the expanded and selected nodes are React state                                                                                |
| `stepper/`                                                              | `Stepper`: a list of steps with a pressable header each (an indicator, a label, a caption), a connector and the current content; `step` controllable, `linear`, `orientation`; no arrow keys or next and previous triggers |
| Module                                                                  | What it holds                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                          | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`, `useEngine`                                                                                                                                 |
| `styles.ts`                                                             | `useStyles`, `useStyleFactory` (the registry's hooks), `useComponentSlots`, `useSelectedStyles` (what components use)                                                                                                      |
| `engine.ts`, `engines/`                                                 | `MotionEngine` and the engines: `animated` here, `animatedSvg`, `reanimated`, `reanimatedSvg` at their subpaths                                                                                                            |
| `icon-style.tsx`                                                        | `useIconStyle`, `IconSlot` (what an icon part provides), `Glyph` (a text glyph as an icon)                                                                                                                                 |
| `provided-tokens.tsx`                                                   | `ProvidedTokens` and `useProvidedTokens`: what a container's slot provides its nested components (component-architecture.md §5.5), laid over the provider's overrides for the subtree (the toolbar and app bar use it)     |
| `interaction.ts`                                                        | `useInteractionSource`, `useInteractionState`; `NativeInteraction` (Pressable's callbacks → the source), focus visibility                                                                                                  |
| `indication.tsx`, `indication-tokens.ts`                                | `materialIndication` (with its native ripple), `useIndication`; each component's `useSurfaceIndication` (internal)                                                                                                         |
| `parts.tsx`                                                             | `useControllable`, `withEngine`, `testIdOf`                                                                                                                                                                                |
| `layer.ts`                                                              | `useLayer`: a stacking layer's z-index from the theme, for an overlay's wrapper                                                                                                                                            |
| `presence.ts`                                                           | `usePresence`: an overlay's enter and exit (the preset's motions), present until the exit ends                                                                                                                             |
| `tab-indicator.ts`                                                      | `useIndicatorSlides` (internal): the tabs' indicator sliding from the tab selected before, from `onLayout` boxes                                                                                                           |
| `portal-host.tsx`, `portal.tsx`                                         | `PortalHost` (the root provider holds one) and `Portal`: overlays rendered over the page, sorted by layer                                                                                                                  |
| `overlay.tsx`                                                           | `placeOverlay` (placement, flip, shift), the trigger's box from its source, `useDismiss` (Escape and the back button)                                                                                                      |
| `button/`, `chip/`, `icon-button/`, `fab/`, `card/`                     | One subpath each: the component's file and its `index.ts`                                                                                                                                                                  |
| `checkbox/`, `switch/`, `radio-group/`, `slider/`                       | Controls                                                                                                                                                                                                                   |
| `text-input.tsx`, `text-field/`, `text-area/`, `select/`, `search-bar/` | The text inputs; the field they share (prefix and suffix text, `counterMax`'s counter, and `secure`'s visibility toggle)                                                                                                   |
| `navigation.tsx`, `tabs/`, `navigation-bar/`, `navigation-rail/`        | Tabs and navigation, sharing one file                                                                                                                                                                                      |
| `list/`, `list-item/`, `menu/`, `dialog/`, `snackbar/`, `tooltip/`      | Lists and overlays: each surface, and the ready-made overlay (`snackbar/queue.tsx`: `useSnackbar`; `tooltip-overlay.tsx`, the trigger overlay the two tooltips share)                                                      |
| `progress.tsx`, `single-part.tsx`, and their subpaths                   | Progress indicators; avatar, icon, media, scrim, separator, supporting text, text                                                                                                                                          |
| `loading-indicator/`                                                    | `LoadingIndicator`: turns, drawn in its first shape with an SVG engine (React Native's keyframes carry no clip, so it doesn't morph) and as a circle without one                                                           |
| `tags-input/`                                                           | `TagsInput`: input chips in a text field (submit or the delimiter adds one, Backspace or its remove button removes one)                                                                                                    |
| `toast/`                                                                | `createToaster` (Zag's toast store) and `Toaster`, which shows its toasts in a column at its placement and times them itself; `useSnackbar`'s queue is the machines' `createQueue`, and each snackbar takes an `offset`    |
| `toolbar/`                                                              | `Toolbar`: icon buttons and buttons in a bar, the elements that don't fit in a `Menu` behind an overflow button                                                                                                            |
| `time-picker/`, `time-input/`                                           | `TimePicker` (a dial on the responder system, `adjustable` for assistive technology, or scroll fields) and `TimeInput` (number-pad fields): the time in state, through `@pureform/machines/time-picker`'s arithmetic       |
| `table/`                                                                | `Table`: views in flex rows with their table roles, sort headers and a checkbox column, the sort and selection in state through `@pureform/machines/table`'s arithmetic; `stickyHeader` doesn't stick (no sticky position) |
| `carousel/`                                                             | `Carousel`: a horizontal `ScrollView` snapping to each item, masks sized by `carouselItemSizes` as it scrolls, `page` scrolled to at once under reduced motion; no arrow keys                                              |
| `grid-list/`                                                            | `GridList`: Root (a list), `Tile` (`listitem`), `Content`, `Media` (an `Image`), `Header`, `Footer`, `Headline`, `Subhead`; compound only                                                                                  |

```
PureformProvider ── StylesProvider (rn-adapter) ── source: registry.entry(name).factory
       │                                            environment: scheme, theme, overrides,
       │                                            svg (the engine's), width, containers
       └── component ── useComponentSlots(name, selection, state)
                          ├─ engine.useStyles  → animated styles per slot (transitions run)
                          └─ useComponentState → plain selection (drawings, icon fills)

PureformProvider (root) ── PortalHost ── the app, then a layer over it:
                                          Portal entries sorted by [layer z-index, order], each in
                                          the provider it was declared under (menu, tooltip,
                                          snackbar queue); the dialog's Modal holds its own host

Pressable callbacks ── NativeInteraction ──emit──► InteractionSource ──► state → selection
                                                         │
                         indication (prop ?? provider ?? Material's)
                           ├─ tokens  → provider overrides / instance tokens
                           └─ native  → rendered last inside the anatomy's surface (the ripple)
```

## Public API

| Entry                                                                                       | Exports                                                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@pureform/react-native`                                                                    | The provider and its hooks, `useStyles`, `useStyleFactory`, `useIconStyle`, `Glyph`, `animated`, … |
| `@pureform/react-native/svg`, `/reanimated`, `/reanimated-svg`                              | `animatedSvg`, `reanimated`, `reanimatedSvg`                                                       |
| `@pureform/react-native/<component>` (`button`, `checkbox`, `radio-group`, `text-field`, …) | The component (`Button`, `Checkbox`, `RadioGroup` and `Radio`, …) and its props type               |

```tsx
import { Glyph, PureformProvider } from "@pureform/react-native";
import { Button } from "@pureform/react-native/button";
import { IconButton } from "@pureform/react-native/icon-button";
import { animatedSvg } from "@pureform/react-native/svg";

import { registry } from "./.pureform";

<PureformProvider registry={registry} engine={animatedSvg}>
    <Button label="Save" variant="tonal" onPress={save} />
    <IconButton
        aria-label="Favorite"
        defaultSelected={false}
        icon={<Glyph glyph="♥" />}
    />
</PureformProvider>;
```

- **Provider:** `registry`, `scheme` (the system's at the root), `theme` (a named theme, which
  combines with the outer providers' as on the web; runtime themes are web only and throw),
  `overrides` (by token key, for both schemes or
  `{ light, dark }`, merged over the outer provider's), `dir` (`I18nManager.isRTL` at the root;
  `"rtl"` puts `rtl` in every selection), `motion` (`"system"` follows `AccessibilityInfo`'s
  reduce motion setting and its `reduceMotionChanged` event), `defaults`, `engine`, `width` (the
  window's at the root), and `timeScale`. Everything is inherited.
- **Hooks:** `useStyles(name, selection)` gives `NativeSlots` (style, drawing, transitions,
  animation, parent, icon fill per slot), over the provider's defaults, with the direction and
  reduced motion added; the same selection returns the same frozen object.
  `useStyleFactory(name)` gives the entry's factory in the provider's environment. A lazy entry
  suspends both until it loads. `useComponentSlots<Part>(name, selection, state)` is what
  components use: the engine's animated styles, the plain selection, and each slot's views
  (`views.label.Text`); instance tokens are named as the component names them (`{ value: 40 }`)
  and tween.
- **Layers:** `useLayer(name)` gives the theme's z-index for a stacking layer (`zIndices.<name>`:
  `menu` 200, `scrim` 300, `dialog` 400, `snackbar` 500, `tooltip` 600), with the provider's
  overrides; `undefined` for a layer the theme doesn't name. See "Overlays stack from their
  wrapper" below.
- **Presence:** `usePresence(open, motion?)` gives an overlay its enter and exit through the
  engine, as the web's preset runs them (`motion`: `"popup"`, the default, for a menu, select
  list, tooltip, or snackbar; `"dialog"`; `"scrim"`): `{ present, style, props }`. It stays
  `present` after `open` turns false until the exit has run to its end, so render the overlay (or
  a `Modal`'s `visible`) from `present`, and give `style` and `props` to the engine's view that
  moves. `overlayMotion(name, tokens, reducedMotion, timeScale)` gives the frames and timings.
- **Portals:** `Portal` renders its children at the nearest `PortalHost`, in a layer over the
  page, sorted by the theme's z-index for its `layer` and then by the order each opened (a portal
  inside another sorts over it), keeping the provider it was declared under. The root
  `PureformProvider` holds a host; put your own around the provider to give it `insets` (the safe
  area's, which overlays keep clear of), or inside an app `Modal` whose content opens overlays.
  `placeOverlay` places a box against a trigger as the ready-made overlays do, `useDismiss(active,
dismiss)` closes the topmost on Escape or the back button, and `dismissTopOverlay()` is what an
  app `Modal`'s `onRequestClose` calls.
- **Icons:** icon parts provide `useIconStyle()` → `{ size, color, filled }` (`filled` is the
  slot's `FILL` axis, which selection returns beside the style). `Glyph` draws a text glyph in
  the slot's type and color, moving with it; a string given as an icon is drawn as one.
- **Indication:** the provider's `indication` (inherited) and each interactive component's
  `indication` prop pick how it shows hover, focus, and press: `materialIndication({ ripple })`
  (the default), `noIndication` (state layer opacities 0, no ripple, focus indicator kept), or the
  app's own (`defineIndication({ name, tokens, native })`). The provider's tokens join its
  overrides by theme path (`opacity.stateHover`, `sizes.focusIndicatorThickness`), under its own
  `overrides`; a prop's tokens, and the providers' `focusIndicatorColor`, join the component's
  instance tokens, under its `tokens`. Values are native: lengths are numbers. A `native` half is
  rendered last inside the anatomy's surface with `NativeIndicationProps` (the source, the
  surface's style and drawing, `centered`, `reducedMotion`, `dir`, the registry). Composites (tabs,
  navigation, menu, select, snackbar, radio group) take `indication` on the component and
  `interactionSource` per item.
- **Interaction sources:** each interactive component takes `interactionSource` (an item's goes in
  its item data); `useInteractionSource()` makes a stable one to share or observe, and
  `useInteractionState(source)` follows it. `useIndication(source, { centered, style, drawing })`
  gives an app's own `Pressable` the provider's indication: `{ surface, layer }`, the callbacks to
  spread and the layer to render last inside it. Focus is visible only when it doesn't follow a
  pointer press (one in progress, or one that ended under `FOCUS_AFTER_PRESS_MS`, 500 ms, ago),
  so a keyboard or TV remote shows the focus indicator and a touch doesn't.
- **Components:** variant props are `@pureform/binding-core`'s (`variant`, `color`, `size`, …),
  content props too where it has them (`label`, `icon`, `mirrorIcon`, `leadingIcon`, …).
  Controlled state follows Zag's shape: `checked` / `defaultChecked` / `onCheckedChange({ checked })`.
  Test ids are the anatomy's (`pf-button-root`), or `testId` as a prefix or per part.

## Build and test

- `build`: Vite library build into `dist/`, one bundle per entry (the root and the components
  never import react-native-svg or Reanimated; their engines' subpaths do).
- `test:unit`: Vitest in Chromium through React Native Web (`vitest.config.unit.ts`), with React
  Testing Library and type checks: the provider (direction, reduced motion from the system,
  overrides per scheme, inheritance; `nested-themes.spec.tsx`: themes for shape, density, and
  color combining, from a config with named themes), the hooks (the factory's result, one frozen
  object, suspending on a lazy entry, instance tokens by name), the components (test ids,
  controlled and uncontrolled state, the select's menu, icon fills, engines), and indication
  (`indication.spec.tsx`: the source from `Pressable`, the provider's default and tokens, the
  prop, a shared source, keyboard-only `focusVisible`, the ripple on every surface), rows
  (`rows.spec.tsx`: a `Profiler` on each row's surface shows which render again), and layers
  (`layer.spec.tsx`: the theme's z-index, and a wrapper lifting a menu over a later sibling where
  the menu's own z-index can't), portals (`portal.spec.tsx`: at the host, sorted by layer and order, the declaring
  provider carried through, an app's own host), overlays (`overlays.spec.tsx`, with both engines:
  placement, the menu, the snackbar queue, the tooltip, the modal dialog, and their stacking),
  views (`views.spec.tsx`: a list item's still slots are plain and
  its surface the engine's, with both engines, through a change of state; a moving slot still
  tweens; a factory without `moving` keeps every slot on the engine), and presence (`presence.spec.tsx`: the motions are the preset's;
  with each engine, the select's menu grows in and stays until it has faded out, reduced motion
  only fades, a reopened overlay enters again, the dialog and scrim, snackbar, and tooltip
  `open`), and the tabs' indicator (`tab-indicator.spec.tsx`, with both engines: it slides from
  the old tab partway and rests in place, primary and secondary, for a press, a key, and a
  controlled value; a change mid-slide starts from where it had got to; reduced motion changes at
  once; a resize keeps it aligned). Node-side commands (`src/testing/commands.ts`) precompute the
  preset's styles for a test registry.
- `apps/rn-web-demo`'s `test:e2e` renders the whole demo page from this package, and opens and
  dismisses each overlay.

## Worth knowing

- **Engines change hooks**, so each component starts over (`withEngine`, keyed by the engine's
  name) when the provider's engine changes: the app's state stays, a press in progress doesn't.
- **Overlays open over the page:** a menu or tooltip given a `trigger` renders the trigger in
  place and opens its surface through the portal host, against the trigger; `useSnackbar()` queues
  snackbars at the bottom; a dialog given a `trigger`, `onOpenChange`, or `defaultOpen` opens modal,
  in a `Modal` over a scrim. Each enters and leaves with the engine and closes itself as the web's
  does:

    ```tsx
    const snackbars = useSnackbar();

    <Menu
        items={items}
        onSelect={({ value }) => run(value)}
        trigger={(trigger) => (
            <IconButton {...trigger} aria-label="More" icon="⋮" />
        )}
    />
    <Tooltip
        supportingText="Save to drafts"
        trigger={(trigger) => (
            <IconButton {...trigger} aria-label="Save" icon="⎙" />
        )}
    />
    <Button
        label="Archive"
        onPress={() =>
            snackbars.show({ supportingText: "Archived", action: "Undo", onAction: undo })
        }
    />
    <Dialog
        trigger="Discard"
        headline="Discard draft?"
        actions={({ close }) => (
            <Button variant="text" label="Cancel" onPress={close} />
        )}
    >
        Your changes won't be saved.
    </Dialog>
    ```

    - **The menu** opens under its trigger at its start (`positioning`: `placement`, `gutter`
      8, `flip`, `sameWidth`), flipped where there's no room and shifted inside the host's insets.
      A press outside closes it (a layer under the menu takes that press, as a native popup does),
      as do picking an item (`closeOnSelect`), Escape, and Android's back button. On the web it
      focuses its first item; the arrow keys, Home, and End move focus, and Tab closes it.
    - **The tooltip** shows once the pointer rests on its trigger (`openDelay`, 400 ms), at once on
      keyboard focus, or on a long press, and hides as the pointer leaves (`closeDelay`, 150 ms), on
      blur, a press, Escape or back, or `LONG_PRESS_TOOLTIP_MS` (1.5 s) after a long press. Give
      the trigger the `onLongPress` it's given (the button, icon button, FAB, and chip take one), so
      a long press shows the tooltip rather than pressing. `RichTooltip` (`@pureform/react-native/rich-tooltip`,
      with `subhead`, `supportingText` and `actions`) replaces `variant="rich"`; it is interactive. Neither draws a
      caret here: the web's comes from Zag's positioner.
    - **The snackbar queue** is the nearest host's: one at a time, each for `duration` (5 s, `null`
      to stay), held while it's pressed or hovered, closed by its action, its close button, or
      `dismiss(id)`, with the reason in `onOpenChange`. It's a polite live region; VoiceOver is
      told the message.
    - **The dialog** uses a `Modal`, since it's modal: a window of its own on a device that takes
      the touches, the back button, and the screen reader, and that traps focus on the web. Its
      `Modal` holds a portal host, so a menu or tooltip opened inside draws over it, and Escape or
      back closes that first. A press on the scrim closes it, but not an `alertdialog`.
    - **Triggers say where they are** through the `interactionSource` they're given: the overlay
      measures the view the source last saw (`measureInWindow`), or opens at the press's point
      when a trigger doesn't emit.

    - **The full-screen dialog** is the same, in a `Modal` that fills the screen with no scrim:
      a header (a close icon button named by `closeLabel`, the headline, and the `confirmAction`,
      given a node or `({ close }) => node`) over a scrolling body (the children). Escape and
      back close it, as the dialog's do. Import it from `@pureform/react-native/fullscreen-dialog`.
    - **The bottom and side sheets** open the same way, in a `Modal` over a scrim, against the
      bottom edge or the end edge. A press on the scrim, Escape, or back closes them; so does
      the bottom sheet's drag handle (`dragHandleLabel`, "Close sheet"), on a press or a drag
      down past a quarter of its height, and the side sheet's close icon button (`closeLabel`).
      The side sheet's header takes a back button when given `onBack`, and an `actions` row
      under the content. With `modal={false}` (and, for the side sheet, `coplanar`) each is its
      surface, which the app places. The drag handle is a component of its own, a pressable
      pill. Import them from `@pureform/react-native/bottom-sheet`, `/side-sheet`, and
      `/drag-handle`.
    - **The toolbar** (`@pureform/react-native/toolbar`) takes its elements as `items`, as on
      the web: an icon button per element with an icon, a text button per element without.
      With `overflow`, it sits in a row as wide as its parent (centered in it: React Native
      can't measure the room a bar that hugs its content has otherwise), measures its elements
      by their layouts, and moves those that don't fit into the menu behind an overflow button
      ("⋮" unless given `overflowIcon`). It has no arrow-key focus moves.
    - **The autocomplete** (`@pureform/react-native/autocomplete`) is the select's field with an
      editable input: typing opens the suggestions `filter` keeps (`autocompleteMatches`) under
      it, through the portal host rather than a `Modal`, so the input keeps the keyboard; the
      trailing arrow opens or closes it. Choosing one sets `value` and the text (`inputValue`) to
      its label; a press outside, Escape, and back close it.
    - **The date pickers** have no date machine: their state and calendar come from
      binding-core's ISO-date helpers (`monthWeeks`, `weekdayLabels`, `chooseDate`, …), so the
      weeks match the web's for a locale. Each day is its own `calendarCell`. The modal
      **date picker** (`@pureform/react-native/date-picker`) opens from `trigger` in a `Modal`
      as the dialog does, its calendar holding a draft that OK commits and Cancel drops; the
      view trigger switches to a year list. The **docked date picker**
      (`@pureform/react-native/docked-date-picker`) is a field (the date as `formatDateText`
      writes it; typed text is read with `parseDateText` on blur or submit) whose calendar
      button opens the calendar under it through the portal host, with month and year lists.
      The **date input** (`@pureform/react-native/date-input`) is the picker's surface with a
      text field: `value` follows the text when it's a whole date. Arrow keys don't move
      between days.
    - **The search view** (`@pureform/react-native/search-view`) opens from its `trigger` (a
      read-only `SearchBar` showing the query, by default) in a `Modal`: a header (back, the
      query's input, clear), a divider, and the suggestions as menu items, or `children`.
      Choosing one calls `onSelect` and closes (`closeOnSelect`); the keyboard's submit calls
      `onSubmit`. `fullScreen` fills the screen; `docked` and `contained` sit over the trigger's
      measured place. The contained view's icons don't move as it opens (the web's keyframes).

    Without a trigger (or, for the dialog, `onOpenChange` and `defaultOpen`) each is its surface,
    as before: the app places it, and given `open` it enters and leaves in place. The select
    still opens its menu in a `Modal` under the field.

- **What overlays don't do yet:** an open menu or tooltip stays where it opened when the page
  scrolls under it. Only pureform's provider crosses a portal: read the app's own contexts outside
  and pass what the overlay needs in. The tooltip's text isn't the trigger's description for
  assistive technology (give the trigger its own `aria-label`). Safe areas need the app's insets
  (`<PortalHost insets={useSafeAreaInsets()}>`); the package adds no safe area dependency. A
  snackbar queued from inside a dialog shows in the dialog's host, over it; one queued outside
  shows under the dialog's `Modal` on a device.
- **Overlays move as on the web:** the preset's enter and exit keyframes are raw CSS on Zag's
  `data-state`, which React Native drops, so `presence.ts` holds the same motions (checked against
  the preset's in `presence.spec.tsx`) and runs them through the engine: a menu, select list,
  tooltip, or snackbar grows from 80% as it fades in (`short3`, emphasized decelerate) and fades
  out (`short2`, emphasized accelerate); a dialog comes down 48px as it fades in (`long2`) and
  goes back up as it fades out (`short3`); a scrim fades (linear). Every duration and curve is the
  theme's token, times the provider's `timeScale`. Under reduced motion each step that moves is a
  fade of the same timing, as the web's rule. The select's menu grows from its top left, as the
  web's grows from its positioner's origin, and its `Modal` closes once the menu has faded out
  (closing, it takes no presses). The menu, dialog, snackbar, tooltip, and scrim take `open`:
  with it they enter and leave and render nothing once gone; without it they're shown and still,
  as before. The engine reports each step's end (Animated's completion, Reanimated's
  `onCSSAnimationEnd`); an engine without `presence` shows and hides at once.
- **The tabs' content** is a view in each tab around its icon, label, and indicator
  (`pf-tabs-tab-content`), as on the web: a primary tab's indicator spans it (at least 24px), a
  secondary one the tab. A tab without a `label` shows only its icon, named by its `aria-label`;
  `inlineIcon` sets a primary tab's icon beside its label.
- **The tabs' indicator slides as on the web** (design doc §9.10): when the
  selection changes, from a press, a key, or a controlled `value`, the new tab's indicator is
  drawn over the old one's box and moves and resizes into place (a translation and a horizontal
  scale about its center), over the indicator's `transform` transition (`indicatorDuration`,
  medium1, and `indicatorEasing`, emphasized), times `timeScale`. The engine runs it: `useSlide`
  on `MotionEngine` (Animated with the native driver on a device; a Reanimated CSS keyframe
  animation). Where it differs from the web:
    - the boxes come from `onLayout` on each tab, its content, and its indicator, recorded as they
      lay out, so a selection made before the first layout (in the same frame as mounting) changes
      at once;
    - a change mid-slide starts from where the slide has got to by the clock (its curve at the
      time elapsed), not from a measured box, since neither engine reports its position to
      JavaScript cheaply; the two can differ by a frame;
    - a resize mid-slide finishes the slide from the old boxes, then rests in the new place (the
      web's does the same);
    - the sliding tab takes `zIndex: 1` from when it's selected, so its indicator draws over the
      tabs it crosses (React Native Web gives every view a stacking context); the web raises the
      indicator itself;
    - an engine without `useSlide` changes at once.
- **The select keeps its label:** when the picked item leaves `items`, the field still shows its
  label until the value changes, as Zag's select does on the web; a value no item has had shows
  nothing, and `null` clears it.
- **Overlays you place stack from their wrapper** (the ready-made ones are in the host's layer
  already): React Native's `zIndex` only orders a view among its
  siblings, and React Native Web gives every `View` `position: relative` and `z-index: 0`, so the
  layer a surface takes in its own style (the menu's 200, the dialog's 400) never lifts it out of
  the view it sits in. Put the layer on the overlay's outermost wrapper, the view that's a sibling
  of what it covers:

    ```tsx
    function Popup(props: { children: ReactNode }) {
        const zIndex = useLayer("menu");
        return (
            <View style={{ position: "absolute", top: 48, zIndex }}>
                {props.children}
            </View>
        );
    }
    ```

    A `Modal` (as the select's menu uses) draws over everything already, and on Android a sibling
    with a higher `elevation` can still draw over it.

- **The card's action area** (design doc §9.9): `Card` with `onPress` and plain children is one
  button, its text its label, as before. Beside `actions` or a `headerAction`, the ready-made card
  moves `onPress` to `Card.ActionArea`, a `Pressable` around the media, header, and content; the
  root is then a plain `View`, not `accessible`, so VoiceOver and TalkBack reach each control
  inside on its own, and the action area groups its own content into the card's one action. The
  root shows the action area's hover, press, and focus, and draws the ripple's layer last inside
  itself, over the whole card. Compose it yourself with `Card.Root` (`padded={false}`) around
  `Card.ActionArea`, `Card.Media`, `Card.Header` (`Avatar`, `HeaderText` with `Headline` and
  `Subhead`, `HeaderAction`), `Card.Content` (`SupportingText`), `Card.Actions`, and
  `Card.Footer`. Where it differs from the web:
    - no `href` or `as`: the action area is a button, or `role="link"` for one that leads
      somewhere, and Root acts only through `onPress`;
    - the root learns it has an action area when one mounts (one more render), since there's no
      server rendering to match;
    - a string in a view part (`Content`, `Footer`, `Actions`, …) is drawn as text, in the
      supporting text's style for the content and footer;
    - a card laid out in sections clips its content to its corners (`overflow: hidden`); that the
      `boxShadow` of an elevated card survives the clip on iOS and Android hasn't been checked on a
      device;
    - no `class`, `style`, or `slotProps` per part (React Native's components take none).
- **Lists:** `List` renders a `ListItem` per entry of `items`, each in an `item` view, and gives
  them its `density`, `color`, `tokens`, and `leadingType` (`icon`, `avatar`, `thumbnail`,
  `video`) unless an item sets its own. `variant="segmented"` sets the items apart as tiles, each
  item rounded by its `position` (`first`, `middle`, `last`, `single`), which a `ListItem` outside
  a `List` can take too. An item's `href` isn't followed; give it `onPress`. An item with a
  `region` is expandable: a button whose `⌄` indicator turns over, showing the region under it
  while `expanded` (`defaultExpanded`, `onExpandedChange`), React state rather than Zag's
  accordion. A `swipeAction`
  makes the item swipeable (`revealed`, `defaultRevealed`, `onRevealedChange`, `swipeWidth`; `actionColor="error"` for a destructive action): the
  row takes the drag (a `PanResponder`), so it isn't also pressable; the action is hidden from
  assistive technology until revealed. An item with a `region` doesn't swipe (it's a button, and
  ignores `swipeAction`). `Avatar` takes a `src` that shows once loaded
  (`onStatusChange`), its children the fallback.
- **Button groups:** `ButtonGroup` renders a `Button` per labelled entry of `items` and an
  `IconButton` per icon-only one, in its `size` and the buttons' `color`, `variant`, `corner` and
  `density`, each with its `position` (`single`, or its place in the run when `connected`).
  `selectable` (`single` or `multiple`) makes them toggles, with `value`, `defaultValue` and
  `onValueChange`; `Button` takes a controlled `selected` for it. There are no compound parts.
- **Chip sets:** `ChipSet` renders a `Chip` per entry of `items`, with the set's `variant`,
  `corner`, `color`, `density` and `tokens`. `selectable` (`single` or `multiple`, `deselectable`
  by default) makes them filter chips, with `value`, `defaultValue` and `onValueChange`.
  `singleLine` puts the row in a horizontal `ScrollView`, since `overflow: auto` is dropped.
- **Selection lists:** `SelectionList` is a `List` (`role="listbox"`) whose `items` are options:
  interactive `ListItem`s with `role="option"` and `aria-selected`. `selectionMode` is `multiple`
  by default, or `single` (`deselectable` lets its option go off). There's no keyboard highlight
  or typeahead, as there's no Zag machine on React Native.
- **Scrollable tabs:** `Tabs scrollable` sizes its tabs to their content and puts the row in a
  horizontal `ScrollView`, which scrolls the selected tab into view (centered where it can be)
  when the selection changes.
- **Menu items** take `supportingText`, a line under the label, and a `type` (`checkbox` or
  `radio`) with `checked` and `onCheckedChange`: a toggleable item fills while checked. `groups`
  render after `items`, each in an `itemGroup` with its optional label, and draw the menu as tiles
  (`grouped`) unless told otherwise; `vibrant` takes the tertiary colors. A select's items with a
  `group` sit together under its label, in the order each group first appears. An item with
  `items` opens a submenu, an arrow (`›`) at its end: React Native drills into it in place, under a
  row that goes back, where the web cascades it beside the item.
- **Navigation rail:** a destination's `sectionLabel` heads it and the ones after, shown only while
  the rail is `expanded`.
- **Split button and FAB menu:** `SplitButton` renders its two buttons as the `Menu`'s trigger
  (`trigger` as a function), so the menu opens over the page under the trailing button, at its
  end. `FabMenu` opens its items in the portal above the FAB, at its end; the `list` slot's
  logical insets, which place it on the web, are dropped there, since the portal places it.
- **Long lists:** each interactive `ListItem` takes about 0.4 to 0.5 ms to mount in development
  (its source, indication, and selection), so render long lists with `FlatList`, which mounts only
  the rows near the screen. Key rows by their value, not their index, memoize the row, and keep
  what it's given stable (`onOpen` here comes from a `useCallback` or the module), so scrolling and
  a parent's render don't render every row again:

    ```tsx
    const Row = memo(function Row(props: {
        mail: Mail;
        onOpen: (id: string) => void;
    }) {
        const { mail, onOpen } = props;
        return (
            <ListItem
                headline={mail.subject}
                supportingText={mail.from}
                onPress={() => onOpen(mail.id)}
            />
        );
    });

    function Inbox(props: {
        mails: readonly Mail[];
        onOpen: (id: string) => void;
    }) {
        return (
            <FlatList
                data={props.mails}
                keyExtractor={(mail) => mail.id}
                renderItem={({ item }) => (
                    <Row mail={item} onOpen={props.onOpen} />
                )}
            />
        );
    }
    ```

- **Still slots take plain views:** a slot renders with the engine's animated views only where
  the component's styles ever move it (a transition of a style property or a keyframe animation,
  in any variant or state: the factory's `moving`); the rest take React Native's own `View`,
  `Text`, `Pressable`, and `TextInput`, which mount for less. It's decided from the component, not
  its state, so a slot never swaps views (and remounts) on screen. A list item's surface tweens
  its background, so it stays animated; its content and lines are plain. A slot that never moves
  doesn't tween on a scheme change either, as before. An overlay given `open` moves its root
  with the engine's view. A `Glyph` is animated text only where its icon slot's style is
  animated.
- **Rows render with what changed:** the tabs', navigation's, menu's, and radio group's rows get
  only what they read, kept while the component renders with equal props (variants and tokens by
  value, callbacks through a stable function that calls the latest one). So a parent's render
  renders no row again unless `items` or a row's own props change, and a new value renders the
  rows it selects or unselects (every radio, which reads the group's value).
- **Keep the provider's props stable:** `registry`, `defaults`, `engine`, and `indication` are
  compared by identity, so define them once (at module level, or with `useMemo`;
  `materialIndication(options)` already gives the same object for the same options). An inline
  `defaults={{ … }}` makes a new provider value on every render, and every styled component under
  it renders again. `overrides` are compared by value, so an inline object is fine.
- **The ripple's color** is the surface's `color`, or the theme's `onSurface` for a surface that
  sets none (the controls' state layers), where the web's is `currentColor`. `"ink-sparkle"`
  draws the ink well: React Native has no sparkle.
- **Disabled shows no interaction:** a disabled component (or item) selects as idle even when a
  shared source is pressed, and ends what it had in progress. The navigation bar and rail take
  `disabled` for every destination, as on the web.
- **Focus stays with its surface:** a shared source carries presses and hover to every component
  on it, but each selects focus (and the focus indicator) from its own interaction alone.
- **The slider takes focus** and steps with the arrow keys (sideways by direction), Home, and End,
  and the `increment` and `decrement` accessibility actions. A range (`defaultValue={[20, 60]}`)
  moves the thumb nearest the press, and the keys move the last one dragged; `centered`, `stops`,
  `valueIndicator` and `orientation: "vertical"` match the web; `insetIcon` draws an icon in the
  active track (size `medium` up), or at the start of the inactive track when the active one is
  too short for it (the `overflowing` state). Each thumb and stop resolves its
  own styles with its own `value` token.
- **The time picker and time input** keep the time in state and step it with the web machine's
  arithmetic (`@pureform/machines/time-picker`), so 12/24-hour, periods and the dial's geometry
  match. The dial places its labels in percent of its box and doesn't mirror; touches pick the
  value under them. There is no keyboard on the dial beyond `accessibilityActions`.
- **The app bar** takes `scrollOffset` from the app: `useAppBarScroll()` returns it with an
  `onScroll` for the scroll view under the bar. The colours, collapse and search bar match the
  web; the headline's rise into a collapsed bar is web only (keyframes), so it changes at once.
- **The search bar** hears its root's hover and press and its input's focus (always visible, as a
  text field's), but has no indication entry, so no ripple.
- **A component's states are one set:** a component with two icons mirrors both when either is
  marked, and every slot sees the component's press and hover.
- **Nested themes combine:** a nested provider's `theme` sets what that theme changes from the
  base theme, over everything the outer providers' themes and overrides changed, as each theme's
  block nests on the web (the config emits only what differs from the base). So providers for
  shape, density, and color nest:
  `<PureformProvider theme="sharp"><PureformProvider theme="teal">…` draws sharp corners in
  teal. Inside, the inner theme's tokens win over the outer provider's `overrides` of the same
  tokens, and its own `overrides` win over both. The provider selects with the innermost theme
  and passes the rest as overrides, so precomputed styles recompute only the values those
  tokens reach.
- **Direction on a device is global:** React Native lays out the whole app by
  `I18nManager.isRTL`; a nested provider's `dir` changes what the styles read, not the layout.
- **No server rendering and no forms:** React Native has neither, so there's no hydration,
  `useLazyClassFactory` counterpart, or form reset.

## Navigation variants

`NavigationBar` takes `itemLayout="horizontal"`; `NavigationRail` takes `header`, `expanded`, and
`modal` (with `open`, `defaultOpen`, `onOpenChange`): a modal rail renders in a `Modal` over the
scrim, along the start edge; a press on the scrim or the back button closes it.
