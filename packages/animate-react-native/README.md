# @pureform/animate-react-native

Scaffold for Native animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

Animated and Reanimated drivers should have separate entry points so consumers do not pull in
both engines. Those exports and optional peer dependencies will be added with their implementations.
Native/UI-thread execution must remain possible without routing every frame through JavaScript.

Use each engine's fastest compatible abstraction: Animated's native driver for supported
properties, and Reanimated UI-thread worklets/shared values or native animation facilities where
appropriate. Layout properties such as width cannot use Animated's native driver; use the
engine's supported layout/UI-thread path, or a JavaScript fallback where necessary. Do not
silently pull in Reanimated to accelerate the Animated entry point. Keep interpolation and
stagger coordination off the JavaScript thread where supported, and cross threads only for
required events rather than per-frame React updates. Preserve the same lifecycle semantics on
accelerated and fallback paths, with driver-selection and interruption tests plus device profiling.

This scaffold has no runtime API or behavior tests yet. It does not replace the existing engines
in `@pureform/rn-adapter` or the React Native binding.
