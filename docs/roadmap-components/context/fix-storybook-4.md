# fix-storybook-4

Storybook fixes (`apps/storybook-web`) on branch `fix-storybook-4`. Follows
[fix-storybook-2](fix-storybook-2.md).

## 1. Carousel stories in a fixed-width frame; Light/Dark tests

- **Done (frame):** `parameters.pureform.width` (new, read by `withHeight` in `src/hooks.ts`)
  fixes the canvas frame's width. The Carousel's config (`stories.config.ts`) sets it to 1280px,
  the component suites' page (their 1280×900 viewport; the reset's body has no margin), with
  `layout: "fullscreen"` (no canvas padding) and a `viewport` parameter at 1280×900: the Vitest
  addon resizes every story test to its own default, **1200px** (`DEFAULT_VIEWPORT_DIMENSIONS`
  in `@storybook/addon-vitest`), so the frame overflowed before. Measured in the play: frame,
  `innerWidth` and the row all 1280px now.
- **Not done (Light/Dark tests stay `!test`):** the width wasn't the cause. With the frame
  matching, Solid's state play still reads page 2 for 1 (React passes). Logged in the play:
  - Solid, once measured, gives the multi-browse masks different sizes
    (`198, 198, 198, 198, 198, 186, 56, 56`), and on `ArrowRight` from item 1 its
    `data-current` jumps to index 2 at the first scroll event (scrollLeft 3, ending at 206).
  - React's masks all stay 186px (no measured multi-browse sizes) and the page goes to 1.
  - The component suites' `controllable` Carousel tests pass in `solid/panda`: they act right
    after mounting, before the row is measured, so they miss it.
  That is a binding/machine question (`packages/solid/src/carousel/carousel.tsx`, React's
  carousel, `setMatchingPage` in `packages/machines/src/carousel/index.ts`), outside this batch.
  The config comment says so.
- **Tests:** `bunx vitest run -c vitest.config.storybook.ts --project storybook/solid --project
  storybook/react src/stories/generated/Carousel.stories.ts`: 20 passed (Light/Dark enabled:
  React passes, Solid fails `expected 2 to deeply equal 1`; reduced motion made no difference).

## 2. React Native menu drawn mid-canvas

- **Not reproduced.** `storybook dev -p 6431`, Playwright screenshots of `menu--opened-plain`
  (iframe) and `menu--default` opened by a click inside the manager (1400×900), renderer React
  Native: the menu opens directly under its trigger (trigger at 16,16; list at 16,64, as React's).
  Nothing changed.

## 3. Interactions panel clicks and the Actions panel's payload

- **Done (clicks):** `src/renderers/user-event.ts` (the panel path; Vitest aliases
  `#user-event` to `user-event.vitest.ts`) clicks with `storybook/test`'s `pointer`: a move onto
  the element, then `[MouseLeft]`, both with `coords` at the middle of its box (`clientX/Y`,
  `pageX/Y`, `offsetX/Y`, `screenX/Y`), so pointer, mouse and click events carry a position.
- **Done (Actions):** the click spy (`compose.ts`, `mockName("onClick")`) records
  `summarizeEvent(event)` (`src/renderers/event-summary.ts`): `{ type, key?, button?, target: {
  role?, name? } }`, the target being the nearest element with a role (explicit or implicit),
  the name `aria-label`, `aria-labelledby`'s text or the text, cut to 80 characters. A React
  Native press event gives `type: "press"`. The key plays check the call is a `click` summary
  and that the calls don't reach `window`; the preview's reaches-window `afterEach` check stays.
- **Tests:** `src/checks/slider.ts` (Slider's `Empty` story, value 0) clicks the root through
  the panel-path `userEvent` (imported directly, not the alias) and expects `aria-valuenow > 0`.
  Negative control: with the old `storybookUserEvent.click` it fails (React, `Empty`). Slider and
  Button stories in Solid and React: 78 passed.

## Checks

- `omni run build test -p @pureform/storybook-web`: passes (build, unit, story e2e).
- `bunx tsc --noEmit -p tsconfig.json` in `apps/storybook-web`: no errors in the app's
  sources; the errors it prints are all in `packages/solid/dist/*.jsx` and were there before
  (276 on main's sources, 275 with this branch).

## Refactoring hints

None: `event-summary.ts` and the panel `userEvent` are specific to the Storybook app.

## Open questions

- Carousel: should Solid's measured multi-browse sizes or React's equal ones be right, and
  which page should the second item be on? Whichever binding is wrong, the suites' state test
  should act after the row is measured to catch it. Light/Dark tests can be re-enabled after.
