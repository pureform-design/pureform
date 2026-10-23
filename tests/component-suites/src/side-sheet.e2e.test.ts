// The side sheet's drag to dismiss, as MDC-Android's `SideSheetBehavior`: a touch dragging the
// sheet sideways toward its edge moves it, and let go past halfway (or on a flick) it closes;
// short of that, it settles back. A coplanar sheet drags too, giving its room in the layout up.

import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

const ids = compositeTestIds.sideSheet;
const sheetCase = COMPONENTS.find(
    (component) => component.component === "SideSheet",
)!;

const mount = async (example: Record<string, unknown>) => {
    const host = document.createElement("div");
    document.body.append(host);
    mountCase(sheetCase, example, { host });
    await settlePlaced();
    const content = host.querySelector<HTMLElement>(
        `[data-testid="${ids.content}"]`,
    )!;
    return { host, content };
};

const drag = (sheet: HTMLElement, by: number, steps = 4, ms = 200) => {
    const rect = sheet.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    let time = performance.now();
    const at = (type: string, clientX: number) => {
        const event = new PointerEvent(type, {
            clientX,
            clientY: y,
            pointerId: 7,
            pointerType: "touch",
            button: 0,
            bubbles: true,
        });
        Object.defineProperty(event, "timeStamp", { value: time });
        sheet.dispatchEvent(event);
    };
    at("pointerdown", x);
    for (let step = 1; step <= steps; step++) {
        time += ms / steps;
        at("pointermove", x + (by * step) / steps);
    }
    return () => at("pointerup", x + by);
};

describe("SideSheet, dragged", () => {
    it("follows a touch toward its edge and settles back when let go short of halfway", async () => {
        const { host, content } = await mount(sheetCase.opened!.plain!);
        expect(getComputedStyle(content).touchAction).toBe("pan-y");
        const release = drag(content, 60, 4, 2000);
        expect(content.style.translate).toBe("60px");
        release();
        await harness.settle();
        expect(content.style.translate).toBe("");
        expect(content.getAttribute("data-state")).toBe("open");
        host.remove();
    });

    it("closes when let go past halfway", async () => {
        const { host, content } = await mount(sheetCase.opened!.plain!);
        const width = content.getBoundingClientRect().width;
        drag(content, width * 0.6, 6, 3000)();
        await harness.settle();
        expect(content.getAttribute("data-state")).toBe("closed");
        host.remove();
    });

    it("drags a coplanar sheet, its place in the layout giving the room up", async () => {
        const { host, content } = await mount({
            ...sheetCase.opened!.standard!,
            coplanar: true,
        });
        const positioner = content.parentElement!;
        const release = drag(content, 60, 4, 2000);
        expect(content.style.translate).toBe("60px");
        expect(positioner.style.marginInlineEnd).toBe("-60px");
        release();
        await harness.settle();
        expect(content.style.translate).toBe("");
        expect(positioner.style.marginInlineEnd).toBe("");
        expect(content.getAttribute("data-state")).toBe("open");
        host.remove();
    });
});
