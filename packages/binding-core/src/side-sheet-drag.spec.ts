import { afterEach, describe, expect, it, vi } from "vitest";

import {
    closeAsker,
    SIDE_SHEET_VELOCITY_THRESHOLD,
    sideSheetRelease,
} from "./components/sheet";
import { sideSheetDragToDismiss } from "./side-sheet-drag";

describe("sideSheetRelease", () => {
    const width = 400;
    it("stays open when moving back in, and goes on a fast flick out however short", () => {
        expect(sideSheetRelease({ offset: 300, velocity: -0.1, width })).toBe(
            "open",
        );
        expect(
            sideSheetRelease({
                offset: 10,
                velocity: SIDE_SHEET_VELOCITY_THRESHOLD,
                width,
            }),
        ).toBe("closed");
    });

    it("goes on a slow move out once halfway, and let go still, to the nearer", () => {
        expect(sideSheetRelease({ offset: 199, velocity: 0.1, width })).toBe(
            "open",
        );
        expect(sideSheetRelease({ offset: 200, velocity: 0.1, width })).toBe(
            "closed",
        );
        expect(sideSheetRelease({ offset: 150, velocity: 0, width })).toBe(
            "open",
        );
        expect(sideSheetRelease({ offset: 250, velocity: 0, width })).toBe(
            "closed",
        );
    });
});

const pointer = (
    type: string,
    clientX: number,
    clientY: number,
    timeStamp: number,
    pointerType = "touch",
): PointerEvent => {
    const event = new PointerEvent(type, {
        clientX,
        clientY,
        pointerId: 1,
        pointerType,
        button: 0,
        bubbles: true,
    });
    Object.defineProperty(event, "timeStamp", { value: timeStamp });
    return event;
};

describe("sideSheetDragToDismiss", () => {
    let stop: (() => void) | undefined;
    afterEach(() => {
        stop?.();
        document.body.replaceChildren();
    });

    const setup = (rtl = false, onClose?: () => boolean) => {
        const sheet = document.createElement("div");
        sheet.style.width = "400px";
        sheet.style.height = "400px";
        sheet.setAttribute("data-state", "open");
        document.body.append(sheet);
        const dismiss = vi.fn((kept: () => void) =>
            queueMicrotask(() => {
                if (sheet.getAttribute("data-state") !== "closed") kept();
            }),
        );
        stop = sideSheetDragToDismiss(
            sheet,
            () => rtl,
            dismiss,
            onClose,
            closeAsker(),
        );
        return { sheet, dismiss };
    };

    it("follows a sideways touch toward its edge, never in past open, and lets vertical moves scroll", () => {
        const { sheet, dismiss } = setup();
        expect(sheet.style.touchAction).toBe("pan-y");
        sheet.dispatchEvent(pointer("pointerdown", 100, 100, 0));
        sheet.dispatchEvent(pointer("pointermove", 160, 104, 400));
        expect(sheet.style.translate).toBe("60px");
        sheet.dispatchEvent(pointer("pointermove", 20, 104, 800));
        expect(sheet.style.translate).toBe("");
        sheet.dispatchEvent(pointer("pointermove", 120, 104, 1200));
        sheet.dispatchEvent(pointer("pointerup", 120, 104, 1600));
        expect(dismiss).not.toHaveBeenCalled();
        expect(sheet.style.translate).toBe("");

        // Mostly down: not the sheet's.
        sheet.dispatchEvent(pointer("pointerdown", 100, 100, 2000));
        sheet.dispatchEvent(pointer("pointermove", 110, 160, 2100));
        sheet.dispatchEvent(pointer("pointermove", 200, 170, 2200));
        expect(sheet.style.translate).toBe("");
        sheet.dispatchEvent(pointer("pointerup", 200, 170, 2300));
        expect(dismiss).not.toHaveBeenCalled();
    });

    it("closes past halfway or on a flick, and moves left under right to left", () => {
        const { sheet, dismiss } = setup(true);
        sheet.dispatchEvent(pointer("pointerdown", 300, 100, 0));
        sheet.dispatchEvent(pointer("pointermove", 280, 100, 10));
        sheet.dispatchEvent(pointer("pointermove", 240, 100, 30));
        expect(sheet.style.translate).toBe("-60px");
        sheet.dispatchEvent(pointer("pointerup", 230, 100, 40));
        expect(dismiss).toHaveBeenCalledOnce();
    });

    it("leaves a mouse to select text, and asks onClose first", () => {
        const onClose = vi.fn(() => false);
        const { sheet, dismiss } = setup(false, onClose);
        sheet.dispatchEvent(pointer("pointerdown", 100, 100, 0, "mouse"));
        sheet.dispatchEvent(pointer("pointermove", 300, 100, 100, "mouse"));
        expect(sheet.style.translate).toBe("");
        sheet.dispatchEvent(pointer("pointerup", 300, 100, 200, "mouse"));
        sheet.dispatchEvent(pointer("pointerdown", 100, 100, 1000));
        sheet.dispatchEvent(pointer("pointermove", 200, 100, 1100));
        sheet.dispatchEvent(pointer("pointermove", 350, 100, 1200));
        sheet.dispatchEvent(pointer("pointerup", 350, 100, 1300));
        expect(onClose).toHaveBeenCalledOnce();
        expect(dismiss).not.toHaveBeenCalled();
        expect(sheet.style.translate).toBe("");
    });

    it("starts open again each time it opens", async () => {
        const { sheet } = setup();
        sheet.dispatchEvent(pointer("pointerdown", 100, 100, 0));
        sheet.dispatchEvent(pointer("pointermove", 200, 100, 100));
        sheet.dispatchEvent(pointer("pointermove", 350, 100, 200));
        sheet.dispatchEvent(pointer("pointerup", 350, 100, 300));
        sheet.setAttribute("data-state", "closed");
        expect(sheet.style.translate).toBe("250px");
        sheet.setAttribute("data-state", "open");
        await Promise.resolve();
        expect(sheet.style.translate).toBe("");
    });
});
