# @pureform/binding-web

The web half of pureform's bindings, shared by `@pureform/solid` and `@pureform/react`:
web-specific contracts and everything that needs a DOM type or API to compile or run.
`@pureform/binding-core` holds the platform-free half and type-checks without the DOM lib;
React Native imports only that, and its
tests check that neither `@pureform/react-native` nor `@pureform/rn-adapter` imports this package.

## Where it sits

```
@pureform/binding-core   (no framework, no DOM)
                 │
@pureform/binding-web    (this package; no framework)
                 │
@pureform/solid, @pureform/react   (hooks and components)
```

It's in the core (`cog.toml`'s `core`). Apps don't import it: the web bindings
re-export what an app needs (the built-in indications, for one).

## What goes here

Web-specific policy, even when pure (such as the class/style slot customization resolver), and
anything that needs a DOM type or API: reading computed styles and layout, observers, pointer
drags and swipes, Web Animations, runtime themes as `<style>` blocks, the indication host, and the
props only the web has. Pure logic (controllable state, settle and spring rules, menu groups and
drill picks, tokens, the provider, the interaction state) stays in binding-core, and so do
platform-neutral props: a link's `href` (without `target`/`rel`) and pureform's own `style`,
token and `target` props.

## Architecture

| Module                                                                                                                  | What it holds                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                                                                                                              | The root entry: reduced motion, measuring an icon slot, checkbox, radio and text inputs kept in step, stacking positioners, scroll, the slider's inset icon, file inputs, and the modules below |
| `components.ts`                                                                                                         | The web-only props of the components' contracts, as extensions of binding-core's, and the FAB menu's keys                                                                                       |
| `slot-props.ts` | Pure resolution of web-only keyed customization, with lazy instance data; tracking and rendering belong to each framework binding |
| `web-theme.ts`                                                                                                          | Runtime themes' `<style>` blocks, overrides as vars, and when to generate or keep the server's block                                                                                            |
| `sheet-drag.ts`, `side-sheet-drag.ts`, `sideways-drag.ts`, `toast-swipe.ts`, `drag-click.ts`                            | Drags and swipes over pointer events                                                                                                                                                            |
| `settle.ts`, `list-item-swipe-settle.ts`, `splitter-release.ts`                                                         | Settling a released element on its spring transition, from the release's speed                                                                                                                  |
| `menu-drill-motion.ts`, `menu-groups.ts`, `menu-submenu-room.ts`                                                        | The menu's drill motion, group edges, and a submenu's room                                                                                                                                      |
| `collapse.ts`, `reveal.ts`, `slide.ts`, `scroll-focus.ts`, `carousel-row.ts`, `toolbar-dom.ts`, `tooltip-long-press.ts` | Collapsing, revealing in a row, the sliding indicator, focusable overflow, the carousel's row, the toolbar's overflow and focus, the tooltip's long press                                       |
| `indication.ts`                                                                                                         | The `/indication` entry: `Indication<HTMLElement>`, `IndicationTarget` and `defineIndication` for the web, and re-exports the two modules below                                                 |
| `indication-material.ts`                                                                                                | Material's web half (the ripple, over `createRipple` from `@pureform/js-effects`): `materialIndication`, `webIndication`, `DEFAULT_INDICATION`                                                  |
| `indication-host.ts`                                                                                                    | `IndicationHost`: ties an anatomy's indication entries to a component's elements, runs the effect after mount, and tracks forwarded hover and press                                             |

## Public API

### Slot customization boundary

`slot-props.ts` resolves the web ready-made components' keyed `slotProps`, class, style, and
`unstyled` channels for one part. React normalizes `className` to the resolver's `class` channel;
each binding still owns class/style/handler merging. This is a web contract, not the contract
for React Native hosts or native styles, and does not extend `binding-core`.

The resolver uses `binding-core`'s platform-neutral `createSlotReader` for keyed lookup and lazy
instance resolution. The channel names, normalization, and `unstyled` rules remain web policy.
Its instance argument is a lazy function, evaluated at most once per
resolution and only when a channel is a function of the repeated part's copy. It does not scan
or evaluate other parts. The binding owns when resolution happens: a Solid live merge or a React
render. Ref attachment, icon contexts, indication layers, host selection, and optional content
lifetimes stay in the framework bindings.

### `@pureform/binding-web`

```ts
systemReducedMotion(): boolean;
subscribeReducedMotion(onChange): () => void;  // calls at once, then on each change
readIconStyle(element): IconStyle;             // font-size, color, the FILL axis
observeIconStyle(element, onChange): () => void;
syncCheckedInput(input, checked);              // a native checkbox back to the machine's state
radioInputs(group): HTMLInputElement[];        // a radio group's native radios
syncRadioInputs(group, value);                 // the radios back to the group's value
setRadioDefaults(group, value);                // each radio's default, written only when it differs
syncTextInput(input, value);                   // a text input or text area back to its value
stackPositioner(positioner, surface): () => void; // the surface's z-index as the positioner's (the
                                               // dialog's), in the next frame; returns its cancel
slideIndicator(from, to): Animation | undefined; // the tabs' new indicator, in from the old one's
                                               // box (a Web Animation of transform, FLIP), timed
                                               // by its transform transition (design doc §9.10)
transformTiming(style); slideTransform(fromRect, toRect); // its timing and starting transform

// Runtime themes and overrides
themeCss(selector, { light, dark }): string;   // light vars, then dark ones under the scheme conditions
themeSelector("data-theme", "pf-1x2y3z");      // '[data-theme="pf-1x2y3z"]'
overrideVars({ "colors.primary": "red" }, registry); // { "--colors-primary": "red" }, the target's names
interface ThemeBlock { scope; vars; css }      // what a provider holds for a runtime theme
initialThemeBlock(theme, registry, { hydrate, server, existing }): ThemeBlock;
needsThemeLoad(block, hydrate): boolean;       // load the generator after mount?
generateThemeVars(theme, registry);            // sync, once the generator is loaded
loadThemeVars(theme, registry): Promise<ThemeSchemeVars>;
generatedBlock(theme, registry, vars): ThemeBlock;
serverThemeCss(scope): string | undefined;     // the server's block in the page (Solid's or React's)
THEME_BLOCK_ATTRIBUTE;                         // "data-pf-theme", on Solid's block
THEME_PRECEDENCE;                              // "pureform", React's precedence for the block
unloadedThemeMessage(theme);                   // the server rendered before the generator loaded
```

