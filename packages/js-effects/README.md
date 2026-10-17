# @pureform/js-effects

Material's press ripple, in plain TypeScript with no framework: its timing, geometry, and the
life of a press, and two ways to draw it on the web (the ink well and the newer sparkle).

## Where it sits

It depends on nothing. `@pureform/machines` runs it as the `ripple` machine (the standalone
`Ripple` component), `@pureform/binding-core/indication` draws Material's indication with it, and
`@pureform/rn-adapter` reuses its DOM-free core (`/core`) for React Native's ripple.

## Architecture

| Module           | What it holds                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ripple-core.ts` | No DOM: `RippleTiming`, `DEFAULT_RIPPLE_TIMING`, `TOUCH_DELAY_MS`, `rippleGeometry`, `ripplePress` (one held ripple, a minimum press)           |
| `ripple.ts`      | The web: `createRipple` (a ripple driven by the presses its caller reports), `ripple` (one over a surface's pointer events), `readRippleTiming` |

```
ripple(surface, options) ── pointer and click events ──► createRipple(layerOf, options)
indication's web effect ── the source's presses ────────►     │ press / release / cancel
                                                              ▼
                                         ink well (a CSS-animated span) or sparkle (a canvas)
```

## Public API

```ts
import { createRipple, ripple } from "@pureform/js-effects";

// Driven by presses: what Material's indication runs over an interaction source.
const controller = createRipple(() => layer, {
    variant: "ink-well",
    class: "ripple",
});
controller.press({ x: event.clientX, y: event.clientY }, /* touch */ false); // or "center"
controller.release(); // fades once the ripple has shown long enough
controller.cancel(); // a waiting touch never ripples

// Driven by a surface's own events: pointer down, up, leave, cancel, and keyboard clicks.
const detach = ripple(surface, { centerOrigin: true });
```

Options (`RippleOptions`, read at each press, so getters work): `variant`, `class` (each ripple
element's), `color`, `centerOrigin`, `timing` (else the layer's `transition`), `sparkle`,
`respectReducedMotion` (default `true`: the media query skips ripples), and for `ripple()`:
`getRippleLayer`, `disabled`, `allowPropagation` (by default the innermost surface claims a press).

`@pureform/js-effects/core` is the DOM-free part, for React Native.

## Building and testing

- `task_run` `build` on `@pureform/js-effects`: Vite library build, two entries (`index`, `core`).
- `task_run` `test:unit`: Vitest in jsdom (`ripple.spec.ts`, `ripple-core.spec.ts`).

## Worth knowing

- A touch press waits `TOUCH_DELAY_MS` (150 ms) before it ripples, so a scroll that starts there
  cancels it; a tap released sooner still gets its full ripple.
- The layer's computed `transition` times the ripple (`transform` for the grow, `opacity` for the
  fade), so the preset's motion tokens drive it.
