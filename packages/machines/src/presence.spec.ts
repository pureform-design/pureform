import { afterEach, describe, expect, it } from "vitest";

import * as presence from "./presence";
import { run, settle } from "./testing/vanilla";

// A surface's motion, as a stylesheet would draw it: in over 400ms, out over 200ms.
const MOTION = `
@keyframes test-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes test-out { from { opacity: 1 } to { opacity: 0 } }
.surface[data-state=open] { animation: test-in 400ms }
.surface[data-state=closed] { animation: test-out 200ms }
`;

afterEach(() => {
    document.body.innerHTML = "";
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((s) => s.remove());
});

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mount = () => {
    const style = document.head.appendChild(document.createElement("style"));
    style.dataset.test = "";
    style.textContent = MOTION;
    const surface = document.body.appendChild(document.createElement("div"));
    surface.className = "surface";
    surface.dataset.state = "open";
    const control = run(
        presence.machine,
        presence.connect,
        { present: true },
        () => {},
    );
    control.api().setNode(surface);
    const close = async () => {
        surface.dataset.state = "closed";
        control.setProps({ present: false });
        await settle();
        await frame();
        await settle();
    };
    return { surface, control, close };
};

describe("presence", () => {
    it("stays while its exit animation runs, then lets the surface go", async () => {
        const { control, close } = mount();
        await wait(100);
        await close();
        expect(control.service.state.get()).toBe("unmountSuspended");
        expect(control.api().present).toBe(true);
        await wait(250);
        await settle();
        expect(control.api().present).toBe(false);
    });

    it("isn't let go by its enter animation's cancel once it's leaving", async () => {
        const { surface, control, close } = mount();
        await wait(100);
        await close();
        expect(control.service.state.get()).toBe("unmountSuspended");
        // The enter's cancel, as it arrives when the frame that replaced it sends it late.
        surface.dispatchEvent(
            new AnimationEvent("animationcancel", { animationName: "test-in" }),
        );
        surface.dispatchEvent(
            new AnimationEvent("animationend", { animationName: "test-in" }),
        );
        await settle();
        expect(control.api().present).toBe(true);
        // Its exit's own cancel lets it go.
        surface.dispatchEvent(
            new AnimationEvent("animationcancel", {
                animationName: "test-out",
            }),
        );
        await settle();
        expect(control.api().present).toBe(false);
    });
});
