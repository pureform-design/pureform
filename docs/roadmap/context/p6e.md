# p6e: Display (output context)

Commits: 5acf306..65e302c, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5acf306` | `feat(machines)`: the slider machine filled in (p1g's stub); its `todo` specs written                                                              |
| `65fd1a1` | `feat(binding-core)`: `components/{progress,slider,card,search-bar,ripple,avatar,media,separator,scrim,supporting-text,text,icon,touch-target}.ts` |
| `48108cf` | `feat(solid)`: 14 subpaths, `src/single-part.tsx`, `displayRegistry()` fixture, specs                                                              |
| `1097e34` | `feat(react)`: the same                                                                                                                            |
| `87c5113` | `test(component-suites)`: cases for all 14; optional `keyboard`, `themed: false`, direction and themes suite changes                               |
| `9e3e1ee` | `docs`: READMEs (machines, binding-core, solid, react, component-suites)                                                                           |
| `65e302c` | `docs(design)`: "Built (p6e)" in §8, §9.1, §9.4, §9.5, §9.6, §9.7                                                                                  |

"The rest" was every preset component (`@pureform/anatomy`'s `anatomy`) without a subpath after
p6d: avatar, media, search bar, supporting text, slider, linear and circular progress, separator,
card, scrim, ripple, icon, touch target, and text. With this phase every preset component has a
subpath in both bindings.

## Built

### Components (both bindings, same subpaths, parts, elements, and DOM order)

| Subpath (`@pureform/solid/…`, `@pureform/react/…`) | Export             | Parts (element)                                                                                           | Machine                         |
| -------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `linear-progress`                                  | `LinearProgress`   | `Root` (`div`, `role="progressbar"`), `Indicator` (`div`)                                                 | none                            |
| `circular-progress`                                | `CircularProgress` | `Root` (`div`, `role="progressbar"`), `EndHalf` > `EndArc`, `StartHalf` > `StartArc` (`span`)             | none                            |
| `slider`                                           | `Slider`           | `Root` (`div`), `Track`, `ActiveTrack`, `StateLayer`, `Handle` (`span`), `Input` (`input type="range"`)   | `@pureform/machines/slider`     |
| `card`                                             | `Card`             | `Root` (`div`, `a` with `href`, or `as`), `TouchTarget` (`span`, `aria-hidden`)                           | none                            |
| `search-bar`                                       | `SearchBar`        | `Root` (`label`), `Leading` (`span`, `aria-hidden`), `Input` (`input type="search"`), `Trailing` (`span`) | `@pureform/machines/text-field` |
| `ripple`                                           | `Ripple`           | `Root` (`span`, the layer); the `ripple` part is only the class of each ripple element                    | `@pureform/machines/ripple`     |
| `avatar`                                           | `Avatar`           | `Root` (`img` with `src`, else `span`)                                                                    | none                            |
| `media`                                            | `Media`            | `Root` (`img`, or `as="video"`)                                                                           | none                            |
| `separator`                                        | `Separator`        | `Root` (`hr`; another element gets `role="separator"`)                                                    | none                            |
| `scrim`                                            | `Scrim`            | `Root` (`div`, `aria-hidden`)                                                                             | none                            |
| `supporting-text`                                  | `SupportingText`   | `Root` (`span`)                                                                                           | none                            |
| `text`                                             | `Text`             | `Root` (`span`, or `as`)                                                                                  | none                            |
| `icon`                                             | `Icon`             | `Root` (`span`; an icon part: provides `useIconStyle()`)                                                  | none                            |
| `touch-target`                                     | `TouchTarget`      | `Root` (`span`, `aria-hidden`)                                                                            | none                            |

Part props: progress Root `progressRootProps(props)`; slider Root `getRootProps` with
`states: { pressed: api.dragging }`, Input `getInputProps` + the restore handler (Solid `onInput`,
React `onChange`); card Root `cardRootProps(props, element)`; search bar Root `getRootProps`,
Input `getInputProps` + `type: "search"` + restore, Leading `aria-hidden` + `mirrored`, Trailing
`mirrored`; ripple Root `getLayerProps`; avatar `avatarRootProps`, separator
`separatorRootProps(element)`, icon `iconRootProps` + `mirrored` state.

Ready-made props (multi-part: `class`/`className`, `style`, `slotProps` keyed by part; `testId`,
`unstyled` to Root):

- `LinearProgress`/`CircularProgress`: Root's (`value`, `min`, `max`, `indeterminate`, `color`,
  `tokens`, and the element's, `aria-label` included).
- `Slider`: Root's; `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-valuetext` go on
  the input.
- `Card`: Root's (`href`, `as`, `variant`, `interactive`, `disabled`) and children; renders
  `TouchTarget` first while interactive.
- `SearchBar`: Root's + `leading`, `trailing`, `mirrorLeading`, `mirrorTrailing`; `aria-label`,
  `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-expanded`, `aria-autocomplete`,
  `list` go on the input.
- `Ripple` and the single-part components: the export **is** Root (`Avatar.Root === Avatar`):
  their own props, `as`, and the element's own props with plain `class`/`className` and `style`.
  Avatar: `src`, `label` (alt, or the `role="img"` name; hidden without one), `size`, `color`,
  `shape`. Media: `aspect`, `shape`, and an `<img>`'s or `<video>`'s attributes. Separator: `inset`.
  Supporting text: `tone`. Text: `textStyle`. Icon: `size`, `color`, `filled`, `label`, `mirror`.
  Ripple: `disabled`, `effect` (`"ink-well" | "ink-sparkle"`), `centered`, `allowPropagation`,
  `getSurfaceEl`, `id`.

Internal: `packages/{solid,react}/src/single-part.tsx` exports `createSinglePart({ anatomy,
element(props), ownProps, selection(props), machine?(props, element), states?(props) })` → Root.
Fixtures: `displayRegistry()` in both bindings' `src/__fixtures__/registry.ts` (progress and
slider factories write the `value` token as `--value`). Specs: `slider/slider.spec.tsx`,
`linear-progress/linear-progress.spec.tsx` (both progress), `card/`, `search-bar/`, `ripple/`,
`avatar/avatar.spec.tsx` (every single-part component); 16 per binding.

### Contracts (`@pureform/binding-core/src/components/`)

```ts
// progress.ts
ProgressComponent = "linearProgress" | "circularProgress"; LinearProgressPart; CircularProgressPart
ProgressVariantProps<C> { indeterminate?: boolean, color, tokens }; ProgressValueProps { value?: number | null, min, max }
ProgressRootOwnProps<C>; PROGRESS_ROOT_PROPS
isIndeterminate(props)            // indeterminate ?? value == null
progressPercent(props)            // clamped percentage of min..max; 0 without a value or range
progressSelection(props)          // tokens.value = percent unless indeterminate; the instance's tokens win
progressRootProps(props)          // role progressbar, aria-valuemin/max, aria-valuenow (clamped) unless indeterminate

