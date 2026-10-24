import { afterEach, describe, expect, it, vi } from "vitest";

import { sidewaysDrag } from "./sideways-drag";

describe("sidewaysDrag", () => {
    let cleanup: (() => void) | undefined;
    afterEach(() => {
        cleanup?.();
        document.body.replaceChildren();
    });

    const mount = (accepts = true) => {
        const element = document.createElement("div");
        document.body.append(element);
        const hooks = {
            slop: 8,
            accepts: () => accepts,
            down: vi.fn(),
            start: vi.fn(),
            move: vi.fn(),
            release: vi.fn(),
        };
        cleanup = sidewaysDrag(element, hooks);
        return { element, ...hooks };
    };

    const pointer = (
        target: HTMLElement,
        type: string,
        x: number,
        y: number,
        time: number,
    ) => {
        const event = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
        });
        Object.defineProperty(event, "timeStamp", { value: time });
        target.dispatchEvent(event);
        return event;
    };

    it("starts past the slop sideways and hears the move and the release's speed", () => {
        const { element, start, move, release } = mount();
        pointer(element, "pointerdown", 0, 0, 0);
        pointer(element, "pointermove", 4, 0, 10);
        expect(start).not.toHaveBeenCalled();
        const moved = pointer(element, "pointermove", 50, 2, 50);
        expect(start).toHaveBeenCalledOnce();
        expect(moved.defaultPrevented).toBe(true);
        expect(move).toHaveBeenLastCalledWith(50, moved);
        pointer(element, "pointerup", 100, 2, 100);
        expect(release).toHaveBeenCalledWith(100, 1, false);
    });

    it("leaves a mostly vertical move to the page, and ignores what it doesn't accept", () => {
        const vertical = mount();
        pointer(vertical.element, "pointerdown", 0, 0, 0);
        pointer(vertical.element, "pointermove", 3, 40, 10);
        pointer(vertical.element, "pointermove", 60, 40, 20);
        pointer(vertical.element, "pointerup", 60, 40, 30);
        expect(vertical.move).not.toHaveBeenCalled();
        expect(vertical.release).not.toHaveBeenCalled();
        cleanup?.();

        const refused = mount(false);
        pointer(refused.element, "pointerdown", 0, 0, 0);
        pointer(refused.element, "pointermove", 60, 0, 10);
        expect(refused.down).not.toHaveBeenCalled();
        expect(refused.move).not.toHaveBeenCalled();
    });

    it("tells a cancelled drag it was cancelled", () => {
        const { element, release } = mount();
        pointer(element, "pointerdown", 0, 0, 0);
        pointer(element, "pointermove", 30, 0, 10);
        pointer(element, "pointercancel", 30, 0, 20);
        expect(release).toHaveBeenCalledWith(30, expect.any(Number), true);
    });
});
