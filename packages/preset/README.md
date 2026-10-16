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

Dense components: `button`, `iconButton`, `chip`, `checkbox`, `radio`, `textField`,
`textArea`, `select`, `listItem`, and `menu`. The text area has no fixed height, so its steps
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

`morph(from, to)` makes a shape that changes into another while pressed, easing over `medium2`
on the emphasized curve; under reduced motion the shape changes at once and the colors still
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

### Avatar

`avatar` shows a picture, initials, or an icon in a color group's container, `small` (24px),
`medium` (40px), or `large` (56px). Style the `img` itself, which it crops to fill; give
initials `role="img"` and an `aria-label`. An avatar isn't interactive, so it takes the clip
directly.

```html
<img
    class="{avatar({ size: 'large', shape: 'sunny' })}"
    src="…"
    alt="Ada Lovelace"
/>
<span
    class="{avatar({ color: 'tertiary', shape: 'cookie9Sided' })}"
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

```html
<button class="{root}" type="button" aria-pressed="true">
    <span class="{touchTarget}"></span>
    <span class="{icon}">✓</span>
    <span class="{label}">Filter</span>
</button>
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
trailing icon or text. Mark a selected row with `aria-selected="true"`.

```html
<li class="{root}" tabindex="0">
    <span class="{leading}">★</span>
    <div class="{content}">
        <span class="{overline}">Overline</span>
        <span class="{headline}">Headline</span>
        <span class="{supportingText}">Supporting text</span>
    </div>
    <span class="{trailingText}">100+</span>
</li>

<div class="{root}" role="menu">
    <button class="{item}" role="menuitem">
        <span class="{itemLeading}">✂</span>
        <span class="{itemLabel}">Cut</span>
        <span class="{itemTrailingText}">⌘X</span>
    </button>
    <hr class="{separator()}" />
</div>
```

- `listItem`: `lines` is `one`, `two`, or `three`. Set `interactive` when the item is
  clickable; it then takes a state layer and the focus ring.
- `menu`: items are always interactive. Separate groups with the `separator` component.
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

## Navigation

`navigationBar` (bottom, destinations side by side) and `navigationRail` (a narrow column)
share their markup. Mark the current destination with `aria-current="page"`; `color` fills its
pill with a group's container, and an icon font draws its icon filled.

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
on `icon` when the tabs have icons. `color` sets the indicator and a primary tab's active label.

```html
<div class="{root}" role="tablist">
    <button class="{tab}" role="tab" aria-selected="true">
        <span class="{icon}">★</span>
        <span class="{label}">Flights</span>
        <span class="{indicator}"></span>
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
focus), or put the `scrim` component behind it.

## Snackbar and tooltip

Both sit on the inverse surface. Placing, showing, and dismissing them is the app's job.

```html
<div class="{root}" role="status">
    <span class="{supportingText}">Message archived</span>
    <button class="{action}">Undo</button>
    <button class="{close}" aria-label="Dismiss">×</button>
</div>

<div class="{root}" role="tooltip" id="tip">Save to drafts</div>
```

`tooltip`'s `variant` is `plain` or `rich`; a rich tooltip adds `subhead`, `supportingText`,
and `actions` slots.

## Slider and progress

The slider lays a native range input over its drawn track and handle. Both it and the linear
progress indicators read their value from a `value` token, a CSS var you keep in step as a
number from 0 to 100 (prefixed like every var, for example `--components-slider-value: 40`).

```html
<div class="{root}" style="--components-slider-value: 40">
    <span class="{track}"></span>
    <span class="{activeTrack}"></span>
    <span class="{stateLayer}"></span>
    <span class="{handle}"></span>
    <input class="{input}" type="range" aria-label="Volume" />
</div>

<div
    class="{root}"
    role="progressbar"
    aria-valuenow="40"
    style="--components-linearProgress-value: 40%"
>
    <div class="{indicator}"></div>
</div>
```

- `linearProgress`: turn on `indeterminate` when the amount is unknown.
- `circularProgress`: a ring drawn by two halves, each turning through its share of the
  value. Turn on `indeterminate` for a spinner, which needs only the root.

```html
<div
    class="{root}"
    role="progressbar"
    aria-valuenow="40"
    style="--components-circularProgress-value: 40"
>
    <span class="{endHalf}"><span class="{endArc}"></span></span>
    <span class="{startHalf}"><span class="{startArc}"></span></span>
</div>
```

## Surfaces

- `card`: `variant` is `elevated`, `filled`, or `outlined`. Set `interactive` when the whole
  card is clickable, and render its touch target slot.
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