`syncCheckedInput` is for after a click: the browser toggles the input before the machine hears
of it, so a controlled checkbox whose owner ignores the change would otherwise show the toggle.

`observeIconStyle` re-reads after an attribute changes anywhere in the icon's component (its
`data-scope` root), after a transition there ends, and when the slot resizes.

```ts
revealInRow(item); // scrolls an item's scrolling row, never the page
dragToDismiss(handle, sheet, dismiss, onClose?, asker?, { partial?, opening?, onRest? }); // drag a sheet by its handle; closes it, or with `partial`, moves it between partly and fully open (re-placed on a resize); returns stop, with stop.rest(rest) for a controlled `expanded`; dismiss(kept) calls kept once rendered if the app kept it open
sideSheetDragToDismiss(sheet, rtl, dismiss, onClose?, asker?, draggable?); // a touch or pen drags a side sheet toward its edge (pan-y keeps vertical scroll native); closes it or settles it back; returns stop
settleTransition(element, property, distance, velocity); // starts an element's spring transition at a release's speed (core's springFromCurve + sampleSpring's `velocity`)
settleOnSpring(elements, property, spring, distance, velocity); // the same on a given spring (the splitter's panes on SPLITTER_SETTLE)
focusableWhileOverflowing(element);      // tabindex="0" only while its content overflows (the bottom sheet's body)
markMenuGroupEdges(content);             // marks a menu's first and last groups data-first/data-last, from DOM order; a group's data-pf-first/data-pf-last (its explicit first/last) wins
swallowNextClick(row);                   // drop the click a drag ends with
whenAnimationsEnd(element, done);        // done once every animation running on it ends (at once with none); returns what stops waiting
subscribeScroll(target, onOffset); scrollOffsetOf(target); type ScrollTarget // an app bar's scroll
```

### Web-only props

Each extends binding-core's contract; the bindings type their Root with both.

```ts
interface DialogFocusProps { initialFocusEl?: () => HTMLElement | null; finalFocusEl?: () => HTMLElement | null }
DIALOG_FOCUS_PROPS; dialogFocusMachineProps(props); // every overlay on the dialog machine (the bindings' dialogParts)
interface PopoverFocusProps;                         // initialFocusEl may return false
interface PopoverDomRootOwnProps; POPOVER_DOM_ROOT_PROPS; popoverDomMachineProps(props);
searchViewDomDialogProps(props, input);              // searchViewDialogProps, with the input taking focus
interface RippleDomProps { getSurfaceEl?: (layer: HTMLElement) => HTMLElement | null }
interface RippleDomRootOwnProps; RIPPLE_DOM_ROOT_PROPS; rippleDomMachineProps(props);
type FileUploadDomBehaviorProps;                     // FileUploadBehaviorProps<File>
type FileUploadDomRootOwnProps; FileUploadDomValueDetails; FileUploadDomContentProps<Node>;
fabMenuListProps(content, getFab);                   // Tab from the last item to the FAB; focus follows the highlight
```

### `@pureform/binding-web/indication`

Exports `Indication`, `IndicationTarget` and `defineIndication` over `HTMLElement`: binding-core's
are generic over the platform's element (`Indication<E>`), so loading this entry changes nothing
for a program that also has React Native.

```ts
materialIndication(options?): Indication;      // binding-core's, with the web half: draws Material's
//   ripple in the layer from the source's presses (its controller made on the first press; none
//   under reduced motion). The same object for the same options.
webIndication(indication): Indication;          // binding-core's Material indications with their web
                                                // half; any other as given (the host applies it)
DEFAULT_INDICATION;                             // materialIndication()
indicationRoles(entries, part); // [{ entry, role: "trigger" | "surface" | "state" }], cached
surfaceLayer(surface): HTMLElement | undefined; // the surface's `:scope > [data-ripple-layer]`
class IndicationHost {          // one per component
    configure(indication, registry): void;
    instance(entry, source): IndicationInstance; // one per surface and source
}
class IndicationInstance {
    attach(role: "trigger" | "surface" | "state", element): () => void;
    subscribeForwarded(listener: (states: { hover; pressed }) => void): () => void;
}
```

A forwarded hover or press is one whose emit's origin isn't one of the surface's own elements
(its trigger, surface, or the element it marks states on): another component sharing the
source, or the app emitting with no element. Focus is never forwarded.

The bindings attach only the trigger, the surface, and the state element. The layer stays in the
markup (server HTML and hydration unchanged), but nothing tracks it as it mounts: the effect starts
once the trigger and surface are there, and the target's `layer` finds it in the surface when the
ripple draws, at a press. So a surface doesn't render again once its layer mounts.

## Building and testing

- `task_run` `build` on `@pureform/binding-web`: Vite library build, two entries (`index`,
  `indication`), with declarations.
- `task_run` `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`),
  with type checks. A browser command, `emulateReducedMotion`, flips the media query
  (`src/testing/commands.ts`).
