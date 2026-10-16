import { buttonAnatomy, selectAnatomy } from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    forSlot,
    isIconPart,
    isUnstyled,
    partClasses,
    stateAttributes,
} from "./parts";
import type { StateAttributes } from "./parts";
import { combineProps, mergeStyleObjects } from "./props";
import type { CombineRules } from "./props";
import { withDefaults } from "./selection";

describe("stateAttributes", () => {
    it("writes an empty attribute for a state that's on, and none for one that's off", () => {
        expect(
            stateAttributes({ pressed: true, hover: false, mirrored: true }),
        ).toEqual({
            "data-pf-active": "",
            "data-pf-hover": undefined,
            "data-pf-mirror": "",
        });
    });

    it("leaves out the states not given", () => {
        expect(stateAttributes({ filled: true })).toEqual({
            "data-pf-filled": "",
        });
        expect(stateAttributes(undefined)).toEqual({});
    });

    it("is typed by the attribute names", () => {
        expectTypeOf(stateAttributes({})).toEqualTypeOf<StateAttributes>();
        // @ts-expect-error: not a state the bindings mark
        stateAttributes({ checked: true });
    });
});

describe("partClasses", () => {
    const slots = {
        root: { class: "r", style: { "--pf-a": "1" } },
        label: { class: "l" },
    } as const;

    it("returns the part's slot", () => {
        expect(partClasses(buttonAnatomy, "root", slots)).toBe(slots.root);
        expect(partClasses(buttonAnatomy, "label", slots)).toBe(slots.label);
    });

    it("returns nothing for an unstyled part, or before the classes exist", () => {
        expect(partClasses(buttonAnatomy, "root", slots, true)).toBeUndefined();
        expect(partClasses(buttonAnatomy, "root", undefined)).toBeUndefined();
    });

    it("returns nothing for an extra part outside the slots", () => {
        expect(
            partClasses(selectAnatomy, "hiddenSelect", {
                hiddenSelect: { class: "x" },
            }),
        ).toBeUndefined();
    });
});

describe("slot-keyed props", () => {
    it("reads one slot", () => {
        expect(forSlot({ root: "a", label: "b" }, "label")).toBe("b");
        expect(forSlot<"root", string>(undefined, "root")).toBeUndefined();
    });

    it("reads unstyled for every part or per part", () => {
        expect(isUnstyled(true, "root")).toBe(true);
        expect(isUnstyled(false, "root")).toBe(false);
        expect(isUnstyled(undefined, "root")).toBe(false);
        expect(isUnstyled({ label: true }, "label")).toBe(true);
        expect(isUnstyled({ label: true }, "root")).toBe(false);
    });

    it("knows the icon parts", () => {
        expect(isIconPart(buttonAnatomy, "icon")).toBe(true);
        expect(isIconPart(buttonAnatomy, "label")).toBe(false);
    });
});

const RULES: CombineRules = {
    classKeys: ["class", "className"],
    joinClasses: (values) => values,
    joinStyles: (values) =>
        mergeStyleObjects(values as Record<string, unknown>[]),
};

describe("combineProps", () => {
    it("takes the last defined value of a plain key", () => {
        expect(
            combineProps(
                [
                    { id: "a", title: "x" },
                    { id: "b", title: undefined },
                    undefined,
                ],
                RULES,
            ),
        ).toEqual({ id: "b", title: "x" });
    });

    it("collects classes in order under the first class key", () => {
        expect(
            combineProps(
                [
                    { class: "machine" },
                    { className: "registry" },
                    { class: ["user"] },
                ],
                RULES,
            ),
        ).toEqual({ class: ["machine", "registry", ["user"]] });
    });

    it("merges styles, later keys winning, and passes a lone style through", () => {
        const only = { color: "red" };
        expect(combineProps([{ style: only }], RULES).style).toBe(only);
        expect(
            combineProps(
                [
                    { style: { color: "red", "--a": "1" } },
                    { style: { color: "blue" } },
                ],
                RULES,
            ).style,
        ).toEqual({ color: "blue", "--a": "1" });
    });

    it("chains handlers, earlier sources first", () => {
        const calls: string[] = [];
        const merged = combineProps(
            [
                { onClick: () => calls.push("machine") },
                { onClick: () => calls.push("user") },
            ],
            RULES,
        );
        (merged.onClick as (event: unknown) => void)({});
        expect(calls).toEqual(["machine", "user"]);
    });

    it("lets the binding call its own handler shapes", () => {
        const handler = vi.fn();
        const merged = combineProps(
            [{ onClick: () => {} }, { onClick: [handler, "data"] }],
            {
                ...RULES,
                isHandler: (value) =>
                    typeof value === "function" || Array.isArray(value),
                callHandler: (h, event) =>
                    Array.isArray(h)
                        ? h[0](h[1], event)
                        : (h as (e: unknown) => void)(event),
            },
        );
        (merged.onClick as (event: unknown) => void)("event");
        expect(handler).toHaveBeenCalledWith("data", "event");
    });

    it("lets a later non-handler replace handlers", () => {
        expect(
            combineProps([{ onClick: () => {} }, { onClick: null }], RULES)
                .onClick,
        ).toBeNull();
    });
});

describe("withDefaults", () => {
    it("fills what the selection leaves undefined", () => {
        expect(
            withDefaults(
                {
                    variant: "tonal",
                    size: "small",
                    tokens: { gap: 1, radius: 2 },
                },
                { variant: undefined, size: "large", tokens: { radius: 3 } },
            ),
        ).toEqual({
            variant: "tonal",
            size: "large",
            tokens: { gap: 1, radius: 3 },
        });
    });

    it("returns the selection itself without defaults", () => {
        const selection = { variant: "filled" };
        expect(withDefaults(undefined, selection)).toBe(selection);
    });

    it("keeps the defaults' tokens when the selection has none", () => {
        expect(withDefaults({ tokens: { gap: 1 } }, { size: "s" })).toEqual({
            size: "s",
            tokens: { gap: 1 },
        });
    });
});
