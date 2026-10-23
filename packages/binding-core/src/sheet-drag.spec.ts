import { afterEach, describe, expect, it, vi } from "vitest";

import {
    askingDismissProps,
    closeAsker,
    sheetPartialOffset,
    sheetRelease,
} from "./components/sheet";
import { settleTransition } from "./settle";
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

    const setup = (
        onClose?: () => boolean | Promise<boolean>,
        asker = closeAsker(),
    ) => {
        const sheet = document.createElement("div");
        sheet.style.height = "400px";
        const handle = document.createElement("button");
        sheet.append(handle);
        document.body.append(sheet);
        // As a binding does: once it has rendered the close, a sheet still open was kept.
        const dismiss = vi.fn((kept: () => void) =>
            queueMicrotask(() => {
                if (sheet.getAttribute("data-state") !== "closed") kept();
            }),
        );
        const click = vi.fn();
        document.addEventListener("click", click);
        stop = dragToDismiss(handle, () => sheet, dismiss, onClose, asker);
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

    it("settles back once the binding has rendered a close the app refused", async () => {
        const { sheet, handle, dismiss } = setup();
        sheet.setAttribute("data-state", "open");
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        expect(dismiss).toHaveBeenCalledTimes(1);
        expect(sheet.style.translate).toBe("0px 150px");
        await nextChange();
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
        // Opening places it where it rests, once the change is seen.
        await nextChange();
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

    it("ignores a drag's answer once another way of closing asks", async () => {
        let answer: (yes: boolean) => void = () => {};
        const asker = closeAsker();
        const { handle, dismiss } = setup(
            () =>
                new Promise<boolean>((resolve) => {
                    answer = resolve;
                }),
            asker,
        );
        handle.dispatchEvent(pointer("pointerdown", 100, 0));
        handle.dispatchEvent(pointer("pointermove", 250, 1000));
        handle.dispatchEvent(pointer("pointerup", 250, 2000));
        const first = answer;
        const escape = vi.fn();
        asker.ask(() => new Promise<boolean>(() => {}), escape, escape);
        first(true);
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

describe("a sheet that rests partly open", () => {
    let stop: (() => void) | undefined;
    afterEach(() => {
        stop?.();
        document.body.replaceChildren();
    });
    const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const setup = async (tall: boolean) => {
        const viewport = document.documentElement.clientHeight;
        const sheet = document.createElement("div");
        sheet.style.height = `${tall ? viewport - 20 : viewport / 4}px`;
        const handle = document.createElement("button");
        sheet.append(handle);
        document.body.append(sheet);
        const dismiss = vi.fn();
        const rests: string[] = [];
        stop = dragToDismiss(
            handle,
            () => sheet,
            dismiss,
            undefined,
            closeAsker(),
            {
                partial: () => true,
                onRest: (rest) => rests.push(rest),
            },
        );
        sheet.setAttribute("data-state", "open");
        await frame();
        const partial = sheetPartialOffset(
            sheet.getBoundingClientRect().height,
            viewport,
        );
        return { sheet, handle, dismiss, rests, partial };
    };
    const drag = (handle: HTMLElement, by: number, ms = 1000) => {
        handle.dispatchEvent(pointer("pointerdown", 300, 0));
        handle.dispatchEvent(pointer("pointermove", 300 + by / 2, ms / 2));
        handle.dispatchEvent(pointer("pointermove", 300 + by, ms));
        handle.dispatchEvent(pointer("pointerup", 300 + by, ms + 1));
    };

    it("opens with its top at half the screen, and drags between partly and fully open", async () => {
        const { sheet, handle, dismiss, rests, partial } = await setup(true);
        expect(partial).toBeGreaterThan(0);
        expect(sheet.style.translate).toBe(`0px ${partial}px`);
        expect(rests).toEqual(["partial"]);
        drag(handle, -partial);
        expect(sheet.style.translate).toBe("");
        expect(rests).toEqual(["partial", "expanded"]);
        drag(handle, partial * 0.8);
        expect(sheet.style.translate).toBe(`0px ${partial}px`);
        expect(dismiss).not.toHaveBeenCalled();
        // From partly open, a drag a quarter of the rest of the way down closes it.
        drag(handle, (sheet.getBoundingClientRect().height - partial) * 0.3);
        expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("moves on to the next place with a flick, and a press toggles it", async () => {
        const { sheet, handle, dismiss, partial } = await setup(true);
        drag(handle, -20, 20);
        expect(sheet.style.translate).toBe("");
        drag(handle, 20, 20);
        expect(sheet.style.translate).toBe(`0px ${partial}px`);
        expect(dismiss).not.toHaveBeenCalled();
        const click = vi.fn();
        sheet.addEventListener("click", click);
        // A press: the drag's own click came and went.
        const press = () => {
            handle.dispatchEvent(pointer("pointerdown", 300, 0));
            handle.dispatchEvent(pointer("pointerup", 300, 50));
            handle.click();
        };
        press();
        expect(sheet.style.translate).toBe("");
        press();
        expect(sheet.style.translate).toBe(`0px ${partial}px`);
        // The press moved it rather than closing it.
        expect(click).not.toHaveBeenCalled();
    });

    it("rests fully open when it's no taller than half the screen", async () => {
        const { sheet, handle, rests } = await setup(false);
        expect(sheet.style.translate).toBe("");
        expect(rests).toEqual([]);
        const click = vi.fn();
        sheet.addEventListener("click", click);
        handle.click();
        expect(click).toHaveBeenCalledTimes(1);
    });
});

describe("sheetRelease", () => {
    const at = (offset: number, velocity = 0, partial?: number) =>
        sheetRelease({ offset, velocity, height: 800, partial });

    it("closes past a quarter of the height without a partly open place", () => {
        expect(at(150)).toBe("expanded");
        expect(at(250)).toBe("closed");
        expect(at(10, 0.6)).toBe("closed");
    });

    it("goes to the nearer place, or the next one on a flick", () => {
        expect(at(150, 0, 400)).toBe("expanded");
        expect(at(250, 0, 400)).toBe("partial");
        expect(at(450, 0, 400)).toBe("partial");
        expect(at(550, 0, 400)).toBe("closed");
        expect(at(50, 0.6, 400)).toBe("partial");
        expect(at(420, 0.6, 400)).toBe("closed");
        expect(at(380, -0.6, 400)).toBe("expanded");
        expect(at(500, -0.6, 400)).toBe("partial");
    });
});

describe("settleTransition", () => {
    afterEach(() => document.body.replaceChildren());

    it("starts a spring transition at the release's speed, and leaves others alone", () => {
        const element = document.createElement("div");
        document.body.append(element);
        element.style.transition =
            "translate 400ms linear(0, 0.4 10%, 0.8 25%, 0.97 50%, 1)";
        const curve = getComputedStyle(element).transitionTimingFunction;
        element.style.cssText = "";
        const sheet = document.createElement("style");
        sheet.textContent = `.settling { transition: translate 400ms ${curve}; }`;
        document.head.append(sheet);
        element.className = "settling";
        const drop = settleTransition(element, "translate", 100, 2);
        expect(element.style.transition).toMatch(/^translate \d+ms linear\(/);
        drop();
        expect(element.style.transition).toBe("");
        element.className = "";
        expect(
            settleTransition(element, "translate", 100, 2)(),
        ).toBeUndefined();
        expect(element.style.transition).toBe("");
        sheet.remove();
    });
});

describe("closeAsker", () => {
    it("answers yes without onClose, and acts on a boolean at once", () => {
        const asker = closeAsker();
        const yes = vi.fn();
        const no = vi.fn();
        asker.ask(undefined, yes, no);
        asker.ask(() => false, yes, no);
        expect(yes).toHaveBeenCalledTimes(1);
        expect(no).toHaveBeenCalledTimes(1);
    });

    it("acts on a promise when it settles, a rejection as no, unless cancelled", async () => {
        const asker = closeAsker();
        const yes = vi.fn();
        const no = vi.fn();
        asker.ask(() => Promise.reject(new Error("no")), yes, no);
        await Promise.resolve();
        await Promise.resolve();
        expect(no).toHaveBeenCalledTimes(1);
        asker.ask(() => Promise.resolve(true), yes, no);
        asker.cancel();
        await Promise.resolve();
        await Promise.resolve();
        expect(yes).not.toHaveBeenCalled();
    });
});

describe("askingDismissProps", () => {
    const event = () => ({ preventDefault: vi.fn() });

    it("stops Zag's close on Escape and a press outside, asking first", () => {
        const close = vi.fn();
        const onClose = vi.fn(() => true);
        const props = askingDismissProps(onClose, {}, closeAsker(), close);
        const escape = event();
        props.onEscapeKeyDown!(escape);
        expect(escape.preventDefault).toHaveBeenCalled();
        const outside = event();
        props.onInteractOutside!(outside);
        expect(outside.preventDefault).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(close).toHaveBeenCalledTimes(2);
    });

    it("asks only where Zag would close, and adds nothing without onClose", () => {
        const close = vi.fn();
        const onClose = vi.fn(() => true);
        const props = askingDismissProps(
            onClose,
            { closeOnEscape: false, modal: false },
            closeAsker(),
            close,
        );
        props.onEscapeKeyDown!(event());
        props.onInteractOutside!(event());
        expect(onClose).not.toHaveBeenCalled();
        expect(askingDismissProps(undefined, {}, closeAsker(), close)).toEqual(
            {},
        );
    });
});
