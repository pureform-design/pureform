import { STATE_ATTRIBUTES } from "@pureform/core";
import type { PortableCondition, SlotState } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { conditionKey } from "./conditions";
import type { LowerCtx } from "./context";

const ctx: LowerCtx = {
    config: { tokens: {}, semanticTokens: {} } as unknown as CoreConfig,
    prefix: undefined,
    target: "css",
    tokenRef: (ref) => `var(--${ref})`,
    slot: { className: "box", name: "root" },
};

const STATES: PortableCondition[] = [
    "hover",
    "focus",
    "focusVisible",
    "active",
    "pressed",
    "dragged",
    "disabled",
    "selected",
    "checked",
    "invalid",
    "readOnly",
    "filled",
    "expanded",
    "mirrored",
];

const SLOT_STATES: SlotState[] = [
    "hover",
    "selected",
    "checked",
    "indeterminate",
    "pressed",
    "focusWithin",
    "focusVisibleWithin",
    "filled",
    "expanded",
    "invalid",
    "disabled",
];

const slotKey = (state: SlotState) =>
    conditionKey({ type: "slot", slot: "root", state }, ctx);

// Every data attribute a selector names.
const dataAttributes = (selector: string): string[] =>
    [...selector.matchAll(/\[(data-[\w-]+)/g)].map(([, name]) => name!);

describe("state selectors", () => {
    it("match no data attribute but pureform's own", () => {
        const allowed: string[] = Object.values(STATE_ATTRIBUTES);
        for (const key of [
            ...STATES.map((state) => conditionKey(state, ctx)),
            ...SLOT_STATES.map(slotKey),
        ]) {
            for (const name of dataAttributes(key)) {
                expect(allowed).toContain(name);
            }
        }
    });

    it("match the native state, then ARIA, then data-pf", () => {
        expect(conditionKey("hover", ctx)).toBe(
            "&:is(:hover, [data-pf-hover])",
        );
        expect(conditionKey("pressed", ctx)).toBe(
            "&:is(:active, [data-pf-active])",
        );
        expect(conditionKey("focusVisible", ctx)).toBe("&:focus-visible");
        expect(conditionKey("checked", ctx)).toBe(
            "&:is(:checked, [aria-checked=true])",
        );
        expect(conditionKey("disabled", ctx)).toBe(
            "&:is(:disabled, [aria-disabled=true])",
        );
        expect(conditionKey("expanded", ctx)).toBe("&[aria-expanded=true]");
    });

    it("match a mirrored element on data-pf-mirror", () => {
        expect(conditionKey("mirrored", ctx)).toBe("&[data-pf-mirror]");
    });

    it("agree between a condition and the slot state of the same name", () => {
        // The slot state's selector also matches a control inside the slot, so each of the
        // condition's alternatives appears in it.
        const alternatives = (key: string) =>
            key
                .replace(/^&:is\((.*)\)$/, "$1")
                .replace(/^&/, "")
                .split(/, (?![^(]*\))/);
        for (const state of [
            "hover",
            "pressed",
            "selected",
            "filled",
        ] as const) {
            const slot = slotKey(state);
            for (const alternative of alternatives(conditionKey(state, ctx))) {
                expect(slot).toContain(alternative);
            }
        }
        expect(slotKey("disabled")).toContain("[aria-disabled=true]");
        expect(slotKey("checked")).toContain("[aria-checked=true]");
    });
});
