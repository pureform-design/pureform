// Scalar node builders: raw literals and unit-encoded numerics.
import type { LiteralScalarNode, NumericScalarNode, Unit } from "../nodes";

/** Raw opaque string, the off-baseline escape (`"100vh"`, a vendor value). Numbers are not
 *  accepted here; use `numeric` or the `unit.*` sugar so a unit is always encoded. For a
 *  baseline keyword (`flex`, `center`, `solid`, `transparent`) use the typed `keyword.*`
 *  helpers instead, so the value stays portable and type-checked. */
export const literal = (value: string): LiteralScalarNode => ({
    type: "literal",
    value,
});

/** Numeric value with an explicit unit. Prefer the `unit.*` sugar at call sites. */
export const numeric = (value: number, unit: Unit): NumericScalarNode => ({
    type: "numeric",
    value,
    unit,
});
