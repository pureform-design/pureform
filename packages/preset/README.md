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

- `button`: `variant` is `filled`, `tonal`, `outlined`, `text`, or `elevated`; `size` is
  `small`, `medium`, or `large`.
- `iconButton`: `variant` is `standard`, `filled`, `tonal`, `outlined`, or `elevated`. Give it
  an `aria-label`.
- `fab`: `variant` is `tonal`, `filled`, or `surface`; `size` is `small`, `medium`, or
  `large`. Set `extended` and render the label for an extended FAB.

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
- `textField`: turn on `leadingIcon` or `trailingIcon` when you render one.
- `textArea`: use a `<textarea>` with `rows`, or turn on `autoGrow` to grow it with the text.

## Selection controls

`checkbox`, `radio`, and `switchControl` lay a native input over the control, so forms, the
keyboard, and screen readers work unchanged. `color` sets the checked colors.

```html
<!-- checkbox: set input.indeterminate for the dash -->
<label class="{root}">
    <span class="{touchTarget}"></span>
    <input class="{input}" type="checkbox" />
    <span class="{box}">
        <span class="{checkIcon}">✓</span>
        <span class="{indeterminateIcon}">–</span>
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

## Tabs

Mark the current tab with `aria-selected="true"`. `variant` is `primary` or `secondary`; turn
on `icon` when the tabs have icons.

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
  `color` is `current` or a color group.
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
