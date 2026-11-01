import { describe, expect, it } from "vitest";

import { ownedKeysIn, ownedKeysMessage } from "./owned";

describe("ownedKeysIn", () => {
    const owned = (key: string) => key === "id" || key.startsWith("data-pf-");

    it("finds the owned keys that are set, in the source's order", () => {
        expect(
            ownedKeysIn({ title: "x", id: "a", "data-pf-part": "root" }, owned),
        ).toEqual(["id", "data-pf-part"]);
    });

    it("doesn't count a key left undefined, and takes no source", () => {
        expect(ownedKeysIn({ id: undefined }, owned)).toEqual([]);
        expect(ownedKeysIn(undefined, owned)).toEqual([]);
    });
});

describe("ownedKeysMessage", () => {
    it("names the component, the part, the keys and where they were set", () => {
        expect(
            ownedKeysMessage(
                "button",
                "root",
                ["id"],
                "the provider's slotProps",
            ),
        ).toBe(
            `pureform: <button> root ignored "id" from the provider's slotProps: the component sets it.`,
        );
        expect(
            ownedKeysMessage("button", "root", ["id", "testID"], "slotProps"),
        ).toContain("sets them.");
    });
});
