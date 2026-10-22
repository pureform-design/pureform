# @pureform/preset

Material components as pureform specs, and `pureform()`, which builds a full config from theme
providers. The examples below use the Panda recipes the adapter generates; each slot is a
class on one element.

```ts
// panda.config.ts
import { defineConfig } from "@pandacss/dev";
import { pureform } from "@pureform/preset";
import { compilePreset } from "@pureform/panda-adapter";

export default defineConfig({ presets: [compilePreset(pureform())] });
```

## Choosing components

`pureform({ components })` receives the resolved theme and the defaults. Return the defaults
to keep everything, leave some out, or add your own:

```ts
pureform({
    components: ({ defaults }) => ({ ...defaults, ripple: undefined }),
});
```

Every component token is a CSS var with a default from the theme, for example
`--components-button-radius`. Set it on the component or any ancestor to restyle it at runtime.

Changing a component's slots, `structure`, or icon slots changes its anatomy: run
`@pureform/anatomy`'s `generate` task afterwards, or its drift test fails.

## States

Components read their states from the element: the native state first (`:hover`, `:checked`,
`:disabled`, a focused input), then ARIA (`aria-checked`, `aria-selected`, `aria-pressed`,
`aria-current`, `aria-expanded`, `aria-invalid`, `aria-disabled`), and only where neither
covers it pureform's own attributes: `data-pf-hover`, `data-pf-active` (a keyboard press),
`data-pf-dragging`, and `data-pf-filled` (a value outside a text input). Mark states with
these; a behavior library's attributes, such as Zag's `data-state="checked"` or
`data-selected`, don't style anything.

## Indication

Every interactive component shows Material's state layer (a tint of its content color while
hovered, focused, pressed, or dragged) and focus indicator (a ring outside it on keyboard focus),
from seven component tokens: `stateHoverOpacity`, `stateFocusOpacity`, `statePressedOpacity`,
`stateDraggedOpacity`, `focusIndicatorThickness`, `focusIndicatorOuterOffset`, and
`focusIndicatorColor` (`--components-button-stateHoverOpacity`, …). Each defaults to the theme's
value (the state contract's opacities, its focus indicator's 3px and 2px, and `secondary`), and
each component's base sets them back to the theme's on its root. So a provider's theme values
reach every component, and a component's own tokens change it but not a component of the same
kind nested inside it.

The ring sits outside by default. A theme draws it inside every component instead (Compose's
inset focus ring) with `state: materialState({}, {}, { focusRing: "inset" })`, base or named;
that only moves the theme's outer offset to minus the thickness, so components need nothing.

A custom component takes the same tokens with the exported pieces: spread `INDICATION_TOKENS`
into its tokens and into its root's `tokens`, and draw its state layer with
`stateLayer(ref, { base, content })`, `ref` being its own token reader.

