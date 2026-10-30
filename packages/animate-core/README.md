# @pureform/animate-core

Scaffold for platform-neutral runtime animation coordination and driver contracts, starting with
stagger. This is separate from `@pureform/core`, which owns the styling AST and config contract.

Core must not depend on a framework, the DOM, React Native, or a platform clock. Drivers own host
updates and animation execution; the contract must permit native/UI-thread execution without
requiring a JavaScript callback on every frame.

The shared contract describes animation intent, not a mandatory frame loop. Adapters select the
fastest compatible platform abstraction by capability, target and animated property (CSS first on
the web, the fastest native path first on React Native, JavaScript only as a fallback). Core
prefers precomputed timing, such as stagger delays, that any driver can hand to its fastest path;
core must
not force accelerated work through JavaScript or framework renders. Keep values and coordinated
stagger execution on the driver's execution thread where supported, notifying bindings of
visibility boundaries or lifecycle events rather than every frame. Fall back only for unsupported
capabilities, preserving interruption, completion, cleanup and reduced-motion semantics.

Applications import `@pureform/animate-web` or `@pureform/animate-react-native`, not this package.
Adapters wrap core with their own Motion-like public APIs rather than expose core directly.
Component measurement, layout and accessibility remain in the bindings.

Two capabilities so far. `staggerDelays` turns a progression curve into one wait per item, relative
to the first item to move. `staggerOnSpring` samples a spring into that curve (and reports its settle
time), so the web and React Native run the same sequence from the same spring. Fixed-delay stagger
and spring-driven visibility progression are distinct capabilities; this is the second, sampled into
plain numbers a driver can hand to its fastest path (a CSS `animation-delay`, a native delay). It
depends only on `@pureform/core` for the spring math, and has no host, timer or framework
dependency. Existing animation code is not migrated here.
