import { afterEach, describe, expect, it, vi } from "vitest";

import { dragToDismiss } from "./sheet-drag";

const pointer = (
    type: string,
    clientY: number,
    timeStamp?: number,
): PointerEvent => {
    const event = new PointerEvent(type, {
        clientY,
        pointerId: 1,
        button: 0,
        bubbles: true,
    });
    if (timeStamp !== undefined) {
        Object.defineProperty(event, "timeStamp", { value: timeStamp });
    }
    return event;
};

describe("dragToDismiss", () => {
    let stop: (() => void) | undefined;
    afterEach(() => {
        stop?.();
        document.body.replaceChildren();
    });

    const setup = () => {
        const sheet = document.createElement("div");
        sheet.style.height = "400px";
        const handle = document.createElement("button");
        sheet.append(handle);
        document.body.append(sheet);
        const dismiss = vi.fn();
        const click = vi.fn();
        document.addEventListener("click", click);
        stop = dragToDismiss(handle, () => sheet, dismiss);
        return { sheet, handle, dismiss, click };
    };

    it("follows the pointer down, not up, and puts the sheet back after a short drag", () => {
        const { sheet, handle, dismiss } = setup();
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 150, 500));
        expect(sheet.style.translate).toBe("0px 50px");
        handle.dispatchEvent(pointer("pointermove", 50, 600));
        expect(sheet.style.translate).toBe("0px");
        handle.dispatchEvent(pointer("pointerup", 140, 1000));
        expect(dismiss).not.toHaveBeenCalled();
        expect(sheet.style.translate).toBe("");
    });

    it("closes after a drag past a quarter of its height, and swallows the click that ends it", () => {
        const { handle, dismiss, click } = setup();
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        expect(dismiss).toHaveBeenCalledTimes(1);
        handle.click();
        expect(click).not.toHaveBeenCalled();
        document.removeEventListener("click", click);
    });

    it("closes on a quick flick however short", () => {
        const { handle, dismiss } = setup();
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 140, 20));
        handle.dispatchEvent(pointer("pointerup", 140, 40));
        expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("leaves a press alone: no drag, and its click goes through", () => {
        const { handle, dismiss, click } = setup();
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointerup", 101, 100));
        handle.click();
        expect(dismiss).not.toHaveBeenCalled();
        expect(click).toHaveBeenCalledTimes(1);
        document.removeEventListener("click", click);
    });
});