// slider.ts
SliderPart; SliderVariantProps { color, tokens }; SliderElementIds { root, input }
SliderBehaviorProps extends Controllable<"value", number> { min, max, step, disabled, readOnly, invalid, name, form, id, ids }
SliderRootOwnProps; SLIDER_ROOT_PROPS; SLIDER_INPUT_LABEL_PROPS
sliderSelection(props, percent)   // tokens: { value: percent, ...props.tokens }
sliderMachineProps(props); sliderNativeDefault(resetsTo, min) // String(resetsTo ?? min ?? 0)

// card.ts
CardPart; CardVariantProps { variant, interactive?: boolean, tokens }; CardRootOwnProps (+ disabled, testId, unstyled)
CARD_ROOT_PROPS; cardElement({ href, as }); isInteractiveCard(props, element); cardSelection(props, element)
cardRootProps(props, element)     // type=button on a button; disabled, else aria-disabled

// search-bar.ts
SearchBarPart; SearchBarVariantProps { tokens }; SearchBarElementIds { root, input }
SearchBarBehaviorProps extends Controllable<"value", string> { disabled, required, readOnly, placeholder, name, form, id, ids }
SearchBarRootOwnProps; SEARCH_BAR_ROOT_PROPS; SEARCH_BAR_INPUT_PROPS; SearchBarContentProps<Node>; SEARCH_BAR_CONTENT_PROPS
searchBarSelection(props); searchBarMachineProps(props) // the text field machine's; placeholder defaults to ""

