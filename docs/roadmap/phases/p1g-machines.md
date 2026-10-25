# p1g: @pureform/machines

**Depends on:** nothing  
**Runs in parallel with:** p1a, p1b, p1c, p1d, p1e, p1f, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §8, §9.4, §9.5 ([doc](../../design/component-architecture.md)).
- The output contexts (`/tmp/opencode/<id>.md`) of the phases this depends on, if they still exist.

## Goal

Create the framework-free behavior package: Zag re-exports and pureform's own machines in Zag's shape.

## Scope

- Scaffold `packages/machines`.
- Re-export the Zag machines components use (`checkbox`, `switch`, `radio-group`, …) so
  bindings depend on one package.
- Own machines in Zag's shape (`machine` + `connect`), using Zag's `bindable`
  controllable-state semantics: a button machine (press, focus, optional toggle with
  `selected`/`defaultSelected`/`onSelectedChange`). Leave the text field and slider
  machines as stubs for p6.
- Framework-free form helpers: setting a native input's default from a `default*` prop,
  listening for the form's `reset` and sending the machine its default, and tracking a
  disabled fieldset (`trackFormControl` from `@zag-js/dom-query`).
- The ripple: a thin wrapper over `@pureform/js-effects`'s ripple, in the same shape.

## Done when

- Unit tests for the button machine's states and controlled behavior, and for the form
  helpers (in browser mode, since they need a real form).

## Output context (required)

When done, write `/tmp/opencode/p1g.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- Each machine's props, the API its `connect` returns, and which parts it expects.
- The form helpers' signatures, which p2a and p2b wire in.
