import { afterEach, describe, expect, it } from "vitest";

import { watchOverflow } from "./toolbar-dom";

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

describe("watchOverflow", () => {
    afterEach(() => document.body.replaceChildren());

    const mount = (wrap: boolean) => {
        const outer = document.createElement("div");
        outer.style.width = "168px";
        const parent = document.createElement("div");
        // A wrapper that draws no box of its own, as a provider's does.
        if (wrap) parent.style.display = "contents";
        const root = document.createElement("div");
        Object.assign(root.style, {
            display: "inline-flex",
            maxWidth: "100%",
            gap: "0px",
        });
        const elements = Array.from({ length: 4 }, () => {
            const button = document.createElement("button");
            button.style.width = "48px";
            button.style.flexShrink = "0";
            root.append(button);
            return button;
        });
        parent.append(root);
        outer.append(parent);
        document.body.append(outer);
        const counts: number[] = [];
        const watch = watchOverflow({
            root,
            elements: () => elements,
            trigger: () => undefined,
            vertical: () => false,
            onCount: (count) => counts.push(count),
        });
        return { counts, watch };
    };

    it("measures the room of the nearest ancestor that draws a box", async () => {
        const { counts, watch } = mount(true);
        await frame();
        // 168px holds three 48px elements.
        expect(counts.at(-1)).toBe(3);
        watch.stop();
    });

    it("measures the parent's room when it draws one", async () => {
        const { counts, watch } = mount(false);
        await frame();
        expect(counts.at(-1)).toBe(3);
        watch.stop();
    });
});
