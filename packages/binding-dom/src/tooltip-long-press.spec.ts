import { afterEach, describe, expect, it, vi } from "vitest";

import {
    TOOLTIP_LONG_PRESS_MS,
    TOOLTIP_LONG_PRESS_STAY_MS,
    tooltipLongPress,
} from "./tooltip-long-press";

const pointer = (
    target: EventTarget,
    type: string,
    init: PointerEventInit = {},
) =>
    target.dispatchEvent(
        new PointerEvent(type, {
            bubbles: type !== "pointerleave",
            cancelable: true,
            pointerType: "touch",
            pointerId: 7,
            clientX: 10,
            clientY: 10,
            ...init,
        }),
    );

describe("tooltipLongPress", () => {
    let cleanup: (() => void) | undefined;
    afterEach(() => {
        cleanup?.();
        document.body.replaceChildren();
        vi.useRealTimers();
    });

    const mount = (interactive = false) => {
        vi.useFakeTimers();
        const trigger = document.createElement("button");
        document.body.append(trigger);
        const setOpen = vi.fn();
        cleanup = tooltipLongPress(trigger, {
            setOpen,
            interactive: () => interactive,
        });
        return { trigger, setOpen };
    };

    it("shows on a touch held, and hides a while after it ends", () => {
        const { trigger, setOpen } = mount();
        pointer(trigger, "pointerdown");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS - 1);
        expect(setOpen).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(setOpen).toHaveBeenLastCalledWith(true);
        pointer(trigger, "pointerup");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_STAY_MS - 1);
        expect(setOpen).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(setOpen).toHaveBeenLastCalledWith(false);
    });

    it("keeps an interactive tooltip after the press, and the touch's leave from the trigger", () => {
        const { trigger, setOpen } = mount(true);
        const leaves = vi.fn();
        trigger.addEventListener("pointerleave", leaves);
        trigger.addEventListener("pointerout", leaves);
        pointer(trigger, "pointerdown");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        pointer(trigger, "pointerup");
        pointer(trigger, "pointerout");
        pointer(trigger, "pointerleave");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_STAY_MS * 2);
        expect(setOpen.mock.calls).toEqual([[true]]);
        expect(leaves).not.toHaveBeenCalled();
    });

    it("ignores a tap, a mouse, a touch that moves away, and a disabled trigger", () => {
        const { trigger, setOpen } = mount();
        pointer(trigger, "pointerdown");
        pointer(trigger, "pointerup");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        pointer(trigger, "pointerdown", { pointerType: "mouse" });
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        pointer(trigger, "pointerdown");
        pointer(trigger, "pointermove", { clientX: 40 });
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        trigger.disabled = true;
        pointer(trigger, "pointerdown");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        expect(setOpen).not.toHaveBeenCalled();
    });

    it("keeps the press's click and the browser's long-press menu from the trigger", () => {
        const { trigger } = mount();
        const clicks = vi.fn();
        trigger.addEventListener("click", clicks);
        pointer(trigger, "pointerdown");
        vi.advanceTimersByTime(TOOLTIP_LONG_PRESS_MS);
        const menu = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
        });
        trigger.dispatchEvent(menu);
        expect(menu.defaultPrevented).toBe(true);
        pointer(trigger, "pointerup");
        trigger.click();
        expect(clicks).not.toHaveBeenCalled();
    });
});
