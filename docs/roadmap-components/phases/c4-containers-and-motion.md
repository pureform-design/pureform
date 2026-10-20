# c4: Expressive containers and motion

**Depends on:** c3 and r3 (c4b uses the search bar and search view; c4c uses the menu for
overflow). **Subphases:** c4a to c4d, parallel. **Gap analysis:** §1.2 to §1.4.

These involve custom motion or layout; no zag machine fits the core. Read the motion rules in
`component-architecture.md` §5.8 first, and check reduced motion for every animation.

## c4a: Loading indicator and wavy progress

One subphase: both draw a morphing or waving shape and need the same path and animation
primitives.

- `loadingIndicator`: `root`, `container`, `indicator`; contained and uncontained; a custom
  shape-morph animation. It is a **shape exception** (geometry is the shape; guidelines §5.1,
  c0c's allow-list); colour, size and motion still follow the theme.
- Progress `shape: wavy` for linear and circular (the c1b parts drawn as a wave, by SVG path
  or mask).
- Own files: new `loading-indicator.ts`, `progress.ts` (wavy only), bindings.
- Hints: the path and morph helpers, for r4.

## c4b: App bar

`appBar`: `size` small, medium flexible, large flexible; `centered`; `search` (embeds the
search bar); scroll behaviour (collapse, lift on scroll, scrolled colours). Custom scroll
logic. Own files: new `app-bar.ts`, a scroll-behaviour helper, bindings.

## c4c: Toolbar

`toolbar`: `placement` docked or floating, `orientation`, `color` standard or vibrant; an
`overflow` variant moving items that don't fit into a `menu` (Android's `OverflowLinearLayout`).
Own files: new `toolbar.ts`, an overflow helper, bindings.

## c4d: Carousel

`carousel`: `layout` multi-browse, uncontained, hero, full-screen, plus multi-aspect; zag
`carousel` for behaviour, custom item sizing (large, medium, small masks). Own files: new
`carousel.ts`, machine wrapper, bindings.

## Shared files

Registration files. Merge order: c4a, c4b, c4c, c4d. App bar and toolbar both define a bar
container: keep them apart now and let r4 merge what repeats.

## Done when

As for c1, plus every animation has a reduced-motion test, and the loading indicator's
exception is on the allow-list with its reason.
