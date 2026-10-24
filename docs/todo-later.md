# Parked for later

- **Hover flicker** (Solid, React): the highlight flickers when hovering items in the Menu Default
  story (open with its button) and, intermittently, navigation bar items. Seen in a desktop
  browser; not reproduced headless (fix-storybook-6a swept 1px at a time). Needs a screen
  recording, the browser and the pointing device. Suspect: React's menu highlight trails the CSS
  hover by ~50 ms; the first item counts as hovered for one frame on open.
- **Device checks** (only tested on React Native Web so far):
  - NativeSelect's iOS and Android menu;
  - the SVG engine's device paths (native-driver ripples, morphs written to native paths);
  - React Native toast swipe;
  - container measuring for Menu `submenu="auto"` (`measureInWindow`);
  - TouchTarget on Android (`useTouchTargetSlop`).
- **Full README pass:** only once things are stable.
