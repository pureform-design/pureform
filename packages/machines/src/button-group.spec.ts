import { afterEach, describe, expect, it } from "vitest";

import * as buttonGroup from "./button-group";
import { run, settle } from "./testing/vanilla";

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = "";
});

const setUp = (props: buttonGroup.Props | Record<string, unknown>) => {
    const root = document.createElement("div");
    const items = ["day", "week", "month"].map((value) => {
        const item = document.createElement("button");
        root.append(item);
        return { value, item };
    });
    document.body.append(root);
    const running = run(
        buttonGroup.machine,
        buttonGroup.connect,
        { id: "view", ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            for (const { value, item } of items) {
                spread(item, api.getItemProps({ value }));
            }
        },
    );
    stops.push(running.stop);
    return { root, items, running };
};

describe("buttonGroup", () => {
    it("is a group of toggle buttons in single mode, not radios", async () => {
        const { root, items } = setUp({ defaultValue: ["week"] });
        await settle();
        expect(root.getAttribute("role")).toBe("group");
        const [day, week] = items.map(({ item }) => item);
        expect(day?.hasAttribute("role")).toBe(false);
        expect(day?.hasAttribute("aria-checked")).toBe(false);
        expect(day?.getAttribute("aria-pressed")).toBe("false");
        expect(week?.getAttribute("aria-pressed")).toBe("true");
        day?.click();
        await settle();
        expect(day?.getAttribute("aria-pressed")).toBe("true");
        expect(week?.getAttribute("aria-pressed")).toBe("false");
    });

    it("presses several at once in multiple mode", async () => {
        const { items, running } = setUp({ multiple: true });
        await settle();
        for (const { item } of items) item.click();
        await settle();
        expect(running.api().value).toEqual(["day", "week", "month"]);
        for (const { item } of items) {
            expect(item.getAttribute("aria-pressed")).toBe("true");
        }
    });

    it("moves focus by the arrows' direction", async () => {
        const key = (element: Element, k: string) =>
            element.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: k,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        for (const [dir, arrow] of [
            ["ltr", "ArrowRight"],
            ["rtl", "ArrowLeft"],
        ] as const) {
            const { items } = setUp({ dir });
            await settle();
            const [day, week] = items.map(({ item }) => item);
            day?.focus();
            await settle();
            key(day!, arrow);
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(document.activeElement, dir).toBe(week);
            for (const stop of stops.splice(0)) stop();
            document.body.innerHTML = "";
        }
    });
});
