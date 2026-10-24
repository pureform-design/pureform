import {
    buttonAnatomy,
    menuOverlayAnatomy,
    selectAnatomy,
} from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    forSlot,
    isIconPart,
    isUnstyled,
    outsideRootMessage,
    overDefaults,
    partClasses,
    partSources,
    spreadableProps,
    stateAttributes,
} from "./parts";
import type { InnerProps, StateAttributes } from "./parts";
import { combineProps, mergeStyleObjects } from "./props";
import type { CombineRules } from "./props";
import { selectionSignature, withDefaults } from "./selection";

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

    it("returns the slot that draws a part named otherwise, and nothing for a part with none", () => {
        const menu = { root: { class: "surface" }, item: { class: "i" } };
        expect(partClasses(menuOverlayAnatomy, "content", menu)).toBe(
            menu.root,
        );
        expect(partClasses(menuOverlayAnatomy, "item", menu)).toBe(menu.item);
        expect(partClasses(menuOverlayAnatomy, "root", menu)).toBeUndefined();
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

describe("spreadableProps", () => {
    it("leaves out children and ref", () => {
        expect(
            spreadableProps({ id: "a", children: "x", ref: () => {} }),
        ).toEqual({ id: "a" });
        expect(spreadableProps(undefined)).toBeUndefined();
    });
});

describe("partSources", () => {
    const classes = {
        root: { class: "r", style: { "--pf-a": "1" } },
        label: { class: "l" },
    } as const;
    const slotProps = { button: { root: { title: "provided" } } };

    it("lists the machine, attributes, states, registry, provider, and user, in order", () => {
        const machine = { id: "button:1", "data-scope": "button" };
        expect(
            partSources({
                anatomy: buttonAnatomy,
                part: "root",
                machine,
                states: { pressed: true },
                testId: "save",
                classes,
                slotProps,
                props: { title: "user", children: "x" },
            }),
        ).toEqual([
            machine,
            {
                "data-scope": "button",
                "data-pf-part": "root",
                "data-testid": "save-root",
            },
            { "data-pf-active": "" },
            classes.root,
            { title: "provided" },
            { title: "user" },
        ]);
    });

    it("gives the provider's slot props by the slot that draws the part", () => {
        const provided = { menu: { root: { title: "surface" } } };
        const source = (part: "root" | "content") =>
            partSources({
                anatomy: menuOverlayAnatomy,
                part,
                slotProps: provided,
            })[4];
        expect(source("content")).toEqual({ title: "surface" });
        expect(source("root")).toBeUndefined();
    });

    it("drops the registry's classes for an unstyled part, from Root or its own", () => {
        const base = { anatomy: buttonAnatomy, classes, slotProps } as const;
        expect(
            partSources({ ...base, part: "root", unstyled: true })[3],
        ).toBeUndefined();
        expect(
            partSources({
                ...base,
                part: "label",
                unstyled: { label: true },
            })[3],
        ).toBeUndefined();
        expect(
            partSources({
                ...base,
                part: "root",
                unstyled: { label: true },
            })[3],
        ).toBe(classes.root);
        expect(
            partSources({ ...base, part: "label", partUnstyled: true })[3],
        ).toBeUndefined();
        expect(partSources({ ...base, part: "label" })[4]).toBeUndefined();
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

describe("selectionSignature", () => {
    it("is equal for the same selection, whatever the key order", () => {
        expect(
            selectionSignature({
                variant: "text",
                size: undefined,
                tokens: { b: 2, a: "1" },
            }),
        ).toBe(
            selectionSignature({ tokens: { a: "1", b: 2 }, variant: "text" }),
        );
    });

    it("differs when a value or token differs", () => {
        const base = selectionSignature({ variant: "text", tokens: { a: 1 } });
        expect(
            selectionSignature({ variant: "filled", tokens: { a: 1 } }),
        ).not.toBe(base);
        expect(
            selectionSignature({ variant: "text", tokens: { a: 2 } }),
        ).not.toBe(base);
        expect(selectionSignature({ variant: "text" })).not.toBe(base);
        expect(selectionSignature({ toggle: true })).not.toBe(
            selectionSignature({ toggle: "true" }),
        );
    });
});

describe("outsideRootMessage", () => {
    it("names the part and its Root", () => {
        expect(outsideRootMessage("Button", "Label")).toMatch(
            /^pureform: <Button.Label> must be inside <Button.Root>/,
        );
    });
});

describe("overDefaults", () => {
    type Customize = {
        readonly className?: string | { readonly [part: string]: string };
        readonly style?: { readonly [part: string]: Record<string, string> };
        readonly slotProps?: {
            readonly [part: string]: Record<string, unknown>;
        };
        readonly tokens?: Record<string, string>;
        readonly testId?: string;
        readonly unstyled?: boolean;
    };
    type Item = InnerProps<Customize> & { readonly headline?: string };

    it("returns either side as-is when the other is empty", () => {
        const defaults: Item = { tokens: { height: "56px" } };
        const own: Item = { headline: "Inbox" };
        expect(overDefaults(defaults, {})).toBe(defaults);
        expect(
            overDefaults(defaults, { testId: undefined } as unknown as Item),
        ).toBe(defaults);
        expect(overDefaults(undefined, own)).toBe(own);
        expect(overDefaults({}, own)).toBe(own);
    });

    it("lets the child's own win and keeps the defaults it doesn't set", () => {
        expect(
            overDefaults<Item>(
                { testId: "a", unstyled: true, headline: "x" },
                { testId: "b" },
            ),
        ).toEqual({ testId: "b", unstyled: true, headline: "x" });
    });

    it("joins classes, part by part when keyed", () => {
        expect(
            overDefaults<Item>({ className: "a" }, { className: "b" }),
        ).toEqual({ className: "a b" });
        expect(
            overDefaults<Item>(
                { className: { root: "a", headline: "h" } },
                { className: { root: "b", leading: "l" } },
            ),
        ).toEqual({ className: { root: "a b", headline: "h", leading: "l" } });
    });

    it("merges style, slotProps and tokens shallowly per part", () => {
        expect(
            overDefaults<Item>(
                {
                    style: { root: { color: "red", margin: "0" } },
                    slotProps: { headline: { title: "a", id: "x" } },
                    tokens: { height: "56px", gap: "4px" },
                },
                {
                    style: { root: { color: "blue" }, leading: { gap: "1" } },
                    slotProps: { headline: { title: "b" } },
                    tokens: { height: "64px" },
                },
            ),
        ).toEqual({
            style: {
                root: { color: "blue", margin: "0" },
                leading: { gap: "1" },
            },
            slotProps: { headline: { title: "b", id: "x" } },
            tokens: { height: "64px", gap: "4px" },
        });
    });
});