// ripple.ts
RipplePart; RippleVariantProps { tokens }; RippleBehaviorProps { disabled, effect, centered, allowPropagation, getSurfaceEl, id }
RippleRootOwnProps; RIPPLE_ROOT_PROPS; rippleSelection(props); rippleMachineProps(props) // effect → variant, id → ids.layer

// avatar.ts, media.ts, separator.ts, scrim.ts, supporting-text.ts, text.ts, icon.ts, touch-target.ts
<Name>Part; <Name>VariantProps; <Name>RootOwnProps; <NAME>_ROOT_PROPS; <name>Selection(props)
avatarElement({ src, as }); avatarRootProps(props, element) // img: src, alt (label ?? ""); else role img + aria-label, or aria-hidden
separatorRootProps(element)       // {} on an hr, else role separator
textSelection(props)              // { style: props.textStyle }
iconRootProps(props)              // role img + aria-label with a label, else aria-hidden
```

Spec: `components/display.spec.ts` (16).

### Machines (`@pureform/machines/slider`, filled in)

Props as p1g's stub (`value`, `defaultValue` = `min`, `onValueChange`, `min` 0, `max` 100, `step`
1, `disabled`, `readOnly`, `invalid`, `name`, `form`, `ids { root, input }`, `dir`, `id`). States
`idle`, `dragging` (`POINTER.DOWN` on the input, guarded by not disabled and not read-only; ends on
`pointerup`/`pointercancel` anywhere on the window). Context `value` (bindable, `sync: true`),
`fieldsetDisabled`. Events `VALUE.SET`, `RESET { value }` (both clamp and snap through
`snapValue`, exported). Effect `trackFormControl` (fieldsets) on the input; a watch writes a value
from outside to the input. Api: `value`, `fraction`, `percent`, `dragging`, `disabled`, `setValue`,
`reset`, `focus`, `getRootProps` (`data-disabled`, `data-dragging`, `data-invalid`,
`data-readonly`), `getInputProps` (`type="range"`, `min`, `max`, `step`, the value as
`defaultValue`, `aria-invalid`, `aria-readonly`, `onPointerDown`, `onChange` ignored while
read-only). Spec: `slider.spec.ts` (8, no `todo` left).

No new dependencies; lockfile untouched.

### Suites (`tests/component-suites`)

Cases: `progress.ts` (`linearProgress`, `circularProgress`), `slider.ts`, `card.ts`,
`search-bar.ts`, `static.ts` (`avatar`, `media`, `separator`, `scrim`, `supportingText`, `text`,
`icon`, `touchTarget`, `ripple`); all in `COMPONENT_NAMES`, both scenes, and `COMPONENTS`.

- Slider: `value` 40 → 50 by a click in the middle of the input; `read` checks the root's value
  token (any custom property ending in `value`) against the input; forms (submits `volume=40`,
  resets, `invalid`); keys Enter and Space nothing, Home → 0, End → 100; arrows ltr Right/Up +1,
  Left/Down −1, rtl Left +1, Right −1 (Chromium's own).
- Search bar: `""` → `"a"`; forms with `required`; keys `a`, Space (`to: " "`), Enter nothing.
- Card: `as: "button"`; Enter and Space click.
- The rest have no `state` or `keyboard`.

Suite changes:

- `ComponentCase.keyboard` is optional: without it the keyboard suite checks "Tab passes over it".
- `ComponentCase.themed: false` skips "draws differently in teal" and the runtime-theme cases
  (text, touch target, scrim, ripple).
- Direction: a component with no `[data-pf-part]` inside its root is measured by its root's box
  in its host, and the host takes `dir` too (an inline component sits where its block's direction
  puts it); every animation under the root is paused at 300 ms before measuring.
- Themes: "draws as under the attribute set by hand" measures both scenes in hosts with
  `pointer-events: none` (the full-width slider sat under the resting pointer, and its state
  layer was measured mid-transition).

## Deviations from the design

- **Progress has no machine** (§8 says "own"): it has no state a user changes, so the contract's
  `progressRootProps` and `progressSelection` are all of it. Without `value` (or with `null`) it's
  indeterminate; `indeterminate` overrides.
- **Single-part components are Root alone**, with plain `class`/`className` and `style`, not a
  ready-made with slot-keyed props: there's only one slot to key.
- **The text's `style` variant group is the prop `textStyle`**: `style` is the element's.
- **The search bar runs the text field machine** (the design doesn't name one) with its own
  contract; it has no `error`, `invalid` styling, or supporting text (no preset slot).
- **The search bar's `Trailing` isn't `aria-hidden`** (unlike the list item's): it can hold icon
  buttons. A button inside the `<label>` Root is technically nonconforming HTML; the preset's
  markup is a label.
- **The ripple's timing and sparkle tuning aren't props**: binding-core doesn't depend on
  `@pureform/js-effects`; time it through the ripple's tokens (the layer's transition).
- **The slider marks a drag as the root's `pressed` state** (`data-pf-active`) from the machine's
  `dragging`; `:active` already covers the pointer.

## Stubs and gaps

- **No range slider** (two thumbs), no tick marks or value label (the preset has no slots).
- **No `required` on the slider** (a range input can't be missing a value).
- **The scrim and touch target can't be checked for themes** (`themed: false`); the scrim's color
  is the same in every theme.
- **Ripple isn't wired into the button, chip, and other pressables**; apps put `<Ripple />` inside
  them. Its own spec covers a press; the suites only check its markup.
- **Demos not updated** (as after p6a to p6d): the demos still draw these components with
  `useClasses`.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests`.

