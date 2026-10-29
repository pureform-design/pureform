# @pureform/animate-react-native

Scaffold for Native animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

Animated and Reanimated drivers should have separate entry points so consumers do not pull in
both engines. Those exports and optional peer dependencies will be added with their implementations.
Native/UI-thread execution must remain possible without routing every frame through JavaScript.

This scaffold has no runtime API or behavior tests yet. It does not replace the existing engines
in `@pureform/rn-adapter` or the React Native binding.
