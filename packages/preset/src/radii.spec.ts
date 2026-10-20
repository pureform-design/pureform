import { describe, expect, it } from "vitest";

import { pureform } from "./index";

// Roundedness is the theme's: a shape theme rescales the radius roles (`sharp` squares every
// corner, `soft` halves them), so a corner set as a fixed length would ignore it. Every radius,
// in a style or a token, comes from the roles, scaled or combined (2px is half of extraSmall).
// The one exception is a component whose geometry is the shape (a circular progress indicator
// must stay round), named on the allow-list below with its reason. An entry with no reason, or
// one that no longer matches a fixed radius, fails the check.
const RADIUS = /radius/i;

/** The fixed lengths inside a value: px numbers other than 0. */
const fixedLengths = (value: unknown, found: number[] = []): number[] => {
    if (Array.isArray(value)) {
        for (const item of value) fixedLengths(item, found);
    } else if (value && typeof value === "object") {
        const node = value as { type?: string; unit?: string; value?: number };
        if (node.type === "numeric" && node.unit === "px" && node.value !== 0) {
            found.push(node.value!);
        }
        for (const child of Object.values(value)) fixedLengths(child, found);
    }
    return found;
};

/** Every radius in a component, with where it is and the fixed lengths in it. */
const radii = (
    value: unknown,
    path: string,
    out: { path: string; lengths: number[] }[] = [],
) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) {
            const at = `${path}.${key}`;
            if (RADIUS.test(key)) {
                const lengths = fixedLengths(child);
                if (lengths.length > 0) out.push({ path: at, lengths });
            } else {
                radii(child, at, out);
            }
        }
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => radii(item, `${path}[${index}]`, out));
    }
    return out;
};

/**
 * Components whose geometry is the shape, so a fixed radius is kept on purpose: a circular
 * progress indicator stays round under a theme that squares every corner. Keyed by component,
 * then by the radius's path inside it (as the check reports it, for example `base.borderRadius`),
 * each with the reason. Exceptions are for geometry, not taste.
 */
const ALLOWED: Allowed = {};

type Allowed = Record<string, Record<string, string>>;
type Found = { path: string; lengths: number[] };

/** Splits the fixed radii into the allowed and the not, and reports entries that are wrong. */
const checkRadii = (found: Found[], allowed: Allowed) => {
    const used = new Set<string>();
    const fixed: Found[] = [];
    for (const radius of found) {
        const [component, ...rest] = radius.path.split(".");
        const at = rest.join(".");
        if (allowed[component!]?.[at] !== undefined)
            used.add(`${component}.${at}`);
        else fixed.push(radius);
    }
    const unreasoned: string[] = [];
    const stale: string[] = [];
    for (const [component, entries] of Object.entries(allowed)) {
        for (const [at, reason] of Object.entries(entries)) {
            const key = `${component}.${at}`;
            if (reason.trim() === "") unreasoned.push(key);
            if (!used.has(key)) stale.push(key);
        }
    }
    return { fixed, unreasoned, stale };
};

const fixedRadii = (components: Record<string, object>) =>
    Object.entries(components).flatMap(([name, spec]) => radii(spec, name));

describe("radii", () => {
    it("follow the theme's shape roles in every component, apart from the allowed", () => {
        const result = checkRadii(
            fixedRadii(pureform().components as Record<string, object>),
            ALLOWED,
        );
        expect(result).toEqual({ fixed: [], unreasoned: [], stale: [] });
    });

    describe("the allow-list", () => {
        const px = (value: number) => ({ type: "numeric", unit: "px", value });
        const components = {
            ring: { base: { borderRadius: px(9999) } },
            button: { base: { borderRadius: px(4) } },
        };

        it("lets an allowed radius through and still fails the others", () => {
            const result = checkRadii(fixedRadii(components), {
                ring: {
                    "base.borderRadius": "the ring's geometry is a circle",
                },
            });
            expect(result).toEqual({
                fixed: [{ path: "button.base.borderRadius", lengths: [4] }],
                unreasoned: [],
                stale: [],
            });
        });

        it("fails an entry without a reason", () => {
            const result = checkRadii(fixedRadii(components), {
                ring: { "base.borderRadius": " " },
                button: { "base.borderRadius": "" },
            });
            expect(result.fixed).toEqual([]);
            expect(result.unreasoned).toEqual([
                "ring.base.borderRadius",
                "button.base.borderRadius",
            ]);
        });

        it("fails an entry that no longer matches anything", () => {
            const result = checkRadii(fixedRadii(components), {
                ring: {
                    "base.borderRadius": "a circle",
                    "base.gone": "a circle",
                },
                missing: { "base.borderRadius": "a circle" },
                button: { "base.borderRadius": "a fixture" },
            });
            expect(result.stale).toEqual([
                "ring.base.gone",
                "missing.base.borderRadius",
            ]);
        });
    });
});
