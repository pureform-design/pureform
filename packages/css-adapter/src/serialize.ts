// Serialize lowered style objects to nested CSS.
//
// A style object holds properties, nested rules keyed by a selector or an at-rule, and
// conditional values (`{ base, [key]: value }`). Plain CSS nests rules, not values, so each
// conditional value is turned inside out: its base stays on the rule, and each case goes into
// the nested rule for its key, merged with any other property under the same key.

import { hyphenate } from "@pureform/css-lowering";

import { DARK, LIGHT } from "./options";

/** A rule: its declarations, then its nested rules by selector or at-rule. */
export interface Block {
    decls: [property: string, value: string][];
    rules: Map<string, Block>;
}

export const block = (): Block => ({ decls: [], rules: new Map() });

/** Where a color scheme condition applies, relative to the rule it's in. */
export type SchemeRules = Record<string, string[][]>;

/** Inside an element's rule: under a scheme class on an ancestor, or the system scheme when
 *  the root doesn't set the other. */
export const ELEMENT_SCHEMES: SchemeRules = {
    [DARK]: [
        [".dark &"],
        ["@media (prefers-color-scheme: dark)", ":root:not(.light) &"],
    ],
    [LIGHT]: [
        [".light &"],
        ["@media (prefers-color-scheme: light)", ":root:not(.dark) &"],
    ],
};

/** Inside the root's rule, where the scheme class sits on the root itself. */
export const ROOT_SCHEMES: SchemeRules = {
    [DARK]: [
        ["&.dark"],
        ["@media (prefers-color-scheme: dark)", "&:not(.light)"],
    ],
    [LIGHT]: [
        ["&.light"],
        ["@media (prefers-color-scheme: light)", "&:not(.dark)"],
    ],
};

// A key that starts a nested rule rather than naming a property.
const isRuleKey = (key: string): boolean =>
    key.startsWith("@") || key.includes("&") || /^[.:[*>~+]/.test(key);

const property = (key: string): string =>
    key.startsWith("--") ? key : hyphenate(key);

const descend = (target: Block, path: string[]): Block => {
    let at = target;
    for (const key of path) {
        let next = at.rules.get(key);
        if (!next) {
            next = block();
            at.rules.set(key, next);
        }
        at = next;
    }
    return at;
};

const paths = (key: string, schemes: SchemeRules): string[][] =>
    schemes[key] ?? [[key]];

const addConditional = (
    target: Block,
    prop: string,
    value: unknown,
    schemes: SchemeRules,
) => {
    if (typeof value === "string") {
        target.decls.push([prop, value]);
        return;
    }
    for (const [key, inner] of Object.entries(
        value as Record<string, unknown>,
    )) {
        if (key === "base") {
            addConditional(target, prop, inner, schemes);
            continue;
        }
        for (const path of paths(key, schemes)) {
            addConditional(descend(target, path), prop, inner, schemes);
        }
    }
};

/** Add a lowered style object to a rule. */
export const addStyle = (
    target: Block,
    style: Record<string, unknown>,
    schemes: SchemeRules = ELEMENT_SCHEMES,
): Block => {
    for (const [key, value] of Object.entries(style)) {
        if (value === undefined) continue;
        if (isRuleKey(key) || key in schemes) {
            for (const path of paths(key, schemes)) {
                addStyle(
                    descend(target, path),
                    value as Record<string, unknown>,
                    schemes,
                );
            }
        } else {
            addConditional(target, property(key), value, schemes);
        }
    }
    return target;
};

const isEmpty = (target: Block): boolean =>
    target.decls.length === 0 && [...target.rules.values()].every(isEmpty);

const INDENT = "    ";

/** A rule's body: its declarations, then its nested rules. */
export const printBody = (target: Block, depth: number): string[] => {
    const pad = INDENT.repeat(depth);
    const lines = target.decls.map(
        ([prop, value]) => `${pad}${prop}: ${value};`,
    );
    for (const [key, inner] of target.rules) {
        lines.push(...printRule(key, inner, depth));
    }
    return lines;
};

/** A rule as lines of CSS, or none when it declares nothing. */
export const printRule = (
    selector: string,
    target: Block,
    depth = 0,
): string[] => {
    if (isEmpty(target)) return [];
    const pad = INDENT.repeat(depth);
    return [`${pad}${selector} {`, ...printBody(target, depth + 1), `${pad}}`];
};
