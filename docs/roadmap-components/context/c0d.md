# c0d: Inset focus ring (output context)

Commits: see `git log main..c0d-inset-focus-ring` (a feature commit and this context's docs
commit).

## Built

- `@pureform/material` (`packages/material/src/providers/index.ts`):
    - `type FocusRing = "outer" | "inset"`.
    - `interface MaterialStateOptions { focusRing?: FocusRing }`.
    - `materialState(opacities?, focusIndicator?, options?: MaterialStateOptions)`: a third,
      optional argument. `focusRing: "inset"` sets the theme's `focusIndicatorOuterOffset` to
      minus `focusIndicatorThickness` (`-3px` by default, `-4px` for a 4px ring), so the ring's
      outer edge sits on the element's border edge, drawn inside it. An explicit outer offset is
      ignored in inset mode. Default `"outer"`: output unchanged (same keys, same order).
- `@pureform/preset` (`packages/preset/src/state-layer.ts`): re-exports `FocusRing`, and its
  header comment documents that the ring's position is theme-level.
- Every component already draws its focus ring through `focusRing()` in
  `packages/preset/src/components/shared.ts` (`outlineOffset: token("focusIndicatorOuterOffset")`),
  and each component token defaults to the theme's value, so every component, base theme or named
  theme (`themes: { x: { state: materialState({}, {}, { focusRing: "inset" }) } }`), follows the
  choice with no per-component code or variant.
- Specs: `packages/preset/src/indication.spec.ts` gains a "focus ring" suite (default and
  explicit `outer` produce byte-identical `pureform()` output; inset gives `-3px`/`-4px`; inset
  changes no component spec and no other size token; a named theme can carry it).
  `packages/material/src/providers/providers.spec.ts` checks both modes at the provider.
- READMEs: `packages/material/README.md`, `packages/preset/README.md`.

## Deviations from the design

- The choice lives on the theme's state provider (`materialState`), not on binding-core's
  `Indication`. The phase file names binding-core as a place the indication passes through, but
  nothing needed to change there: the ring's position is a theme token, so it reaches the web
  (CSS vars) and React Native (resolved theme values) through the existing token paths, and the
  interaction source (forwarded or not) still drives the `focusVisible` condition as before.
- No new theme token (an "inner offset" role was considered): that would have added a var to the
  default theme output and broken byte-identity.

## Stubs and gaps

- No browser screenshot or component-suite case renders the inset mode yet. The preset specs
  prove every component's focus part reads the offset token, and that inset changes only that
  token; a visual check in `tests/browser-e2e-tests` (a named `inset` theme on the panda
  fixture) would be the follow-up, but it touches shared fixture files owned by no c0
  subphase.
- Runtime switching on a provider (dynamic theme) works through `overrides`
  (`{ "sizes.focusIndicatorOuterOffset": "-3px" }`), not through a dedicated
  `Indication.focusRing`. See open questions.
- Gap analysis §0.1 row 7 and §7 not edited (not an owned file); the orchestrator should mark
  row 7 done: "`materialState(..., { focusRing: "inset" })`".

## How to verify

- `cd packages/preset && bunx vitest run src/indication.spec.ts` (36 pass).
- `cd packages/material && bunx vitest run` (109 pass).
- `bunx tsc --noEmit -p tsconfig.json` in `packages/material` and `packages/preset`: clean.
- `omni run build test -f all -o continue`: everything passed except two 1000ms test timeouts
  under load (`rn-adapter` `geometry.spec.ts` drop shadows, `css-adapter`
  `stylesheet.spec.ts` @property), both untouched packages; each passes when rerun on its own.

## Notes for the next phases

- To get an inset ring, components need nothing: keep drawing the focus part with
  `focusRing(token)` from `shared.ts`. A component that clips its focus part
  (`overflow: hidden`) shows the inset ring but clips the outer one; that was true before.
- Never draw a focus indicator with a literal offset; read `focusIndicatorOuterOffset` so the
  theme's choice reaches it.

## Refactoring hints

None. Nothing generic was written: the change is one option on `materialState` and specs. The
existing `focusRing()` in `packages/preset/src/components/shared.ts` and `INDICATION_TOKENS` in
`state-layer.ts` were already the shared pieces.

- **What must not change:** default `pureform()` output (the new spec compares it as JSON with an
  explicit `focusRing: "outer"`), the component snapshots under
  `packages/preset/src/components/__snapshots__/`, and the recorded indication fixtures.

## Open questions

- Should `Indication` (binding-core) also take `focusRing`, so a provider's indication switches
  at runtime? It would need the theme's thickness to negate when the indication doesn't set one;
  on the web that means a `calc(-1 * var(...))` with the registry's var name, which
  `providerIndicationOverrides` doesn't have today.
- Compose's inset ring may sit a little further in than the border edge (an inner padding); we
  put its outer edge on the border edge. Not confirmed against Compose's source values.
- React Native draws `outlineOffset` natively (new architecture); a negative offset is expected
  to draw inside, but it hasn't been checked on a device.
