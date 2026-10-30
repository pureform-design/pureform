# @pureform/animate-react-native

Scaffold for Native animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

Animated and Reanimated drivers should have separate entry points so consumers do not pull in
both engines. Those exports and optional peer dependencies will be added with their implementations.
Native/UI-thread execution must remain possible without routing every frame through JavaScript.

Choose the fastest available path first, per property and engine: Animated's native driver for
supported properties, then Reanimated's UI-thread CSS-style animations, worklets and shared
values, and only then JavaScript-driven values as a fallback. Precompute timing (such as a
stagger's per-item delays) so the fast path needs no per-frame JavaScript. Layout properties such as width cannot use Animated's native driver; use the
engine's supported layout/UI-thread path, or a JavaScript fallback where necessary. Do not
silently pull in Reanimated to accelerate the Animated entry point. Keep interpolation and
stagger coordination off the JavaScript thread where supported, and cross threads only for
required events rather than per-frame React updates. Preserve the same lifecycle semantics on
accelerated and fallback paths, with driver-selection and interruption tests plus device profiling.

It has one capability so far: `stagger`, the same sampled waits as `@pureform/animate-web`'s, from the
same spring (`animate-core`'s `staggerOnSpring`; a test checks the two agree), for the engine to hand
to its fastest path. The FAB menu uses it with an Animated width spring for each item's reveal. It
does not replace the existing engines in `@pureform/rn-adapter` or the React Native binding. Animated
and Reanimated entry points, and other drivers, will be added when something needs them, not as
placeholder exports.

The adapter also exposes `MotionClock`, `MotionChannel`, `MotionTimeline` and `channelAt` for
coordinated scalar motion. The existing Native engine layer implements the clock contract through
`@pureform/rn-adapter/animated`'s `useMotionTimeline`: one Animated value per named clock, with
derived native arithmetic/interpolation nodes, not per-frame React updates. Transform and opacity
channels use Animated's native driver on devices, even under the Reanimated engine; Native Web
uses its JS fallback. These channels are not a native-driver layout/width API.

Geometry changes replace derived nodes but keep a clock's phase. Changing a clock's timing
restarts that clock only; disabling it resets it to the first frame, and removal/unmount stops it.
Bindings own measurement and reduced-motion policy. A custom engine can implement the same
generic timeline contract with its own host/value types and report a UI-thread driver instead.
