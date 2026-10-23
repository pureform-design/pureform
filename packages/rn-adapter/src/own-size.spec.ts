import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { stylesFor } from "./resolve";
import { select } from "./select";

// On a device, the roots that keep their own size (`OWN_SIZE`) are `fit-content` wide (Yoga's,
// React Native 0.88) where they don't set a width, and never set `alignSelf`, so a parent's
// `alignItems` places them.
const NAMES = [
    "button",
    "iconButton",
    "fab",
    "chip",
    "inputChip",
    "checkbox",
    "switchControl",
    "radio",
    "badge",
] as const;
const styles = stylesFor(
    precompute(pureform(), { components: [...NAMES] }),
    "base:light",
);

describe("own size on React Native", () => {
    for (const name of NAMES) {
        it(`${name}'s root leaves its placement to its parent`, () => {
            const root = select(styles[name]!, {}, { scheme: "light" });
            const style = root.root ?? root[""]!;
            expect(style.alignSelf, name).toBeUndefined();
            const width = style.width;
            expect(
                width === "fit-content" || typeof width === "number",
                `${name}: ${String(width)}`,
            ).toBe(true);
        });
    }

    it("is fit-content where the root sets no width of its own", () => {
        for (const name of ["button", "chip", "badge"] as const) {
            const root = select(styles[name]!, {}, { scheme: "light" });
            expect((root.root ?? root[""])!.width, name).toBe("fit-content");
        }
    });
});
