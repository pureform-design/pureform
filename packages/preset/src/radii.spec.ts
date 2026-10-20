import { describe, expect, it } from "vitest";

import { pureform } from "./index";

// Roundedness is the theme's: a shape theme rescales the radius roles (`sharp` squares every
// corner, `soft` halves them), so a corner set as a fixed length would ignore it. Every radius,
// in a style or a token, comes from the roles, scaled or combined (2px is half of extraSmall).
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

describe("radii", () => {
    it("follow the theme's shape roles in every component", () => {
        const components = pureform().components as Record<string, object>;
        const fixed = Object.entries(components).flatMap(([name, spec]) =>
            radii(spec, name),
        );
        expect(fixed).toEqual([]);
    });
});
