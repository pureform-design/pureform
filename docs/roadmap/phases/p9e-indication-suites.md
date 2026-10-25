# p9e: Indication suites and demos

**Depends on:** p9c (and p9d for the React Native half)  
**Runs in parallel with:** nothing; runs after p9c and p9d

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.8 ("Testing"), §9.7.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p9c, p9d, p3c, p5a, p6e.

## Goal

Prove indication's rules for every interactive component, on every binding and target, and
show it in the demos.

## Scope

- An `indication` suite in `tests/component-suites`, reading each case's anatomy entry:
    - hover, press, keyboard focus, and the slider's drag change the surface's computed color;
    - a press adds a ripple to the layer, from the center when `centered`, and none under
      reduced motion;
    - `noIndication` on the provider leaves the color unchanged and keeps the focus indicator;
    - a component's `indication` prop doesn't reach a nested component, of the same kind or
      another;
    - a shared source shows a press on a second component through `data-pf-active`, never
      forwards focus, and `useInteractionState` reports it;
    - disabling a pressed component ends the press;
    - an app's own interaction kind reaches subscribers and leaves the built-in state alone;
    - server rendering with a custom indication hydrates without warnings.
- The same rules on RN-web in `tests/browser-e2e-tests`.
- A benchmark: mount 1,000 list items with and without the layer element, recording mount time
  and style recalculation in Chromium, and the same with eager and lazily created sources. The
  output context records the numbers and recommends whether the layer or the sources should
  become lazy.
- `solid-demo`'s `/components` page and `rn-web-demo` gain an indication switch (Material,
  no ripple, none) and a shared-source example.

## Done when

- The suite passes for every interactive component in both bindings on all six projects, and
  on RN-web.

## Output context (required)

When done, write `/tmp/opencode/p9e.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- How a new interactive component joins the suite.
- Anything the suite found in p9a to p9d and how it was fixed.
