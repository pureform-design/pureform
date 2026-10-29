# @pureform/animate-web

Scaffold for browser animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

React and Solid share the browser implementation. Framework lifecycle hooks belong in their
existing binding packages; separate animation engines per framework are not needed.

Prefer browser-native execution (Web Animations API and compositor-eligible properties where
supported), with CSS/native timelines where they satisfy the contract. Use a JavaScript driver
only when the target, property or coordination cannot run correctly on that path. Batch layout
reads/writes; do not require framework renders or computed-style reads on every frame. Width and
height still involve layout even when browser-native animation executes them. Choose fast paths
by capability and validate performance rather than assume every browser-native path is faster.

This scaffold has no runtime API or behavior tests yet. Browser targets, animation values and
playback controls will be introduced with tested implementations, not placeholder exports.
