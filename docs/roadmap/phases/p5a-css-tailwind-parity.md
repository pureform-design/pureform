# p5a: CSS and Tailwind targets

**Depends on:** p3c, p4c  
**Runs in parallel with:** p5b

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.2, §5.6, §12 step 5.
- Output contexts: p3c, p4b-css, p4b-tailwind, p4c.

## Goal

Run the Solid components on the CSS and Tailwind targets, and move `css-demo` and `tailwind-demo` to the generated registry.

## Scope

- Theme scoping through each target's attribute (`data-theme`, Tailwind's
  `@custom-variant`), exposed as `themeAttributes(name)`.
- The shared suites from p3c run on all three web targets.

## Done when

- p3c's suites pass on Panda, CSS, and Tailwind.

## Output context (required)

When done, write `docs/roadmap/context/p5a.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Per target: setup steps for an app, and any difference in behavior.
