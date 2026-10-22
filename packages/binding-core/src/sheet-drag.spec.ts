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

    const setup = (onClose?: () => boolean | Promise<boolean>) => {
        const sheet = document.createElement("div");
        sheet.style.height = "400px";
        const handle = document.createElement("button");
        sheet.append(handle);
        document.body.append(sheet);
        const dismiss = vi.fn();
        const click = vi.fn();
        document.addEventListener("click", click);
        stop = dragToDismiss(handle, () => sheet, dismiss, onClose);
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

    const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const nextChange = () =>
        new Promise<void>((resolve) => queueMicrotask(resolve));

    it("leaves from where the drag let it go, and is back at rest when it opens again", async () => {
        const { sheet, handle, dismiss } = setup();
        sheet.setAttribute("data-state", "open");
        dismiss.mockImplementation(() =>
            sheet.setAttribute("data-state", "closed"),
        );
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        expect(dismiss).toHaveBeenCalledTimes(1);
        expect(sheet.style.translate).toBe("0px 150px");
        await frame();
        expect(sheet.style.translate).toBe("0px 150px");
        sheet.setAttribute("data-state", "open");
        await nextChange();
        expect(sheet.style.translate).toBe("");
        expect(sheet.style.transition).toBe("");
    });

    it("settles back when the app keeps it open", async () => {
        const { sheet, handle, dismiss } = setup();
        sheet.setAttribute("data-state", "open");
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        expect(dismiss).toHaveBeenCalledTimes(1);
        await frame();
        expect(sheet.style.translate).toBe("");
        expect(sheet.style.transition).toBe("");
    });

    it("asks onClose first: false settles it back without closing", () => {
        const onClose = vi.fn(() => false);
        const { sheet, handle, dismiss } = setup(onClose);
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(dismiss).not.toHaveBeenCalled();
        expect(sheet.style.translate).toBe("");
    });

    it("holds where it was let go until onClose's promise settles, then leaves or settles back", async () => {
        let answer: (yes: boolean) => void = () => {};
        const { sheet, handle, dismiss } = setup(
            () =>
                new Promise<boolean>((resolve) => {
                    answer = resolve;
                }),
        );
        const release = () => {
            handle.dispatchEvent(pointer("pointerdown", 100, 0));
            handle.dispatchEvent(pointer("pointermove", 250, 1000));
            handle.dispatchEvent(pointer("pointerup", 250, 2000));
        };
        release();
        await frame();
        expect(sheet.style.translate).toBe("0px 150px");
        answer(false);
        await nextChange();
        expect(dismiss).not.toHaveBeenCalled();
        expect(sheet.style.translate).toBe("");

        sheet.setAttribute("data-state", "open");
        dismiss.mockImplementation(() =>
            sheet.setAttribute("data-state", "closed"),
        );
        release();
        answer(true);
        await nextChange();
        expect(dismiss).toHaveBeenCalledTimes(1);
        await frame();
        // Closed: it leaves from where it was let go.
        expect(sheet.style.translate).toBe("0px 150px");
    });

    it("ignores an answer that comes after another drag", async () => {
        let answer: (yes: boolean) => void = () => {};
        const { handle, dismiss } = setup(
            () =>
                new Promise<boolean>((resolve) => {
                    answer = resolve;
                }),
        );
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        handle.dispatchEvent(pointer("pointerdown", 250, 3000));
        answer(true);
        await nextChange();
        expect(dismiss).not.toHaveBeenCalled();
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
