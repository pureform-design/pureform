import { describe, expect, it } from "vitest";

import {
    appearanceMessage,
    FORWARDED_SLOT_PROPS,
    isForwardedSlotProps,
    withoutAppearance,
} from "./owned";

describe("withoutAppearance", () => {
    it("takes className, class and style out of an instance's slotProps entry, and says which", () => {
        const { source, dropped } = withoutAppearance({
            title: "t",
            className: "a",
            class: "b",
            style: { color: "red" },
            onClick: () => {},
        });
        expect(Object.keys(source!)).toEqual(["title", "onClick"]);
        expect(dropped).toEqual(["className", "class", "style"]);
    });

    it("returns the entry itself when it has none, and leaves a key set to undefined", () => {
        const entry = { title: "t", style: undefined };
        expect(withoutAppearance(entry)).toEqual({
            source: entry,
            dropped: [],
        });
        expect(withoutAppearance(undefined).dropped).toEqual([]);
    });
});

describe("forwarded slotProps", () => {
    it("are told by their mark, which spreading keeps and Object.keys doesn't show", () => {
        const forwarded = {
            root: { className: "x" },
            [FORWARDED_SLOT_PROPS]: true,
        };
        expect(isForwardedSlotProps({ ...forwarded })).toBe(true);
        expect(Object.keys(forwarded)).toEqual(["root"]);
        expect(isForwardedSlotProps({ root: {} })).toBe(false);
        expect(isForwardedSlotProps(undefined)).toBe(false);
    });
});

describe("appearanceMessage", () => {
    it("points to the keyed props", () => {
        expect(appearanceMessage("label", ["className"])).toContain(
            'slotProps.label ignored "className": style a part with the keyed props',
        );
    });
});
