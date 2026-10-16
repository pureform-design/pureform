# p1h: Versioning configuration

**Depends on:** nothing  
**Runs in parallel with:** every other p1 subphase

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §11 ([doc](../../design/component-architecture.md)).
- The output contexts of the phases this depends on, if any.

## Goal

Set up cocogitto for the lockstep core train and independent bindings.

## Scope

- `cog.toml`: the core train's packages move to the global tag, and its bump hook sets
  every train package's version; bindings (`@pureform/solid`, later `react`,
  `react-native`) keep package tags.
- Add the packages missing from `cog.toml`: `theme`, `material`, `utils`, `js-effects`,
  `type-utils`, and the new p1 packages once they exist.
- The build-time train check and the development warning are p4a and p2a/p2b work, not
  this one.

## Done when

- `cog bump --dry-run` (or the equivalent) shows the train bumping together and a binding
  bumping alone.

## Output context (required)

When done, write `docs/roadmap/context/p1h.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Which packages are in the train, and how to add a new one.
- How a release is cut.
