# @pureform/animate-web

Scaffold for browser animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

React and Solid share the browser implementation. Framework lifecycle hooks belong in their
existing binding packages; separate animation engines per framework are not needed.

CSS first, by default: express animations as CSS (transitions, keyframes, `animation-delay`,
custom properties) and let the browser run them. Try hard to fit a motion into CSS before
leaving it, including by precomputing timing (a stagger's per-item delays, a spring's sampled
`linear()` curve) so the browser needs no per-frame JavaScript. Use the Web Animations API, then
a JavaScript driver, only as fallbacks when CSS cannot express the motion correctly (for example
interruption that must carry velocity, or values only known at runtime). Batch layout
reads/writes; do not require framework renders or computed-style reads on every frame. Width and
height still involve layout even when browser-native animation executes them. Choose fast paths
by capability and validate performance rather than assume every browser-native path is faster.

This scaffold has no runtime API or behavior tests yet. Browser targets, animation values and
playback controls will be introduced with tested implementations, not placeholder exports.
