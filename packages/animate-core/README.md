# @pureform/animate-core

Scaffold for platform-neutral runtime animation coordination and driver contracts, starting with
stagger. This is separate from `@pureform/core`, which owns the styling AST and config contract.

Core must not depend on a framework, the DOM, React Native, or a platform clock. Drivers own host
updates and animation execution; the contract must permit native/UI-thread execution without
requiring a JavaScript callback on every frame.

The shared contract describes animation intent, not a mandatory frame loop. Adapters select the
fastest compatible platform abstraction by capability, target and animated property; core must
not force accelerated work through JavaScript or framework renders. Keep values and coordinated
stagger execution on the driver's execution thread where supported, notifying bindings of
visibility boundaries or lifecycle events rather than every frame. Fall back only for unsupported
capabilities, preserving interruption, completion, cleanup and reduced-motion semantics.

Applications import `@pureform/animate-web` or `@pureform/animate-react-native`, not this package.
Adapters wrap core with their own Motion-like public APIs rather than expose core directly.
Component measurement, layout and accessibility remain in the bindings.

This scaffold has no runtime API or behavior tests yet. Fixed-delay stagger and spring-driven
visibility progression are distinct capabilities. Existing animation code is not migrated here.
