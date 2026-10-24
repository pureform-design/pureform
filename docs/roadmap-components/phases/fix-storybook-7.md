# fix-storybook-7

Open questions from r9-r10, fix-storybook-6a/6b and a11y-roles, with the agreed answers.

## 7a: progress, motion and drawing

1. The track shows by default on linear and circular progress (flat and wavy, determinate and
   indeterminate, every renderer), and a `track` prop hides it (`track={false}`), documented in
   the READMEs. (Replaces "the flat indeterminate spinner draws no track"; user decision.)
2. Progress gaps' ends are rounded as Compose's (track drawn in two parts).
3. React Native linear indeterminate track leaves the same gap as the web.
4. Web drill motion reads the theme's spring (CSS vars, `springFromVars`), as React Native does.
5. React Native drill: animate width too, move only the label (FLIP), fade the other rows, as the web.
6. `reanimated-svg` runs keyframed shapes (loading indicator morph) and `alternate` directions.
7. SVG engine ripple on devices clips to the drawing's exact shape (mask view) if possible off the JS
   thread; otherwise document the rounded-corner clip.
8. Fill cross-fade with translucent fills keeps total coverage constant (fade the old out while
   the new fades in).
9. Storybook toolbar switch for the React Native engine: animated, svg, reanimated.

## 7b: menus, accessibility and components

10. Menu `auto` measures the submenu's real width at the press.
11. Menu `auto` checks vertical room too (flip up, or drill).
12. Menu `container` prop naming a container (default: nearest).
13. Tree: focus and keys on the `treeitem` (APG), not a nested button; React Native, and check the
    web's Zag tree.
14. React Native autocomplete: combobox + listbox of options.
15. React Native select: type-to-find.
16. Tree "level N" text localisable through the locale's messages.
17. Keep the axe `label-content-name-mismatch` exception on React Native Tree (documented).
18. Small React Native pressables (checkbox, radio, switch, icon button, chips) use
    `useTouchTargetSlop`.
19. React Native DateInput separators spaced as the web's.
20. Changelog line for `withSetTokens`' API change (r9a).
