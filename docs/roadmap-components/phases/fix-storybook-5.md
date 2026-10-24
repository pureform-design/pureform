# fix-storybook-5 (after r9 merges)

Findings from Storybook before r9; first check whether r9 or an earlier batch already fixed each,
and whether it's a harness (story) or a component bug.

## 5a: web components

- Paginator (Solid, React): the buttons' icons are miscoloured or missing.
- SideSheet (Solid, React): swiping only works on the header; React Native allows the whole sheet.
- Tooltip (Solid, React): long-press on touch doesn't show it (React Native does).
- Ripple scene (Solid, React): pressing the surface draws no ripple; the scene says React Native
  has no ripple, though it draws one: fix the text.
- CopyButton (Solid, React): no check icon after a click.
- FabMenu (Solid, React): the items aren't tabbable one by one.
- Toast: swiping doesn't dismiss; the scene gets a button that adds toasts.
- TouchTarget: draws nothing visible; make the story show the target area.

## 5b: React Native and shared

- Menu `submenu` prop on all renderers: `"cascade"` (beside), `"drill"` (replaces entries, back
  row), `"auto"` default (cascade when it fits, else drill).
- Solid carousel sizes items unevenly after measuring the row and jumps to page 2 on scroll
  (React keeps them equal); then re-enable Carousel Light/Dark story tests.
- SearchView (React Native): its list items don't fill the container.
- Size animations on React Native for expanding components (expander, accordion…): animate
  height where the web does.
- Toolbar (React Native): layout broken.
- DockedDatePicker (React Native): the label overlaps the placeholder when empty.
- DateInput (React Native): segments like the web, if feasible.
