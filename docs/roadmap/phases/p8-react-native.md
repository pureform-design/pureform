# p8: @pureform/react-native

**Depends on:** p2b, p4b-rn  
**Runs in parallel with:** p5, p6, p7

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.1, §5.3, §5.8, §9.6, §12 step 7.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p2b, p4b-rn, p1f.

## Goal

Move the React Native components out of `rn-web-demo` onto the shared anatomy and the `StyleFactory`.

## Scope

- `useStyles`/`useStyleFactory` over p4b-rn's factories, with the per-selection cache.
- `motion="system"` from `AccessibilityInfo`; `dir` from `I18nManager`.
- `useIconStyle()` for icons.
- Port the demo's components, then point `rn-web-demo` at the package.

## Done when

- `rn-web-demo` renders from the package; its e2e tests pass.

## Output context (required)

When done, write `/tmp/opencode/p8.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The package's API and how the demo uses it.
