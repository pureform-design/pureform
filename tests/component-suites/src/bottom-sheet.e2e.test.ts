// The bottom sheet's partly open state (c8a), as Compose's `SheetValue.PartiallyExpanded`: a
// sheet taller than half the screen opens with its top at half the screen, a drag or a press on
// its handle moves it between partly and fully open, and a settle after a drag starts at the
// release's speed: the sheet's spring transition, sampled again from that speed, set inline for
// the one settle. The suites' browser asks for reduced motion, so these scenes set the provider's
// `motion` to `"full"`.

import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

const ids = compositeTestIds.bottomSheet;
const sheetCase = COMPONENTS.find(
    (component) => component.component === "BottomSheet",
)!;

const mount = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    mountCase(sheetCase, sheetCase.opened!["partly open"], {
        host,
        provider: { motion: "full" },
    });
    await settlePlaced();
    const content = host.querySelector<HTMLElement>(
        `[data-testid="${ids.content}"]`,
    )!;
    const handle = host.querySelector<HTMLElement>(
        `[data-testid="${ids.dragHandle}"]`,
    )!;
    return { host, content, handle };
};

const offset = (content: HTMLElement) =>
    Number.parseFloat(content.style.translate.split(" ")[1] ?? "0");

describe("BottomSheet, partly open", () => {
    it("opens with its top at half the screen, and its handle expands and collapses it", async () => {
        const { content, handle } = await mount();
        const partial =
            content.getBoundingClientRect().height -
            document.documentElement.clientHeight / 2;
        expect(partial).toBeGreaterThan(0);
        expect(Math.abs(offset(content) - partial)).toBeLessThan(1.5);
        expect(handle.getAttribute("aria-label")).toBe("Expand sheet");
        await userEvent.click(handle);
        await harness.settle();
        expect(content.style.translate).toBe("");
        expect(content.getAttribute("data-state")).toBe("open");
        expect(handle.getAttribute("aria-label")).toBe("Collapse sheet");
    });

    it("settles from a flick at the release's speed, on the sheet's spring", async () => {
        const { content, handle } = await mount();
        const rect = handle.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const at = (type: string, clientY: number) =>
            handle.dispatchEvent(
                new PointerEvent(type, {
                    clientX: x,
                    clientY,
                    pointerId: 1,
                    button: 0,
                    bubbles: true,
                }),
            );
        at("pointerdown", y);
        at("pointermove", y - 20);
        at("pointermove", y - 40);
        at("pointerup", y - 40);
        // A quick flick up: on to fully open, from the release's speed.
        expect(content.style.translate).toBe("");
        expect(content.style.transition).toMatch(
            /^translate \d+ms linear\(/,
        );
        await harness.settle();
    });
});
