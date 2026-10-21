// Two variant groups must not set the same property on the same slot. Panda emits a slot
// recipe's variant classes sorted by class name, while the CSS and Tailwind targets emit them in
// the order the groups are defined, so where two groups' rules set one property the targets pick
// different winners. Set a token (or a 0/1 flag) in one group and read it in the base or the
// other group instead (component-architecture.md §5.5).

import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

/** Pairs that may overlap, as `component group=value × group=value slot`, with the reason. */
const ALLOWED: Record<string, string> = {
    "toolbar placement=docked × orientation=vertical root":
        "M3's docked toolbar is horizontal only, so the docked width never meets the vertical one",
};

type Style = Record<string, unknown>;

const isRecord = (v: unknown): v is Style =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const conditionKey = (on: unknown): string =>
    Array.isArray(on)
        ? JSON.stringify(on.map((c) => JSON.stringify(c)).sort())
        : JSON.stringify([JSON.stringify(on)]);

/** Every property a slot's style sets, keyed by the property and the conditions it is set
 *  under: a `when` sets its base and each case, a state block its state, and `apply` the
 *  utility's properties. Tokens count as properties of their own. */
const settings = (config: CoreConfig, slot: string, style: Style) => {
    const out = new Map<string, string>();
    const value = (property: string, v: unknown, conditions: string[]) => {
        if (isRecord(v) && v.type === "conditional") {
            value(property, v.base, conditions);
            for (const c of v.cases as { on: unknown; value: unknown }[]) {
                value(property, c.value, [...conditions, conditionKey(c.on)]);
            }
            return;
        }
        out.set(
            `${property} ${[...conditions].sort().join(" ")}`.trim(),
            JSON.stringify(v),
        );
    };
    const walk = (map: Style, conditions: string[]) => {
        for (const [key, v] of Object.entries(map)) {
            if ((key === "tokens" || key === "providedTokens") && isRecord(v)) {
                for (const [token, t] of Object.entries(v)) {
                    value(`${key}.${token}`, t, conditions);
                }
            } else if (key === "apply" && isRecord(v)) {
                for (const [utility, level] of Object.entries(v)) {
                    const values = (
                        config.utilities?.[utility] as
                            | { values?: Record<string, Style> }
                            | undefined
                    )?.values;
                    walk(values?.[level as string] ?? {}, conditions);
                }
            } else if (key === "states" && isRecord(v)) {
                for (const [state, s] of Object.entries(v)) {
                    if (!isRecord(s)) continue;
                    walk(s, [
                        ...conditions,
                        conditionKey({ type: "slot", slot, state }),
                    ]);
                }
            } else if (isRecord(v) && !("type" in v)) {
                walk(v, [...conditions, key]);
            } else {
                value(key, v, conditions);
            }
        }
    };
    walk(style, []);
    return out;
};

/** Every pair of values from two groups that set one property on one slot. */
export const variantOverlaps = (config: CoreConfig) => {
    const found: { pair: string; properties: string[] }[] = [];
    for (const [name, component] of Object.entries(config.components ?? {})) {
        const variants = (
            component as { recipe?: { variants?: Record<string, unknown> } }
        ).recipe?.variants as
            | Record<string, Record<string, Record<string, Style>>>
            | undefined;
        if (!variants) continue;
        const groups = Object.keys(variants);
        groups.forEach((a, i) => {
            for (const b of groups.slice(i + 1)) {
                for (const [va, slotsA] of Object.entries(variants[a]!)) {
                    for (const [vb, slotsB] of Object.entries(variants[b]!)) {
                        for (const [slot, styleA] of Object.entries(slotsA)) {
                            const styleB = slotsB[slot];
                            if (!styleB) continue;
                            const setB = settings(config, slot, styleB);
                            const properties = [
                                ...settings(config, slot, styleA).keys(),
                            ].filter((k) => setB.has(k));
                            if (properties.length > 0) {
                                found.push({
                                    pair: `${name} ${a}=${va} × ${b}=${vb} ${slot}`,
                                    properties,
                                });
                            }
                        }
                    }
                }
            }
        });
    }
    return found;
};

describe("variant groups", () => {
    const overlaps = variantOverlaps(pureform());

    it("never set the same property on the same slot, except the allowed pairs", () => {
        expect(overlaps.filter(({ pair }) => !(pair in ALLOWED))).toEqual([]);
    });

    it("allow only pairs that still overlap", () => {
        const pairs = new Set(overlaps.map(({ pair }) => pair));
        expect(Object.keys(ALLOWED).filter((p) => !pairs.has(p))).toEqual([]);
    });

    it("are caught when they overlap under a condition, through a utility, or in a state", () => {
        const recipe = (variants: Record<string, unknown>) =>
            ({
                utilities: {
                    shadowElevation: {
                        values: { level1: { boxShadow: "a" } },
                    },
                },
                components: { x: { recipe: { variants } } },
            }) as unknown as CoreConfig;
        const hover = { type: "slot", slot: "root", state: "hover" };
        expect(
            variantOverlaps(
                recipe({
                    a: {
                        on: {
                            root: {
                                color: {
                                    type: "conditional",
                                    base: "x",
                                    cases: [{ on: hover, value: "y" }],
                                },
                                apply: { shadowElevation: "level1" },
                            },
                        },
                    },
                    b: {
                        on: {
                            root: {
                                states: { hover: { color: "z" } },
                                boxShadow: "b",
                                backgroundColor: "c",
                            },
                        },
                    },
                }),
            ),
        ).toEqual([
            {
                pair: "x a=on × b=on root",
                properties: [`color ${conditionKey(hover)}`, "boxShadow"],
            },
        ]);
    });
});
