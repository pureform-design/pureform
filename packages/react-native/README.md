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

| Module                                                                  | What it holds                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                          | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`, `useEngine`                                |
| `styles.ts`                                                             | `useStyles`, `useStyleFactory` (the registry's hooks), `useComponentSlots`, `useSelectedStyles` (what components use)     |
| `engine.ts`, `engines/`                                                 | `MotionEngine` and the engines: `animated` here, `animatedSvg`, `reanimated`, `reanimatedSvg` at their subpaths           |
| `icon-style.tsx`                                                        | `useIconStyle`, `IconSlot` (what an icon part provides), `Glyph` (a text glyph as an icon)                                |
| `interaction.ts`                                                        | `useInteractionSource`, `useInteractionState`; `NativeInteraction` (Pressable's callbacks → the source), focus visibility |
| `indication.tsx`, `indication-tokens.ts`                                | `materialIndication` (with its native ripple), `useIndication`; each component's `useSurfaceIndication` (internal)        |
| `parts.tsx`                                                             | `useControllable`, `withEngine`, `testIdOf`                                                                               |
| `layer.ts`                                                              | `useLayer`: a stacking layer's z-index from the theme, for an overlay's wrapper                                           |
| `button/`, `chip/`, `icon-button/`, `fab/`, `card/`                     | One subpath each: the component's file and its `index.ts`                                                                 |
| `checkbox/`, `switch/`, `radio-group/`, `slider/`                       | Controls                                                                                                                  |
| `text-input.tsx`, `text-field/`, `text-area/`, `select/`, `search-bar/` | The text inputs; the field they share                                                                                     |
| `navigation.tsx`, `tabs/`, `navigation-bar/`, `navigation-rail/`        | Tabs and navigation, sharing one file                                                                                     |
| `list-item/`, `menu/`, `dialog/`, `snackbar/`, `tooltip/`               | Lists and surfaces                                                                                                        |
| `progress.tsx`, `single-part.tsx`, and their subpaths                   | Progress indicators; avatar, icon, media, scrim, separator, supporting text, text                                         |

```
PureformProvider ── StylesProvider (rn-adapter) ── source: registry.entry(name).factory
       │                                            environment: scheme, theme, overrides,
       │                                            svg (the engine's), width, containers
       └── component ── useComponentSlots(name, selection, state)
                          ├─ engine.useStyles  → animated styles per slot (transitions run)
                          └─ useComponentState → plain selection (drawings, icon fills)

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

- **Provider:** `registry`, `scheme` (the system's at the root), `theme` (a named theme; runtime
  themes are web only and throw), `overrides` (by token key, for both schemes or
  `{ light, dark }`, merged over the outer provider's), `dir` (`I18nManager.isRTL` at the root;
  `"rtl"` puts `rtl` in every selection), `motion` (`"system"` follows `AccessibilityInfo`'s
  reduce motion setting and its `reduceMotionChanged` event), `defaults`, `engine`, `width` (the
  window's at the root), and `timeScale`. Everything is inherited.
- **Hooks:** `useStyles(name, selection)` gives `NativeSlots` (style, drawing, transitions,
  animation, parent, icon fill per slot), over the provider's defaults, with the direction and
  reduced motion added; the same selection returns the same frozen object.
  `useStyleFactory(name)` gives the entry's factory in the provider's environment. A lazy entry
  suspends both until it loads. `useComponentSlots(name, selection, state)` is what components
  use: the engine's animated styles, and the plain selection; instance tokens are named as the
  component names them (`{ value: 40 }`) and tween.
- **Layers:** `useLayer(name)` gives the theme's z-index for a stacking layer (`zIndices.<name>`:
  `menu` 200, `scrim` 300, `dialog` 400, `snackbar` 500, `tooltip` 600), with the provider's
  overrides; `undefined` for a layer the theme doesn't name. See "Overlays stack from their
  wrapper" below.
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
  overrides per scheme, inheritance), the hooks (the factory's result, one frozen object,
  suspending on a lazy entry, instance tokens by name), the components (test ids,
  controlled and uncontrolled state, the select's menu, icon fills, engines), and indication
  (`indication.spec.tsx`: the source from `Pressable`, the provider's default and tokens, the
  prop, a shared source, keyboard-only `focusVisible`, the ripple on every surface), and layers
  (`layer.spec.tsx`: the theme's z-index, and a wrapper lifting a menu over a later sibling where
  the menu's own z-index can't). Node-side
  commands (`src/testing/commands.ts`) precompute the preset's styles for a test registry.
- `apps/rn-web-demo`'s `test:e2e` renders the whole demo page from this package.

## Worth knowing

- **Engines change hooks**, so each component starts over (`withEngine`, keyed by the engine's
  name) when the provider's engine changes: the app's state stays, a press in progress doesn't.
- **Overlays are surfaces:** the menu, dialog, snackbar, and tooltip render their surface; when
  and where they show (a `Modal`, a timer) is the app's. The select is the exception: it opens
  its menu in a `Modal` under the field.
- **Overlays stack from their wrapper:** React Native's `zIndex` only orders a view among its
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

- **Long lists:** each interactive `ListItem` takes about 0.7 to 1 ms to mount in development
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
  and the `increment` and `decrement` accessibility actions.
- **The search bar** hears its root's hover and press and its input's focus (always visible, as a
  text field's), but has no indication entry, so no ripple.
- **A component's states are one set:** a component with two icons mirrors both when either is
  marked, and every slot sees the component's press and hover.
- **Direction on a device is global:** React Native lays out the whole app by
  `I18nManager.isRTL`; a nested provider's `dir` changes what the styles read, not the layout.
- **No server rendering and no forms:** React Native has neither, so there's no hydration,
  `useLazyClassFactory` counterpart, or form reset.
