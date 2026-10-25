# p3c: Demo wiring and shared browser suites

**Depends on:** p3a (and p3b for the React half)  
**Runs in parallel with:** nothing; runs after p3a and p3b

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.7 (testing), §9.4, §9.5, §9.7, §13.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p3a, p3b, p1c (mirrored-box helper).

## Goal

Put button and checkbox in `solid-demo` and prove the cross-cutting rules with shared suites.

## Scope

- `solid-demo`: a page using `PureformProvider` with the hand-written registry, and
  button and checkbox in their variants.
- Shared suites under `tests/`, run against Solid and React:
    - controlled and uncontrolled rules (§9.4);
    - forms: `FormData`, reset (bindings own it), disabled fieldsets (closes §13's last
      risk), `required` and `error`;
    - accessibility with axe, and keyboard;
    - direction: mirrored boxes and arrow keys in both directions;
    - server rendering: render on the server, hydrate, and compare classes, `style`,
      `data-*`, and `aria-*` between the server HTML and the hydrated DOM.

## Done when

- All suites pass for both bindings; the §13 risk is closed in the design doc.

## Output context (required)

When done, write `/tmp/opencode/p3c.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- How to add a component to each shared suite (p6 does it for every component).
- Anything the suites found in p2 or p3 and how it was fixed.
