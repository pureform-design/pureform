# fix-storybook-6

Findings from Storybook on main after r10. For each, first decide whether it's a story/harness
bug or a component bug, and fix it at the right layer.

## 6a: progress and web
- CircularProgress loses its track in indeterminate mode.
- Wavy CircularProgress, indeterminate: the seam between the two halves is visible and
  misaligned at points in the animation.
- LinearProgress (and CircularProgress once it has a track): the wave sits on a full-width track;
  M3 leaves a gap between the active indicator and the track, determinate and indeterminate.
- Storybook warning: `viewport.defaultViewport` was removed in Storybook 10; use
  `globals: { viewport: "suites" }`.
- Solid and React: the hover highlight flickers on menu items (scene on, with a button) and,
  intermittently, on navigation bar items.
- Solid and React DockedDatePicker example: React Native shows a placeholder in the text input;
  the web doesn't. Make them match (web shows the format hint the way M3 does).

## 6b: React Native and menus
- React Native submenus don't transition in like the first menu.
- React Native shaped Media isn't shaped and LoadingIndicator doesn't animate: is the story's
  SVG engine off, or a bug? Fix whichever.
- Drilled submenus (all renderers): animate the menu's size to the new level, and FLIP the pressed
  item into the submenu's header (and back on return), honouring reduced motion.
- TouchTarget on React Native: implement it if missing (hit slop / expanded press area) and in
  its story.
- React Native FileUpload has no button.
- React Native DateInput segments show `mm`/`dd`/`yyyy` placeholders like the web, including the
  focused empty segment.