## How to verify

- `task_run` `build` + `test:unit` over the workspace: pass except the pre-existing rn-parity case
  (`browser-e2e-tests`' `test:e2e`, 440 of 441).
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 13140 passed, 294 skipped (six
  projects).
- New components only: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run -t 'Slider|Progress|Card|SearchBar|Avatar'`.
- Unit: `cd packages/solid && bun x vitest --config vitest.config.unit.ts run src/slider
src/linear-progress src/card src/search-bar src/ripple src/avatar` (16 per binding, the same in
  `packages/react`); machines `src/slider`; binding-core `src/components/display.spec.ts`.
- Suites type-check: `bun x tsc --noEmit -p tests/component-suites/tsconfig.json` (after building
  `@pureform/react`).

## Notes for the next phases (p7, p8)

- **Every preset component now has a subpath** in both bindings; p7's pruning can map component
  imports (`@pureform/solid/<kebab-name>`) one to one onto registry entries, except the overlays,
  select, and dialog, which also draw other entries (menu, scrim, button).
- **A component whose root is its only part** (avatar, icon) has no inner part for the direction
  suite to mirror; its host is the frame. Inline components need the block around them to carry
  `dir`, which an app's page does.
- **Indeterminate progress animates under reduced motion** (p1b leaves it); anything measuring
  boxes must pause animations (`getAnimations({ subtree: true })`).
- **A full-width component lies under the resting pointer**: measure colors in a host with
  `pointer-events: none`.
- **The slider's value token is a percentage** (0 to 100) whatever `min` and `max` are; React
  Native (p8) should set it the same way from the machine's `percent`.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
