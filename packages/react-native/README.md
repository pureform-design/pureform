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

- **Depends on:** `@pureform/anatomy` (part names and test ids), `@pureform/binding-core`
  (provider nesting, selections from props, controllable state, icon style types), and, as
  peers, `@pureform/styling` (the registry) and `@pureform/rn-adapter` (the factories' runtime,
  the hooks that select and animate, and the engines' drawing). Both peers are core-train
  packages the app's generated glue imports too, so the app and the binding share one copy.
- **Depended on by:** `apps/rn-web-demo`.
- No Zag: React Native has no DOM for its machines. Components track their own press, hover,
  and focus through `Pressable`, and controlled state through `useControllable`.

See the [design doc](../../docs/design/component-architecture.md), §5.1, §5.3, §5.8, §5.9,
and §9.6.

## Architecture

| Module                                                                  | What it holds                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                          | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`, `useEngine`                            |
| `styles.ts`                                                             | `useStyles`, `useStyleFactory` (the registry's hooks), `useComponentSlots`, `useSelectedStyles` (what components use) |
| `engine.ts`, `engines/`                                                 | `MotionEngine` and the engines: `animated` here, `animatedSvg`, `reanimated`, `reanimatedSvg` at their subpaths       |
| `icon-style.tsx`                                                        | `useIconStyle`, `IconSlot` (what an icon part provides), `Glyph` (a text glyph as an icon)                            |
| `parts.tsx`                                                             | `usePress`, `useInk` and `withInk` (ripples), `useControllable`, `withEngine`, `testIdOf`                             |
| `button/`, `chip/`, `icon-button/`, `fab/`, `card/`                     | One subpath each: the component's file and its `index.ts`                                                             |
| `checkbox/`, `switch/`, `radio-group/`, `slider/`                       | Controls                                                                                                              |
| `text-input.tsx`, `text-field/`, `text-area/`, `select/`, `search-bar/` | The text inputs; the field they share                                                                                 |
| `navigation.tsx`, `tabs/`, `navigation-bar/`, `navigation-rail/`        | Tabs and navigation, sharing one file                                                                                 |
| `list-item/`, `menu/`, `dialog/`, `snackbar/`, `tooltip/`               | Lists and surfaces                                                                                                    |
| `progress.tsx`, `single-part.tsx`, and their subpaths                   | Progress indicators; avatar, icon, media, scrim, separator, supporting text, text                                     |

```
PureformProvider ── StylesProvider (rn-adapter) ── source: registry.entry(name).factory
       │                                            environment: scheme, theme, overrides,
       │                                            svg (the engine's), width, containers
       └── component ── useComponentSlots(name, selection, state)
                          ├─ engine.useStyles  → animated styles per slot (transitions run)
                          └─ useComponentState → plain selection (drawings, icon fills)
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
- **Icons:** icon parts provide `useIconStyle()` → `{ size, color, filled }` (`filled` is the
  slot's `FILL` axis, which selection returns beside the style). `Glyph` draws a text glyph in
  the slot's type and color, moving with it; a string given as an icon is drawn as one.
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
  suspending on a lazy entry, instance tokens by name), and the components (test ids,
  controlled and uncontrolled state, the select's menu, icon fills, engines). Node-side
  commands (`src/testing/commands.ts`) precompute the preset's styles for a test registry.
- `apps/rn-web-demo`'s `test:e2e` renders the whole demo page from this package.

## Worth knowing

- **Engines change hooks**, so each component starts over (`withEngine`, keyed by the engine's
  name) when the provider's engine changes: the app's state stays, a press in progress doesn't.
- **Overlays are surfaces:** the menu, dialog, snackbar, and tooltip render their surface; when
  and where they show (a `Modal`, a timer) is the app's. The select is the exception: it opens
  its menu in a `Modal` under the field.
- **A component's states are one set:** a component with two icons mirrors both when either is
  marked, and every slot sees the component's press and hover.
- **Direction on a device is global:** React Native lays out the whole app by
  `I18nManager.isRTL`; a nested provider's `dir` changes what the styles read, not the layout.
- **No server rendering and no forms:** React Native has neither, so there's no hydration,
  `useLazyClassFactory` counterpart, or form reset.
