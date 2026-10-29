# @pureform/animate-web

Scaffold for browser animation drivers and Motion-like public APIs wrapping
`@pureform/animate-core`. Applications import this adapter, not core.

React and Solid share the browser implementation. Framework lifecycle hooks belong in their
existing binding packages; separate animation engines per framework are not needed.

This scaffold has no runtime API or behavior tests yet. Browser targets, animation values and
playback controls will be introduced with tested implementations, not placeholder exports.
