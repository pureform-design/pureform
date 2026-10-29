# @pureform/animate-core

Scaffold for platform-neutral runtime animation coordination and driver contracts, starting with
stagger. This is separate from `@pureform/core`, which owns the styling AST and config contract.

Core must not depend on a framework, the DOM, React Native, or a platform clock. Drivers own host
updates and animation execution; the contract must permit native/UI-thread execution without
requiring a JavaScript callback on every frame.

Applications import `@pureform/animate-web` or `@pureform/animate-react-native`, not this package.
Adapters wrap core with their own Motion-like public APIs rather than expose core directly.
Component measurement, layout and accessibility remain in the bindings.

This scaffold has no runtime API or behavior tests yet. Fixed-delay stagger and spring-driven
visibility progression are distinct capabilities. Existing animation code is not migrated here.
