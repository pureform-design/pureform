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
touch target size. The tests check each component's contrast pairs and every color group in
light and dark. Pass `requireContrast: 4.5` to `pureform()` to check a custom palette's roles.
