# @pureform/web-contracts

The web wire names shared by bindings and compilers. This leaf package has no browser APIs,
binding, styling, or CSS-lowering dependency. Its only production dependency is core, used
for semantic condition types; none of its runtime exports imports core.

| Export                                                   | Wire value / purpose                                                                                                                                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STATE_ATTRIBUTES`                                       | `hover → data-pf-hover`, `pressed → data-pf-active`, `dragged → data-pf-dragging`, `filled → data-pf-filled`, `mirrored → data-pf-mirror`, `overflowing → data-pf-overflowing`, `descending → data-pf-descending` |
| `AttributeState`, `StateAttribute`                       | Semantic map keys and web attribute-name union                                                                                                                                                                    |
| `MOTION_ATTRIBUTE`                                       | `data-pf-motion` (`reduce` or `full`; absent for system)                                                                                                                                                          |
| `REDUCED_MOTION_QUERY`                                   | `(prefers-reduced-motion: reduce)`                                                                                                                                                                                |
| `PART_ATTRIBUTE`, `SCOPE_ATTRIBUTE`, `TEST_ID_ATTRIBUTE` | `data-pf-part`, `data-scope`, `data-testid`                                                                                                                                                                       |
| `PartAttributes`                                         | The three anatomy attributes                                                                                                                                                                                      |

Portable state unions and motion mathematics remain in `@pureform/core`. Anatomy identities,
`partTestId`, `TestIdOverride`, `partSlot`, and `kebabCase` remain in `@pureform/anatomy`.
HTML object construction (`partAttributes`, `stateAttributes`, `partSources`, and provider
projection) belongs to `@pureform/binding-web`; CSS lowering imports these wire names directly,
never the binding.

Scaffold: Omni MCP `ts-package` (lib, unit tests, no integration tests, unpublished), generated
in `/tmp/opencode/platform-phase1-generated/web-contracts` to preserve interrupted source work.
The boilerplate was reconciled with nearby packages: workspace config dependencies, no unused
log/Zod dependencies or example addition code, `sideEffects: false`, and a core type dependency.
Release insertion was disabled for that temporary output; the real package is in the core train.

Validation: Omni `build`, `check:types`, and `test:unit` for `@pureform/web-contracts`.
