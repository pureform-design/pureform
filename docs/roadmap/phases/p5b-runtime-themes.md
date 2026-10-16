# p5b: Runtime themes and server rendering of themes

**Depends on:** p3c  
**Runs in parallel with:** p5a

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §5.6, §5.7 (runtime themes, `hydrate`).
- Output contexts: p2a, p2b, p3c.

## Goal

Fill the provider's `theme`, `overrides`, and `hydrate` stubs.

## Scope

- Small overrides as inline CSS vars on the provider's element.
- Whole themes (seed color or loaded): both schemes' vars in one `<style>` block, scoped
  by a hash of the theme's input, put in `<head>` with `useHead` (Solid) and
  `<style href precedence>` (React); Panda's theme CSS as a string.
- `hydrate: "reuse"` (default) and `"regenerate"`; the generators load lazily.

## Done when

- Server-rendering tests: a runtime theme renders on the server and hydrates without
  regenerating under `"reuse"`.

## Output context (required)

When done, write `docs/roadmap/context/p5b.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The provider's theme API and the head-tag mechanics per framework.