Each interactive component also declares where it shows indication (its spec's `indication`):
the slot that takes the interactions, the slot the state layer tints and a ripple fills, whether
the ripple is centered, and the slot that draws the focus indicator. `@pureform/anatomy` writes
it into each component's anatomy, and a spec checks that each declared surface draws the state
layer. The search bar draws a state layer but no indication: its field draws its own indicator.
A state layer that follows another slot (`slotStateLayer`: the controls, the icon button, the
FAB, navigation) has no drag state, so their `stateDraggedOpacity` is declared but unread.

## Reduced motion

Under reduced motion, components stop moving but keep fading: a switch handle, a radio dot, a
floating label, a navigation indicator, a shape morph, and a progress value change at once,
while their colors, opacity, and elevation (`box-shadow`) still ease over the motion tokens.
Indeterminate progress keeps spinning, since that motion is the only sign of work going on.
The web follows the system's `prefers-reduced-motion`, which a `data-pf-motion="reduce"` or
`"full"` attribute on an ancestor overrides (the bindings' provider writes it); React Native
follows its provider's `reducedMotion`.

Specs build their transitions with the helpers in `components/shared.ts`:

- `STATE_TWEENS` and `stateTransition`: the state colors and elevation. They move nothing, so
  they run under reduced motion too.
- `tweens(...properties)`: those properties over `short3` on the standard curve.
- `motionTransition(...parts)`: any parts; under reduced motion the ones that move drop out
  (`transitionMoves` from `@pureform/core` decides), and none left is `none`. `tweens` and
  shape morphs build on it.

## Overlays: stacking and motion

The menu (and so a select's list), tooltip, dialog, scrim, and snackbar each stack at a layer of
the theme's stacking scale (`zIndex(name)` from `@pureform/theme`, lowered to `--z-index-<name>`
and Panda's `zIndex` tokens), so an open overlay draws over the page around it:

| Layer      | Default | Who                                                           |
| ---------- | ------- | ------------------------------------------------------------- |
| `base`     | 0       | the page                                                      |
| `raised`   | 100     | what an app places over its content: app bars, nav bars, FABs |
| `menu`     | 200     | `menu`'s root, and so a select's list                         |
| `scrim`    | 300     | `scrim`'s root, a dialog's backdrop                           |
| `dialog`   | 400     | `dialog`'s root                                               |
| `snackbar` | 500     | `snackbar`'s root, once the app places it                     |
| `tooltip`  | 600     | `tooltip`'s root                                              |

`z-index` only applies to a positioned element. The bindings render each surface in Zag's
positioner, which takes the surface's `z-index` (Zag's popper does for the menu, select, and
tooltip; the bindings' `stackPositioner` for the dialog's fixed positioner). A theme changes the
scale through its layout (`materialLayout({ zIndices: stack([...]) })`).

They animate on Zag's `data-state` (`components/overlay.ts`): the enter's keyframes while it's
`open`, the exit's once it's `closed`, holding the last frame until the binding hides the
overlay once the exit ends (Zag's presence). Every duration and curve is a motion token:

The movement runs on one of the theme's spatial springs and the fade alongside it on an effects
spring, as Compose's do: two animations per step (`fade` on an `OverlayMotionStep`).

| Overlay                    | Enters                                                                               | Leaves                                                           |
| -------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| menu, select list, tooltip | grows from 80% on `spatialFast` from the side it opens on; fades in on `effectsFast` | shrinks back to 80% on `spatialFast`; fades out on `effectsFast` |
| snackbar                   | grows from 80% on `spatialFast` from its center; fades in on `effectsFast`           | shrinks back to 80% on `spatialFast`; fades out on `effectsFast` |
| dialog                     | comes down 48px on `spatialDefault`; fades in on `effectsFast`                       | goes back up on `effectsFast`; fades out on `effectsFast`        |
| bottom and side sheet      | slides in from its edge on `spatialDefault`; fades in on `effectsFast`               | slides back out on `effectsFast`; fades out on `effectsFast`     |
| scrim                      | fades in on `effectsDefault`                                                         | fades out on `effectsDefault`                                    |

The springs are Compose's: its menu, tooltip and snackbar host scale between 80% and full size on
`FastSpatial` and fade on `FastEffects`, both ways (`Menu.kt`, `Tooltip.kt`, `SnackbarHost.kt`);
its sheets and drawers show on `DefaultSpatial` and hide on `FastEffects`, and its modal bottom
sheet fades the scrim on `DefaultEffects` (the dialog, which has no motion of its own in Compose,
follows the sheets). A bottom sheet let go of after a drag settles back on `spatialDefault`
(`SHEET_SETTLE`, a transition of the `translate` the drag sets). A toast moves and resizes in its
stack on `spatialFast` and fades on `effectsFast`. Under reduced motion only the fades run, on
their springs.

The menu follows Compose's `DropdownMenu` (scale and fade) rather than material-web's height
reveal: a transform and opacity need no layout, and reduced motion keeps the fade alone. Under
reduced motion every moving step gives way to its fade (`overlayFadeIn`, `overlayFadeOut`) alone.
The keyframes are `OVERLAY_KEYFRAMES` and `SHEET_KEYFRAMES`, which `pureform()` adds to the
config; `overlayMotion` and the `*_MOTION` steps build a surface's styles. The rules are web-only
(`rawRules.css`); `@pureform/react-native` runs the same motions through its engine.

## Direction

Components follow the writing direction (`dir="rtl"` on an ancestor on the web, the `rtl`
state on React Native) without anything set on them. Specs use logical properties
(`insetInlineStart`, `paddingInline`, `borderInlineEndColor`), which flip on their own. Where
there's no logical form, the style says so with the `rtl` condition:

- The switch's handle and state layer sit on `insetInlineStart` and center on it with a
  translation that flips under `rtl`.
- The indeterminate linear progress runs `linearProgressSlide`, or `linearProgressSlideRtl`
  under `rtl`; both are in `PROGRESS_KEYFRAMES`.

`src/direction.spec.ts` guards this: it fails on a physical horizontal style (`left`, `right`,
`marginLeft`, `borderTopLeftRadius`, `translateX`, a `left` keyword, …) in any component, the
base styles, or the keyframes. It lets through symmetric uses (`left: 0` with `right: 0` or
`width: 100%`, centering with `left: 50%` and `translate(-50%, …)`), anything under an `ltr` or
`rtl` condition (a `when("rtl", …)` value, a `states.rtl` block, keyframes only such an
animation names), and the entries in its `ALLOWED` list, each with a reason. Today that's the
ripple, placed from pointer coordinates. To allow a new exception, add an entry there.

Not everything should flip: a check mark doesn't point. The checkbox draws it with its inline-end
border, swapped to the inline-start one under `rtl`, so the stroke stays on the physical right.

The native input of the checkbox, radio, switch, and slider resets its margins, since the
browser's defaults are physical and would shift it off the control.

An icon that points (a back arrow, a chevron) flips under `rtl` when marked with
`data-pf-mirror` (`STATE_ATTRIBUTES.mirrored`): every icon slot and the standalone `icon` take
`scaleX(-1)` then, after their own transform. Most icons don't point; leave them unmarked.

## Icons

pureform ships no icons. An icon slot (`iconBox` in `components/shared.ts`) sizes its content
with `width`, `height`, and `font-size`, and the component sets its color, so an svg with
`width="1em" height="1em" fill="currentColor"` or an icon font fits.

For icon fonts such as Material Symbols, every icon slot also sets the `FILL` axis,
`font-variation-settings: "FILL" <fill>`, from its component's `iconFill` token (`0` by
default; `--components-<name>-iconFill` restyles it at runtime). The states Material draws
filled switch to a second token:

| Component                         | State                                        | Token              |
| --------------------------------- | -------------------------------------------- | ------------------ |
| `navigationBar`, `navigationRail` | the current destination (`aria-current`)     | `activeIconFill`   |
| `iconButton`                      | selected (`aria-pressed="true"` on a toggle) | `selectedIconFill` |

`font-variation-settings` is one property, so the slot's `FILL` replaces axes an app sets on an
ancestor; set other axes (`wght`, `opsz`) on the icon element itself. An svg ignores the axis.
React Native drops it (it has no variable font axes).

## Density

Density makes controls more compact (or roomier), a grid unit off a component's height per
step. Material's steps are `"0"` to `"-3"`; declare your own on the layout provider, in grid
units from `-3` up, and pick the theme's step by name:

```ts
pureform({
    layout: materialLayout({
        densities: { comfortable: 1, default: 0, compact: -1, dense: -3 },
        density: "default",
    }),
    themes: {
        dense: {
            layout: materialLayout({
                densities: {
                    comfortable: 1,
                    default: 0,
                    compact: -1,
                    dense: -3,
                },
                density: "dense",
            }),
        },
    },
});

button({ density: "compact" }); // "inherit" (the default) follows the theme
```

The steps become each dense component's `density` variant, so a named theme can pick another
step but can't declare different ones. A step named `inherit`, or below `-3`, where layouts
stop holding up, is rejected. Each step adds CSS to every dense component, so declare only the
ones you use.

Dense components: `button`, `iconButton`, `chip`, `inputChip`, `checkbox`, `radio`, `textField`,
`textArea`, `tagsInput`, `select`, `listItem`, and `menu`. The text area has no fixed height, so its steps
move its paddings, label, and minimum height. Buttons, chips, and controls keep their full touch target; list and
menu items shrink with no touch target, so keep dense menus for pointer layouts.

## Buttons

`button`, `iconButton`, and `fab` take `color` (any color group) and `variant`. Put the touch
target first, and render the icon slot only when there is an icon.

```html
<button class="{root}" type="button">
    <span class="{touchTarget}"></span>
    <span class="{icon}">★</span>
    <span class="{label}">Save</span>
</button>
```

`iconButton` and `fab` draw their fill in a `container` slot, which can take a shape (see
[Shapes](#shapes)), so their content goes inside it. An outlined icon button also renders the
`outline` slot:

```html
<button class="{root}" type="button" aria-label="Favorite">
    <span class="{touchTarget}"></span>
    <span class="{container}"><span class="{icon}">★</span></span>
    <span class="{outline}"></span>
</button>
```

- `button` also has an optional `secondaryIcon` slot, such as a dropdown arrow, with its own
  `secondaryIconSpacing` token on top of the gap. `secondaryIconPosition` is `end` (the default)
  or `start`: render the slot on that side of the label.
- `button`: `variant` is `filled`, `tonal`, `outlined`, `text`, or `elevated`; `size` is
  `small`, `medium`, or `large`.
- `iconButton`: `variant` is `standard`, `filled`, `tonal`, `outlined`, or `elevated`. Give it
  an `aria-label`. For a toggle icon button, set `toggle: "true"` and `aria-pressed`: it rests
  in Material's unselected colors and takes the selected ones, with its icon filled, while
  `aria-pressed="true"`.

| `variant`  | Unselected                                    | Selected                                         |
| ---------- | --------------------------------------------- | ------------------------------------------------ |
| `standard` | `onSurfaceVariant` icon, no container         | the group's color for the icon                   |
| `filled`   | `surfaceContainerHighest`, group color        | the group's color, `on` color (as untoggled)     |
| `tonal`    | `surfaceContainerHighest`, `onSurfaceVariant` | the group's container colors (as untoggled)      |
| `outlined` | outline, `onSurfaceVariant` icon              | `inverseSurface`, `inverseOnSurface`, no outline |
| `elevated` | as untoggled                                  | the group's color, `on` color                    |

- `fab`: `variant` is `tonal`, `filled`, or `surface`; `size` is `small`, `medium`, or
  `large`. Set `extended` and render the label for an extended FAB.
- `splitButton` (M3 Expressive): `leadingButton` and `trailingButton` 2px apart, round outside
  and with small inner corners that round further while pressed; `trailingIcon` turns over and
  the trailing button rounds all over while it's `aria-expanded`. `variant` is `filled`,
  `tonal`, `outlined`, or `elevated`; `size` is the button's `xsmall` to `xlarge`; `color` and
  `density` as the button's. Render the menu component under the trailing button.
- `fabMenu` (M3 Expressive): `closeTrigger` is the FAB (`size` `default`, `medium`, `large`),
  which turns into a round close button in the group's main color while `aria-expanded`;
  `list` (the menu's content) sits above it at its end through logical insets, holding `item`
  pills (`itemIcon`, `itemLabel`) in the group's container color. `color` takes any group.

## Shapes

`iconButton`, `fab`, `avatar`, and `media` take `shape`: `none` (the default, rounded corners) or one of
the theme's shapes, which clips the container to it.

```ts
iconButton({ variant: "tonal", shape: "cookie9Sided" });
fab({ shape: "sunny" });
```

The shapes default to Material's expressive set, `MATERIAL_SHAPES`: `circle`, `square`,
`slanted`, `arch`, `fan`, `arrow`, `semiCircle`, `oval`, `pill`, `triangle`, `diamond`,
`clamShell`, `pentagon`, `gem`, `sunny`, `verySunny`, `cookie4Sided`, `cookie6Sided`,
`cookie7Sided`, `cookie9Sided`, `cookie12Sided`, `ghostish`, `clover4Leaf`, `clover8Leaf`,
`burst`, `softBurst`, `boom`, `softBoom`, `flower`, `puffy`, `puffyDiamond`, `pixelCircle`,
`pixelTriangle`, `bun`, and `heart`. They are ported from Compose, with every rounding drawn as
a circular arc.

Replace or extend them with `pureform({ shapes })`. Core's builder draws a shape in a unit
square, and its fit decides how it scales with the box:

```ts
import { defineShape, fitted, normalize, px, star } from "@pureform/core/ast";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";

pureform({
    shapes: {
        ...MATERIAL_SHAPES,
        badge: defineShape(normalize([star(6, 0.7, 0.1)])),
        // Keep the cookie's scallops 48px wide on an extended FAB.
        wideCookie: fitted(MATERIAL_SHAPES.cookie9Sided, {
            fit: "fixed",
            size: px(48),
        }),
    },
});
```

- `stretch` (the default, as in Compose): the shape follows the box's aspect ratio.
- `contain`: the shape keeps its aspect ratio at `size`, centered.
- `fixed`: points near an edge keep their distance from it at `size`, and the middle stretches,
  like a 9-slice, so features keep their size on a wide box. A box smaller than `size`
  stretches instead.

How it works: a clip cuts away everything outside it, so the root keeps the focus ring, the
touch target, and the elevation, cast as drop shadows that follow the shape. An outlined icon
button's `outline` slot is clipped to a ring along the shape, 1px wide, exact on straight edges
and close on curves. Browsers without `shape()` (Firefox, for now) keep the rounded corners.
Each shape a page uses adds about 1 to 2 kB of CSS, so avoid `staticCss: ["*"]` for these
components unless you show every shape.

### Morphing

`morph(from, to)` makes a shape that changes into another while pressed, settling on the
`effectsDefault` spring (Compose's buttons and icon buttons morph without bounce); under reduced motion the shape changes at once and the colors still
fade. It redraws both as the same number
of curves, running the same direction from the closest starting points, which is what lets
the browser animate between them.

```ts
import { morph } from "@pureform/core/ast";

pureform({
    shapes: {
        ...MATERIAL_SHAPES,
        cookieToCircle: morph(
            MATERIAL_SHAPES.cookie9Sided,
            MATERIAL_SHAPES.circle,
        ),
    },
});
iconButton({ shape: "cookieToCircle" });
```

### Badge

`badge` is Material's small (a dot, 6px) and large (a short label or count, 16px high) badge in the
error color; `size` picks one. It is styling only. It flows inline by default; `placement:
anchored` positions it at the top end corner of its nearest positioned parent, so put it inside a
navigation bar or rail `icon`, or a tab's `tabContent` (all three are positioning contexts). Give
a count `role="img"` and an `aria-label`, or leave a dot `aria-hidden`.

```html
<span class="{icon()}"
    >✉<span class="{badge({ placement: 'anchored' })}">3</span></span
>
```

### Avatar

`avatar` shows a picture, initials, or an icon in a color group's container, `small` (24px),
`medium` (40px), or `large` (56px). It is a slot recipe: the `root` (give it `role="img"` and an
`aria-label`) holds the `image`, which crops to fill, and the `fallback` (initials or an icon)
that shows until the picture has loaded and when it fails; Zag's avatar machine (the bindings')
hides one or the other with `hidden`, so neither sets `display`. An avatar isn't interactive, so
its root takes the clip directly.

```html
<span
    class="{avatar({ size: 'large', shape: 'sunny' }).root}"
    role="img"
    aria-label="Ada Lovelace"
>
    <img class="{avatar().image}" src="…" alt="" />
    <span class="{avatar().fallback}">AL</span>
</span>
<span
    class="{avatar({ color: 'tertiary', shape: 'cookie9Sided' }).root}"
    role="img"
    aria-label="Ada Lovelace"
    >AL</span
>
```

### Media

`media` is a picture or video that fills its container's width, cropped to fill, at an
`aspect` of `auto` (the default, the content's own), `square`, `landscape` (16:9), or
`portrait` (3:4). Put it in a card or a list item to give it artwork: the media takes the
shape, while the card stays rectangular and its text unclipped. A shape stretches to the
media's aspect; to keep its proportions, pass the shape with a `contain` fit in
`pureform({ shapes })`.

```html
<img class="{media({ aspect: 'landscape' })}" src="…" alt="" />
<img
    class="{media({ aspect: 'square', shape: 'cookie9Sided' })}"
    src="…"
    alt="Album art"
/>
```

### Corner shape

The shape provider's `corner` sets how every rounded corner curves: `round` (the default),
`squircle`, `bevel`, `scoop`, `notch`, or `square`. `pureform()` sets `cornerShape` wherever a
component rounds a corner, and borders, outlines, and shadows follow it. Browsers without
`corner-shape` (only Chromium has it so far) keep round corners.

Named themes can set their own corner. Then each rounded component reads its corner from a
`corner` token, which each theme sets, so the corner changes with the theme; an app can also
set the token itself, for example `--components-card-corner: bevel` on one section.

```ts
pureform({ shape: materialShape({}, { corner: "squircle" }) });
```

## Chip

A chip is `outlined` or `elevated`. Mark a filter chip with `aria-pressed="true"`, or a
selected option with `aria-selected="true"`; `color` sets the selected colors.

`corner` is `square` (the default, the medium radius) or `round`. A chip tightens its corners
while pressed, and a filter chip that sets `toggle: "true"` swaps them once selected, as the
button's toggle does. An optional `trailingIcon` slot after the label (a dropdown arrow) has its
own `trailingIconSize` and `trailingIconSpacing`.

```html
<button class="{root}" type="button" aria-pressed="true">
    <span class="{touchTarget}"></span>
    <span class="{icon}">✓</span>
    <span class="{label}">Filter</span>
    <span class="{trailingIcon}">▾</span>
</button>
```

## Search view and autocomplete

`searchView` is the surface a search bar opens into: a `header` (`leading`, `input`, `trailing`,
which hold icon buttons) over a `divider` and the `content` (the suggestions, drawn with the
menu's item parts). `variant`: `fullScreen` (default) fills its positioner over the viewport;
`docked` drops over the search bar's place with the large corners; `contained` (M3 Expressive)
is docked with the header kept as a pill, no divider, and its icons travel outward as it opens
(keyframes `searchViewFromEnd`/`searchViewFromStart`, web only; still under reduced motion).
The search bar's `scrolled` variant takes the app bar's scrolled container colour (its lift on
scroll). It grows with its container up to its `maxWidth` token (720px, M3 Expressive's).

`autocomplete` is the select's field (affixes, icons, colour, density) over an editable
combobox input: no pointer cursor, the arrow turns while the suggestions are open. The
suggestions are the `menu` component's items and groups.

## Date pickers

Three components share a calendar (`calendar.ts`): `CALENDAR_TOKENS`, `calendarParts(ref)`
(`controls`, `prev`, `next`, `weekdays`, `weekday`, `grid`, `week`, `yearList`, every row a flex
row of `cellSize` cells), and `pickerChrome(ref)` (the dialog-like pickers' `root`, `header`,
`headline`, `selectedDate`, `modeToggle`, `divider` and `actions`, over `PICKER_TOKENS`, named apart
from a text field's own tokens).

- `calendarCell`: one day, month or year, its own component as a list item is the list's, since
  a slot's variants would be the picker's. `root` is the cell (it draws a chosen range's band),
  `trigger` the circle or pill. `view` (day, month, year) sets the sizes; `selection` (`none`,
  `selected`, `rangeStart`, `rangeMiddle`, `rangeEnd`), `today` and `outside` set tokens only: the
  0%/100% flags `selected`, `ranged` and `today`, which the trigger's colours mix in through
  `colorMix`, and today's outline width. No two groups set one property (Panda orders variant
  classes by name), and there are no compounds. Days outside the month are hidden
  (`outsideOpacity`, 0).
- `datePicker`: the modal picker's surface (the dialog's content): header, divider, controls
  (`viewTrigger`, `prev`, `next`), weekdays and grid, `yearList`, actions. Extra-large corners,
  level 3, the dialog's layer and motion. No variants.
- `dockedDatePicker`: the text field (built with `affixField`, outlined with the trailing icon by
  default; 1 compound, the field's) and the calendar's popup `content` (large corners, level 3,
  the menu's layer and motion) with `monthButton`, `yearButton`, `prev`, `next`, the grid,
  `monthList` and `yearList`.
- `dateInput`: the modal date input: the header and actions of `pickerChrome`, and the text field
  under a `field` wrapper whose `input` is a group of `segment`s. The field variants' root tokens
  stay on the surface's root; the outlined label's notch takes the picker's container.

## Input chip and tags input

`inputChip` is Material's input chip, split from `chip` (it adds `avatar` and an interactive
`remove`): outlined, filled with the secondary container when `aria-selected="true"`, with the
chip's `corner`/`toggle` morph, `color` and `density`. The avatar, icon and remove button pull
themselves to Material's insets (4, 8 and 8) with negative margins, so no variant says which are
rendered. The remove button is its own indication surface. The chip has no `variant`: input chips
are only outlined.

`tagsInput` is the text field (filled or outlined, `leadingIcon`, `trailingIcon`, `color`,
`density`) whose container is a wrapping row: an `inputChip` per value, then the input, which
grows to fill the line. Mark the container filled (`data-pf-filled`) while it holds a chip so the
label floats; the bindings do. Tags aren't edited in place.

```html
<div class="{tagsInput.root}">
    <div class="{tagsInput.container}" data-pf-filled>
        <div class="{inputChip.root}">
            <span class="{inputChip.touchTarget}"></span>
            <span class="{inputChip.avatar}"><img src="ada.png" alt="" /></span>
            <span class="{inputChip.label}">Ada</span>
            <button class="{inputChip.remove}" aria-label="Remove Ada">
                ×
            </button>
        </div>
        <input class="{tagsInput.input}" id="to" placeholder=" " />
        <label class="{tagsInput.label}" for="to">To</label>
    </div>
</div>
```

## Text field and text area

The input needs a placeholder (a single space when none should show) so CSS can tell when it
holds a value, and the label comes after it. Mark an error with `aria-invalid="true"` on the
input; the label, icons, and supporting text follow it.

```html
<div class="{root}">
    <div class="{container}">
        <span class="{leadingIcon}">🔍</span>
        <input class="{input}" id="name" placeholder=" " />
        <label class="{label}" for="name">Name</label>
    </div>
    <span class="{supportingText}">Helper or error text</span>
</div>
```

- `variant` is `filled` or `outlined`; `color` sets the focus color.
- Turn on `leadingIcon` or `trailingIcon` when you render one. The icons stay centered on the
  container's height, as in Material's own text field.
- `textArea`: use a `<textarea>` with `rows`, or turn on `autoGrow` to grow it with the text.
  The textarea sits between its icons, so its scrollbar and resize handle stay clear of them.
- Prefix and suffix text (`textField` and `select`): render a `prefixText` before the input or a
  `suffixText` after it, and turn on the variant of the same name. They show once the label
  floats; the input hands them its inline padding (the `prefixed`/`suffixed` flag tokens).
- Counter (`textField` and `textArea`): put a `counter` after the supporting text in the root,
  a wrapping row; it sits at the end of the supporting text's line and follows the field's
  error colour, so mark the input invalid when the count is over the limit.
- `secure` (`textField`): a password field. The trailing icon is a `<button>` that shows or
  hides the text; the variant draws it without button chrome and with a focus ring.
- Removed: the `supportingRow` part (breaking). It held the supporting text and the counter
  while core had no `flexWrap`; the root now wraps, so both sit in the root directly.

## Select

A text field whose read-only combobox input picks from a menu, with the arrow as its trailing
icon. Mark the input `aria-expanded="true"` while the menu is open (the arrow turns over), and
render the `menu` component below it. Opening, closing, and choosing are yours to wire.

```html
<div class="{root}">
    <div class="{container}">
        <input
            class="{input}"
            id="size"
            role="combobox"
            aria-expanded="false"
            readonly
            placeholder=" "
            value="Medium"
        />
        <label class="{label}" for="size">Size</label>
        <span class="{trailingIcon}">▾</span>
    </div>
</div>
```

## Selection controls

`checkbox`, `radio`, and `switchControl` lay a native input over the control, so forms, the
keyboard, and screen readers work unchanged. `color` sets the checked colors.

```html
<!-- checkbox: the marks draw themselves; set input.indeterminate for the dash -->
<label class="{root}">
    <span class="{touchTarget}"></span>
    <input class="{input}" type="checkbox" />
    <span class="{box}">
        <span class="{checkIcon}"></span>
        <span class="{indeterminateIcon}"></span>
    </span>
</label>

<!-- radio: share a name across the group -->
<label class="{root}">
    <span class="{touchTarget}"></span>
    <input class="{input}" type="radio" name="size" />
    <span class="{ring}"><span class="{dot}"></span></span>
</label>

<!-- switchControl -->
<label class="{root}">
    <span class="{touchTarget}"></span>
    <input class="{input}" type="checkbox" role="switch" />
    <span class="{track}">
        <span class="{stateLayer}"></span>
        <span class="{handle}"><span class="{icon}">✓</span></span>
    </span>
</label>
```

## Lists and menus

List items and menu items share one row: an optional leading icon, the text, and an optional
trailing icon or text. Mark a selected row with `aria-selected="true"` (a toggleable menu item
with `aria-checked="true"`).

```html
<ul class="{list.root}">
    <li class="{list.item}">
        <div class="{root}" tabindex="0">
            <span class="{leading}">★</span>
            <div class="{content}">
                <span class="{overline}">Overline</span>
                <span class="{headline}">Headline</span>
                <span class="{supportingText}">Supporting text</span>
            </div>
            <span class="{trailingText}">100+</span>
        </div>
    </li>
</ul>

<div class="{root}" role="menu">
    <div class="{itemGroup}" role="group" aria-labelledby="edit">
        <span class="{itemGroupLabel}" id="edit">Edit</span>
        <button class="{item}" role="menuitem">
            <span class="{itemLeading}">✂</span>
            <span class="{itemContent}">
                <span class="{itemLabel}">Cut</span>
                <span class="{itemSupportingText}">To the clipboard</span>
            </span>
            <span class="{itemTrailingText}">⌘X</span>
        </button>
    </div>
</div>
```

- `list`: the `ul` (`root`) and an `li` (`item`) per list item, with the list's padding and
  container color. `variant: "segmented"` sets the items apart as tiles with a 2px gap; give
  each item its `position`.
- `listItem`: `lines` is `one`, `two`, or `three`. Set `interactive` when the item is
  clickable; it then takes a state layer and the focus ring. `leadingType` sizes the leading
  part for an `icon` (default), an `avatar` (40, round), a `thumbnail` (56) or a `video`
  (114 by 64). `position` (`first`, `middle`, `last`, `single`) is its place among a segmented
  list's tiles: the run's outside corners take the theme's `large` radius, the inside ones
  `extraSmall`, and the tile fills with `surfaceContainer`. `positionCorners` in `list.ts`
  builds those corners for any run of tiles.
- `menu`: items are always interactive. Put items in `itemGroup`s with an optional
  `itemGroupLabel` (a select's option groups use the same parts), or separate them with the
  `separator` component. `grouped` draws each group as its own tile, 2px apart; the menu clips
  the run's outside corners to its `large` radius, so a group needs no position. `vibrant`
  swaps the menu to the tertiary container's colors, and a chosen item to the tertiary's. The
  label always sits in `itemContent`, with `itemSupportingText` under it when there is some.
- `buttonGroup` (`button-group.ts`): a row of buttons or icon buttons, spaced by its `size`
  (18, 12, then 8 from medium up), or 2px apart when `connected`. The buttons carry the shape:
  `button` and `iconButton` take a `position` (`none` by default). `single`, for a standard group,
  widens a button by `pressedGrowth` while pressed; `first`, `middle` and `last`, for a connected
  group, keep the button's own morphing corners on the run's outside and give the inside ones
  `innerRadius` (`pressedInnerRadius` while pressed, round once a toggle is on), per size from
  `GROUP_INNER_RADII`. `groupCorners` builds those corners along the inline axis. The connected
  group replaces the deprecated segmented button. No compound variants are added.
- `chipSet` (`chip.ts`): a row of chips 8px apart (`gap`) that wraps, or with `singleLine`
  stays on one line and scrolls (React Native wraps it in a horizontal scroll view). Its
  selection is the binding's: a selectable set's chips are toggle chips (`aria-pressed`).
- `tabs` `scrollable`: tabs size to their content (at least `scrollableMinWidth`, 90px) rather
  than share the list's width, and the list scrolls with `edgePadding` (52px) at its edges.
- `color` (both): a group's container fills the selected row. With no color, a selected row
  keeps Material's secondary container.

## Search bar

A pill holding a leading icon, the input, and trailing icons. Focus anywhere in it shows the
focus ring on the whole bar.

```html
<label class="{root}">
    <span class="{leading}">⌕</span>
    <input class="{input}" type="search" placeholder="Search" />
    <span class="{trailing}">⋮</span>
</label>
```

## App bar

`appBar` is the strip at the top of a screen: `leading` (the navigation button), `content`
(`headline` and `subtitle`, or a search bar) and `trailing` actions, in one wrapping row. The
leading and trailing parts are the bar's 64px `height`, so they make the first line.

- `size`: `small` (the default) keeps the content between them, the headline in `titleLarge`.
  M3 Expressive's `mediumFlexible` and `largeFlexible` replace the deprecated medium and large
  bars: render the content after `trailing` and it takes a line of its own under the actions,
  at least `mediumContentHeight`/`largeContentHeight` tall, the headline in `headlineMedium` or
  `displaySmall` and the subtitle in `labelLarge` or `titleMedium`.
- `centered` centers the headline; `search` makes room for a search bar (use the search bar's
  `centered` and `scrolled` with it).
- `scrolled` takes `scrolledContainer` (`surfaceContainer`), once the page scrolls under the bar;
  the colour fades with the state tween, which reduced motion keeps.
- `collapsed`, for a flexible bar the page has scrolled past: select it with the `small` size
  (the bindings do) and the headline rises into the first line (`appBarCollapseIn`, added by
  `pureform()`; nothing moves under reduced motion).

No radius (the bar is square under every shape theme), no indication of its own, and no
compounds. Nothing deprecated was kept: the non-flexible medium and large bars aren't built,
since the flexible sizes replace them.

```html
<header class="{root}">
    <div class="{leading}"><button aria-label="Back">←</button></div>
    <div class="{trailing}"><button aria-label="More">⋮</button></div>
    <div class="{content}">
        <h1 class="{headline}">Inbox</h1>
        <p class="{subtitle}">12 unread</p>
    </div>
</header>
```

## Navigation

`navigationBar` (bottom, destinations side by side) and `navigationRail` (a narrow column)
share their markup. Mark the current destination with `aria-current="page"`; `color` fills its
pill with a group's container, and an icon font draws its icon filled.

The bar's `itemLayout: "horizontal"` and the rail's `expanded: "true"` put each label beside
its icon, inside the pill, with the same markup: the pill covers the item and the label paints
over it, in `horizontalActiveLabelColor` (the icon's colour) once current. The rail also has a
`header` part (above the items, for the menu button and FAB) and `modal: "true"`, a raised
surface with rounded end corners that the bindings show in a dialog over the scrim. No
deprecated options; nothing was removed.

```html
<nav class="{root}">
    <a class="{item}" href="/" aria-current="page">
        <span class="{indicator}">
            <span class="{activeIndicator}"></span>
            <span class="{icon}">⌂</span>
        </span>
        <span class="{label}">Home</span>
    </a>
</nav>
```

## Tabs

Mark the current tab with `aria-selected="true"`. `variant` is `primary` or `secondary`; turn
on `icon` when the tabs have icons, which primary tabs stack over their labels in a 64px tab, or
set beside them in a 48px one with `inlineIcon`. `color` sets the indicator and a primary tab's
active label. Each tab wraps its icon, label, and indicator in `tabContent`, as Material's tabs
do: a primary tab's content is centered and kept `paddingInline` from the tab's edges, at least
`indicatorMinWidth` (24px) wide, and its indicator (3px, with 3px top corners, `indicatorRadius`)
spans it; a secondary tab's content spans the tab and pads itself, so its indicator (2px, square)
spans the tab. The divider under the tabs is an inset shadow on each tab (`dividerColor`), so it
takes no markup.
The indicator declares a `transform` transition on its `indicatorSpring` token, the
`spatialDefault` spring (Compose's `TabRow` uses `DefaultSpatial`), none under reduced motion; the bindings slide the new tab's
indicator in from the old one's box over it (design doc §9.10). It draws over every tab
(`z-index: 1`) inside the tab list, which is its own stacking context.

```html
<div class="{root}" role="tablist">
    <button class="{tab}" role="tab" aria-selected="true">
        <span class="{tabContent}">
            <span class="{icon}">★</span>
            <span class="{label}">Flights</span>
            <span class="{indicator}"></span>
        </span>
    </button>
</div>
```

## Dialog

Put the text buttons in the actions, the confirming one last. Turn on `icon` when you render
one, so the icon and headline center.

```html
<div class="{root}" role="dialog" aria-labelledby="title">
    <span class="{icon}">⚠</span>
    <h2 class="{headline}" id="title">Discard draft?</h2>
    <p class="{body}">…</p>
    <div class="{actions}">…</div>
</div>
```

The dialog doesn't trap focus or dim the page by itself. Use a native `<dialog>` (which traps
focus), or put the `scrim` component behind it. It stacks over the scrim and slides in on
`data-state` (see [Overlays](#overlays-stacking-and-motion)).

## Full-screen dialog

`fullscreenDialog` is the dialog that fills the screen, for a task with more content than a
basic dialog holds. Its header has the close trigger (an icon button), the headline, and the
confirm action (a text button); the body scrolls under it. It has no icon, no actions row and no
scrim, and its corners are square. It has no variants (0 compounds); `headerHeight`,
`headerPadding`, `headerGap` and `bodyPadding` are tokens. It stacks at the `dialog` layer and
slides in like the dialog.

```html
<div class="{root}" role="dialog" aria-labelledby="title">
    <div class="{header}">
        <button class="{closeTrigger}" aria-label="Close">×</button>
        <h2 class="{headline}" id="title">New event</h2>
        <button class="{confirmAction}">Save</button>
    </div>
    <div class="{body}">…</div>
</div>
```

The bindings place it in a positioner that covers the viewport, so `root` fills its container.
`closeTrigger` and `confirmAction` only keep their size (`flex-shrink: 0`); the bindings draw
them as an icon button and a text button.

## Sheets and the drag handle

`bottomSheet` is a surface anchored to the bottom of the screen: `dragHandle` over `content`,
which scrolls. Its top corners take the `extraLarge` role (`runCorners`), it is at most 640 wide
and centered, on `surfaceContainerLow` at level 1. `modal` (default) stacks it at the `dialog`
layer, over a scrim; `modal: false` is a standard sheet at the `raised` layer. The `dragHandle`
slot only centers what the bindings draw there: the `dragHandle` component.

`sideSheet` sits against the end edge: `header` (`backButton`, `headline`, `closeTrigger`) over
`content`, then `actions` under a divider. A standard sheet is square, on `surface` at level 0, at
the `raised` layer; `coplanar` puts it on the page's own layer (`base`), for a sheet in the
page's layout. `modal` (default) moves it to the `dialog` layer on `surfaceContainerLow` at level
1, with its start corners on the `large` role. `coplanar` is meant for a standard sheet; the
bindings never set both.

Both slide in from their edge on `data-state` (`overlayMotion` with `BOTTOM_SHEET_MOTION` and
`SIDE_SHEET_MOTION`, and `SHEET_KEYFRAMES` added to the config); the side sheet's keyframes run the
other way under right to left (the motion step's `rtl` keyframes), and reduced motion fades with
the other overlays' `overlayFadeIn`/`overlayFadeOut`. Neither has compounds.

`dragHandle` is a touch-sized button holding the `handle` pill (32 by 4 in `onSurfaceVariant`);
`orientation: "vertical"` stands the pill up (4 by 48) for a pane divider. It draws only the
focus ring, no state layer.

```html
<div class="{bottomSheet.root}" role="dialog" aria-label="Share">
    <button
        class="{bottomSheet.dragHandle} {dragHandle.root}"
        aria-label="Close sheet"
    >
        <span class="{dragHandle.handle}"></span>
    </button>
    <div class="{bottomSheet.content}">…</div>
</div>
```

## Snackbar and tooltip

Both sit on the inverse surface. Placing, showing, and dismissing them is the app's job; placed,
they stack at their layers and grow in on `data-state` (see
[Overlays](#overlays-stacking-and-motion)).

```html
<div class="{root}" role="status">
    <span class="{supportingText}">Message archived</span>
    <span class="{actions}">
        <button class="{action}">Undo</button>
        <button class="{close}" aria-label="Dismiss">×</button>
    </span>
</div>

<div class="{root}" role="tooltip" id="tip">
    <span class="{supportingText}">Save to drafts</span>
</div>

<div class="{root}" role="tooltip">
    <!-- richTooltip -->
    <span class="{subhead}">Drafts</span>
    <span class="{supportingText}">Drafts stay on this device.</span>
    <div class="{actions}">…</div>
</div>
```

`tooltip` is the plain tooltip: `root`, `supportingText`, and an optional `caret`. The rich
tooltip is its own component, `richTooltip` (`root`, `caret`, `subhead`, `supportingText`,
`actions`). `tooltip` no longer has a `variant` group: `richTooltip` replaces `variant: "rich"`.
The `caret` takes the surface's color through its `color`; the binding draws Zag's arrow tip
inside it in `currentColor`.

## Toast

Outside Material 3, skinned with its tokens: notifications that stack, several at once, with a
status. Material's single message is the snackbar.

```html
<div class="{group}" role="region">
    <div class="{root}" role="status" data-type="success">
        <span class="{icon}" aria-hidden="true">✓</span>
        <div class="{title}">Saved</div>
        <div class="{description}">Your changes are saved.</div>
        <button class="{actionTrigger}">Undo</button>
        <button class="{closeTrigger}" aria-label="Dismiss">×</button>
    </div>
</div>
```

`group` is the outermost part (Zag places it); it holds the tokens and stacks at the `snackbar`
layer. The root is `surfaceContainerHigh` with a level 3 shadow; the icon and close button sit in
its inline padding. `type` (`info` by default, `success`, `warning`, `error`, `loading`) colors the
icon from the theme's color groups (`loading` takes `primary`); every Material palette fills
`success` and `warning`, from a static theme or a runtime seed. No compounds. The bindings move
each toast with Zag's stacking variables, and the root transitions its transform, opacity and
height (the movement drops out under reduced motion).

## Paginator

`paginator` (Angular Material parity; M3 has none) is the row under a table or list: `pageSize`
(its `pageSizeLabel` and the `pageSizeSelect` box around the library's select), the `rangeLabel`
("1 – 10 of 100") and the `actions` row of the `firstTrigger`, `prevTrigger`, `nextTrigger` and
`lastTrigger` (the library's icon buttons; the part's class goes on the button). No variants and
no compounds: the row follows the theme's density (`minHeight` is `dense(56)`), ends at the inline
end, and `pageSizeSelect` hands the select a shorter field through `providedTokens`
(`pageSizeFieldHeight`, 40). Tokens: `container` (surface), `content`, `height`, `padding`, `gap`,
`pageSizeGap`, `pageSizeWidth`, `rangeStart` and `rangeEnd`.

## Time picker and time input

`timePicker` is Material's time picker: the `headline`, a `body` row with the `hourSelector`,
`separator`, `minuteSelector` and the `periodSelector` (AM over PM, each a `period`), the `dial`
(`dialTrack`, `dialHandle`, `dialCenter`, `dialLabel`s) and the `actions`. `mode: "dial"` (the
default) draws the clock; `mode: "scroll"` turns the selectors into columns of `scrollItem`s (M3
Expressive's scroll mode) and hides the dial. `color: "vibrant"` sets the surface and fields from
the primary container (M3 Expressive's vibrant set; values unconfirmed). `timeInput` has the same
headline, separator, period selector and actions, with `hourField`/`minuteField` (an `input` over
its `fieldLabel`) in place of the selectors and dial. Both read the tokens `time.ts` declares
(`timeTokens`, `timeSlots`), each under its own name. No compounds; the `mode` and `color` groups
touch different properties (`color` only sets root tokens).

The dial is a **shape exception** by geometry: the dial, its handle and its centre are circles
(`circle`, 50%) with `cornerShape: round`, so a sharp, bevelled or squircle theme leaves them round
(a style that sets its own `cornerShape` keeps it; see `corners.ts`). The bindings place the
labels, handle and track from the time in physical coordinates, since a clock doesn't mirror; the
direction spec allows the translate that centres them. The hand turns with a `transform`
transition on its `handSpring` token (the `spatialDefault` spring) that reduced motion drops.

## Data table

`dataTable` is a data table, after Angular Material's table and sort header (M3 specifies none;
the design calls are in `docs/roadmap-components/context/c6d.md`). It's registered as `dataTable`,
since Tailwind's scanner makes a `display: table` utility of a bare `table` in the generated
modules; the bindings' component is `Table`. Parts: the `root` (a `<table>`), the `header`, `body`
and `footer` row groups, the `headerRow`, `row`, `alternateRow` (every other body row of a striped
table) and `footerRow`, the `headerCell`, `cell` and `footerCell`, the `selectionCell` (the
checkbox column, one width in every row), and in a sortable column's header the `sortHeader`
button with its `sortLabel` and `sortIndicator` (the arrow). Rows and cells are flex boxes, each
cell an equal share of its row, so every target lays it out alike; the bindings write the table
roles out. Heights (56 header, 52 rows and footer) add the density offset; `density` sets it.
`stickyHeader` sticks the header on the web (`platform`: React Native has no sticky position).
A body row tints on hover and while something in it has keyboard focus, and fills with the
selected colors under `aria-selected`. The arrow fades in on a sorted column (`filled`), and
faintly on an unsorted one's hovered or focused header; the fade runs under reduced motion too.
The arrow always points up and turns over while its header cell is sorted descending (core's
`descending` state, `aria-sort="descending"` on the web), on the chevrons' `spatialFast` spring;
reduced motion drops the turn.
No compounds; `stickyHeader` sets header styles and `density` a root token.

## Toolbar

M3 Expressive's docked and floating toolbars are one component, `toolbar`, with one part, `root`,
holding icon buttons and buttons:

```html
<div class="{toolbar.root}" role="toolbar" aria-label="Formatting">
    <button class="{iconButton.root}" aria-label="Bold">…</button>
</div>
```

`placement: floating` (the default) is a pill at level 3 that hugs its elements, 8px from its
ends and 4px apart; `docked` fills its row with square corners and no shadow, spreads its
elements out and pads its ends 16px (it replaces the deprecated bottom app bar, which was never
built). The bar is 64px thick (plus the theme's density offset); `orientation: vertical` stands it
up, padding its block ends instead. `color: vibrant` takes `primaryContainer` and
`onPrimaryContainer` for `surfaceContainer` and `onSurfaceVariant`. `overflow: true` clips the
bar so it never grows past its parent, for the bindings that move what doesn't fit into a menu.
Where the bar sits (16dp off the screen's edge when floating) is the page's layout. No compounds.
The bar has no motion of its own.

## Slider and progress

The slider (on Zag's slider machine in the bindings) and the linear progress indicators read
their value from tokens you keep in step, as numbers from 0 to 100 (prefixed like every var). The
slider's: `value` (where a handle sits; a range's first thumb sets its own on its handle),
`activeStart` and `activeEnd` (the active track), and `startGap` and `endGap` (1 where a handle
cuts that end of the active track). A stop sets its own `value` and `stopActive`. `orientation`
is `horizontal` or `vertical`; `handleShape: "round"` is the deprecated round handle, kept since
Expressive has no equivalent.

```html
<div
    class="{root}"
    style="--components-slider-value: 40; --components-slider-activeEnd: 40"
>
    <span class="{startTrack}"></span>
    <span class="{track}"></span>
    <span class="{activeTrack}"></span>
    <div
        class="{handle}"
        role="slider"
        tabindex="0"
        aria-label="Volume"
        aria-valuenow="40"
    >
        <span class="{stateLayer}"></span>
    </div>
</div>

<div
    class="{root}"
    role="progressbar"
    aria-valuenow="40"
    style="--components-linearProgress-value: 40%"
>
    <div class="{track}"></div>
    <div class="{indicator}"></div>
    <div class="{stopIndicator}"></div>
</div>
```

- `linearProgress`: `track` (the rest of the bar, starting after the indicator and the `gap`
  token, 4px), `indicator`, and `stopIndicator` (a dot at the track's end, `stopSize`). Turn on
  `indeterminate` when the amount is unknown: the track fills the bar and the dot goes.
- `circularProgress`: a `track` (the same two-half ring in `trackColor`, turned past the
  indicator and drawing the rest of the circle less a `gap` at each end, a percent of the
  circle, 3 by default) under a ring drawn by two halves, each turning through its share of the
  value. The arcs draw from their own tokens, not the radius roles, so they stay round under
  a theme whose radii are all 0 (nothing to allow-list: the circle is `50%`, not a fixed px). Turn on `indeterminate` for a spinner, which needs only the root.
- `shape: wavy` (M3 Expressive, both): the indicator is drawn as a wave and the track stays
  flat. The linear bar grows by the `amplitude` token (3px) above and below, and its indicator is
  clipped to a band along a sine wave of 40px waves (24 of them, so a bar wider than 960px ends
  flat); each circular arc's ring widens by twice `amplitude` (1.5px) and is clipped to a ring of
  nine waves, as is the spinner. A clip's points are drawn once, so the wave per thickness is a
  compound (one on the linear, three on the circular). Where a target can't clip to a shape
  (React Native without an SVG engine, a browser without CSS `shape()`), the indicator stays
  flat; React Native draws the linear wave with an SVG engine, not the circular one.

## Loading indicator

`loadingIndicator` is M3 Expressive's indicator for a wait too short to measure: `root` (48px)
holding a `container` holding the `indicator` (38px), which turns and morphs through seven of
Material's shapes (`LOADING_INDICATOR_SHAPES`: soft burst, 9-sided cookie, pentagon, pill,
sunny, 4-sided cookie, oval), two turns a cycle of seven `long2` steps on the standard curve.
`variant: "contained"` fills the container (`containerColor`, the group's container colour) and
draws the indicator in `containedIndicatorColor`; `color` takes a group. Under reduced motion it
only turns (`loadingIndicatorSpin`), since the motion is the only sign of the wait.

```html
<div class="{root}" role="progressbar" aria-label="Loading">
    <span class="{container}"><span class="{indicator}"></span></span>
</div>
```

It's a **shape exception**: its geometry is the shape, so its container stays round under any
shape theme and corner style (`containerRadius`, half its size, is on `radii.spec.ts`'s
allow-list, and `pureform()` gives it no `cornerShape`). A theme that wants another shape sets
`containerRadius`. The keyframes are `LOADING_INDICATOR_KEYFRAMES`, every shape redrawn by
`morphSequence` (`shape-paths.ts`) to one structure so CSS `shape()` animates between them.
Where a target can't clip, the indicator is a turning circle; React Native's keyframes carry no
clip, so with an SVG engine it turns in its first shape without morphing.

```html
<div
    class="{root}"
    role="progressbar"
    aria-valuenow="40"
    style="--components-circularProgress-value: 40"
>
    <span class="{track}">
        <span class="{trackEndHalf}"><span class="{trackEndArc}"></span></span>
        <span class="{trackStartHalf}"
            ><span class="{trackStartArc}"></span
        ></span>
    </span>
    <span class="{endHalf}"><span class="{endArc}"></span></span>
    <span class="{startHalf}"><span class="{startArc}"></span></span>
</div>
```

## Surfaces

- `card`: `variant` is `elevated`, `filled`, or `outlined`. Set `interactive` when the whole
  card is clickable, and render its touch target slot. For Material's anatomy, set `padded`
  to `false` and lay it out with `media` (full bleed), `header` (`avatar`, `headerText` holding
  `headline` and `subhead`, `headerAction`), `content` (`supportingText`), `actions`
  (`actionsAlign`: `end` or `start`), and `footer`; the sections pad themselves. A card that acts
  and has other controls wraps the part that acts in `actionArea` (a link or a button) and keeps
  the controls outside it: the container then tints, lifts, draws the focus indicator, and dims
  from the action area (`:has()` over its states), and the ripple's layer sits in the action
  area, spanning the card (design doc §9.9).
- `scrim`: dims what sits behind a modal surface. Place it inside a positioned container.
- `separator`: Material's divider. Use an `<hr>`; `inset` is `none`, `start`, or `middle`.

## Standalone parts

- `text`: `style` is any of the theme's text styles, for example `text({ style: "titleLarge" })`.
- `supportingText`: helper text beside any control. `tone` is `neutral`, `error`, or a color
  group; it doesn't detect errors, so set `tone` yourself.
- `icon`: centers a glyph, icon-font icon, or svg. `size` is `small`, `medium`, or `large`;
  `color` is `current` or a color group; `filled` is `inherit` (follow the icon slot it sits
  in), `false`, or `true`.
- `touchTarget`: grows a small custom control's hit area to the minimum. Put it inside a
  positioned element.
- `ripple`: the layer `@pureform/js-effects` draws its ripple into.

## Accessibility

Every interactive component shows a focus ring on keyboard focus and reaches the theme's
touch target size. To check a custom palette:

- `requireContrast: 4.5` checks the theme's role pairs, such as `onPrimary` on `primary`.
- `requireComponentContrast: true` checks every color the components draw against what they
  draw it on (4.5:1 for text, 3:1 for control parts), and every color group as the color
  variants use it.

Both check light and dark, for the base theme and every named theme, and throw naming each
pair that falls short. `componentContrastFailures(color, components)` returns the failures
instead.

## Stepper

`stepper` (c6b): slots `root`, `list`, `item`, `trigger` (a pressable header: the state layer and
focus ring), `indicator` (the step's number, an icon or a check, in a circle), `label`, `caption`,
`separator` (the connector) and `content`. `orientation`: `horizontal` (default; the connector
fills the space between headers) or `vertical` (the connector runs down beside the content, which
lines up with the label); `density`; 0 compounds. The indicator and label read the header's state
(`aria-selected` or `aria-current` for the current step, `aria-invalid` for an error) and the
indicator its own `aria-checked` (done). Tokens: `container`, `content`, `activeContent`,
`errorContent`, `captionColor`, the indicator's container and content per state, `connector`,
`connectorThickness`, `connectorLength`, `connectorGap`, `indicatorSize`, `height`,
`paddingInline`, `gap`, `radius`, `contentPadding`. Colour changes fade; nothing moves.

## Carousel

`carousel` (c4d): slots `root`, `itemGroup` (the scrolling row), `item` (an item's place in it),
`mask` (the rounded item people see: extra-large corners, the state layer and focus ring) and
`content`. `layout`: `multiBrowse` (default), `hero`, `uncontained`, `multiAspect`, `fullScreen`
(no padding, the parent's height); 0 compounds. Tokens: `container`, `content`, `radius`, `height`,
`gap`, `padding`. The bindings size each item inline from Material's keylines
(`carouselItemSizes` in `@pureform/binding-core`); only the widths and the mask's inline offset are
set from script.

## Accordion and tree

Material 3 specifies neither; their parts come from Angular Material's token names and Zag's part
lists (c6a), drawn with the list's row parts (`rowParts`, `rowTokens`).

- `accordion`: slots `root` (a column of tiles, `itemGap` apart), `item` (a tile on
  `surfaceContainer`, `radius` from the theme's medium role), `trigger` (the header: an interactive
  list row, `headerHeight` plus the density offset; its bottom corners square while
  `aria-expanded`), `leading`, `text` around `title` (`titleMedium`) and `description`,
  `indicator` (turns over while its header is expanded; reduced motion drops the turn) and
  `content`. One group, `density`; 0 compounds.
- `tree`: slots `root` (its container, around the label and the tree), `label`, `tree`, `branch`,
  `node` (every row: an interactive list row, `nodeHeight` plus the density offset, `nodeRadius`
  from the full role), `leading`, `text`, `indicator` (as the accordion's, while the row is
  `aria-expanded`) and `group` (a branch's children, `indent` from the start; no display of its
  own, so `hidden` hides it). Groups `density` and `color` (the selected row's container); 0
  compounds.
- `expandIndicator(trailing, expanded)` (in `list.ts`) is the turning indicator both use.

## Grid list

`gridList` (c6e, Angular parity: M3 doesn't specify it): slots `root` (a wrapping row), `tile` (a grid
cell: its share of the row, padded by half the gutter), `content` (what you see: rounded, clipped,
at the aspect ratio), `media`, `header`, `footer` (bands laid over the content's top and bottom
edges, in the inverse surface colours) and `headline`/`subhead` (their lines). No machine, no CSS
grid, and no `calc` with a percentage: React Native can't subtract a gutter from a percentage, so
the gutter is padding on the cell and the root pulls it back with a negative margin. Variants,
each setting one token on the root (0 compounds): `columns` 1 to 6, `gutter` none, small, medium,
large, `aspect` square, landscape, portrait, wide. Tokens `columns`, `gutter`, `aspect`, `radius`,
`container` and the caption's (`captionContainer`, `captionContent`, `captionOpacity`,
`captionSize`, `captionPadding`) take any value. Spanning a tile over several columns is not built.
