import { expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

it("highlights selectable rows but leaves passive rows unchanged on hover", async () => {
    const component = COMPONENTS.find((entry) => entry.component === "Table")!;
    const scene = mountCase(component);
    await settlePlaced();
    const row = () =>
        scene.host.querySelector<HTMLElement>(
            '[data-testid="pf-data-table-row"]',
        )!;
    const color = () => getComputedStyle(row()).backgroundColor;
    await commands.mouse("move", 1000, 700);
    const passive = color();
    const hover = async () => {
        const box = row().getBoundingClientRect();
        await commands.mouse(
            "move",
            box.left + box.width / 2,
            box.top + box.height / 2,
        );
    };
    await hover();
    expect(color()).toBe(passive);
    await commands.mouse("move", 1000, 700);
    await scene.update({ selectionMode: "multiple" });
    await settlePlaced();
    const resting = color();
    await hover();
    await vi.waitFor(() => expect(color()).not.toBe(resting));
});
