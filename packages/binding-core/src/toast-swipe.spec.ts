import { afterEach, describe, expect, it, vi } from "vitest";

import { toastSwipeRelease } from "./components/toast";
import { toastSwipeToDismiss } from "./toast-swipe";

describe("toastSwipeToDismiss", () => {
    let cleanup: (() => void) | undefined;
    afterEach(() => {
        cleanup?.();
        document.body.replaceChildren();
    });

    const mount = (closable = true) => {
        const toast = document.createElement("div");
        toast.style.width = "300px";
        toast.style.height = "56px";
        const button = document.createElement("button");
        toast.append(button);
        document.body.append(toast);
        const options = {
            closable: () => closable,
            dismiss: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
        };
        cleanup = toastSwipeToDismiss(toast, options);
        return { toast, button, ...options };
    };

    const swipe = (target: HTMLElement, by: number, dy = 0, ms = 400) => {
        let time = performance.now();
        const at = (type: string, x: number, y: number) => {
            const event = new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerId: 3,
                pointerType: "touch",
                isPrimary: true,
                button: 0,
                clientX: x,
                clientY: y,
            });
            Object.defineProperty(event, "timeStamp", { value: time });
            target.dispatchEvent(event);
        };
        at("pointerdown", 50, 20);
        for (let step = 1; step <= 4; step++) {
            time += ms / 4;
            at("pointermove", 50 + (by * step) / 4, 20 + (dy * step) / 4);
        }
        at("pointerup", 50 + by, 20 + dy);
    };

    it("leaves sideways touches to the swipe, up and down to the page", () => {
        const { toast } = mount();
        expect(toast.style.touchAction).toBe("pan-y");
    });

    it("closes past half its width, holding its timer meanwhile", async () => {
        const { toast, dismiss, pause } = mount();
        swipe(toast, -200);
        expect(pause).toHaveBeenCalled();
        await vi.waitFor(() => expect(dismiss).toHaveBeenCalled());
    });

    it("closes on a flick however short", async () => {
        const { toast, dismiss } = mount();
        swipe(toast, 60, 0, 40);
        await vi.waitFor(() => expect(dismiss).toHaveBeenCalled());
    });

    it("settles back short of halfway, its timer going on", async () => {
        const { toast, dismiss, resume } = mount();
        swipe(toast, 100, 0, 2000);
        expect(resume).toHaveBeenCalled();
        await vi.waitFor(() => expect(toast.style.translate).toBe(""));
        expect(dismiss).not.toHaveBeenCalled();
    });

    it("leaves a mostly vertical move, a press on its buttons, and a toast that can't close", () => {
        const a = mount();
        swipe(a.toast, 20, 200);
        swipe(a.button, 200);
        expect(a.pause).not.toHaveBeenCalled();
        cleanup?.();
        const b = mount(false);
        swipe(b.toast, 200);
        expect(b.pause).not.toHaveBeenCalled();
        expect(b.dismiss).not.toHaveBeenCalled();
    });
});

describe("toastSwipeRelease", () => {
    it("dismisses past half the width or on a flick its way, else settles", () => {
        const at = (offset: number, velocity = 0) =>
            toastSwipeRelease({ offset, velocity, width: 300 });
        expect(at(150)).toBe("dismissed");
        expect(at(-160)).toBe("dismissed");
        expect(at(100)).toBe("settled");
        expect(at(40, 0.6)).toBe("dismissed");
        expect(at(-40, -0.6)).toBe("dismissed");
        expect(at(40, -0.6)).toBe("settled");
        expect(at(0, 2)).toBe("settled");
    });
});
