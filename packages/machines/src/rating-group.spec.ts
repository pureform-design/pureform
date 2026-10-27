import { afterEach, describe, expect, it } from "vitest";

import * as rating from "./rating-group";
import { run, settle } from "./testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

describe("rating selection semantics", () => {
    it("clears every checked star when a controlled value returns to zero", async () => {
        document.body.innerHTML = "<div></div>";
        const root = document.querySelector("div")!;
        const items = Array.from({ length: 5 }, () => {
            const item = document.createElement("span");
            root.append(item);
            return item;
        });
        const control = run(
            rating.machine,
            rating.connect,
            { id: "quality", value: 2.5, allowHalf: true },
            (api, spread) => {
                spread(root, api.getRootProps());
                items.forEach((item, index) =>
                    spread(item, api.getItemProps({ index: index + 1 })),
                );
            },
        );
        try {
            await settle();
            expect(
                items.map((item) => item.getAttribute("aria-checked")),
            ).toEqual(["false", "false", "true", "false", "false"]);
            control.setProps({ id: "quality", value: 0, allowHalf: true });
            await settle();
            expect(
                items.map((item) => item.getAttribute("aria-checked")),
            ).toEqual(Array(5).fill("false"));
            expect(items[0]?.getAttribute("tabindex")).toBe("0");
            control.setProps({ id: "quality", value: 1, allowHalf: true });
            await settle();
            expect(items[0]?.getAttribute("aria-checked")).toBe("true");
        } finally {
            control.stop();
        }
    });
});
