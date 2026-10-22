import { afterEach, describe, expect, it } from "vitest";

import * as presence from "./presence";
import { run, settle } from "./testing/vanilla";

// A surface's motion, as a stylesheet would draw it, but slow enough that no loaded machine
// outlasts it: a test ends the exit itself, with `finish()`.
const MOTION = `
@keyframes test-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes test-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes test-move { from { transform: none } to { transform: translateY(10px) } }
.surface[data-state=open] { animation: test-in 60s }
.surface[data-state=closed] { animation: test-out 60s }
.surface.both[data-state=closed] { animation: test-move 60s, test-out 60s }
`;

afterEach(() => {
    document.body.innerHTML = "";
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((s) => s.remove());
});

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const animations = (element: Element) =>
    element.getAnimations().map((a) => (a as CSSAnimation).animationName);

const mount = (className = "surface") => {
    const style = document.head.appendChild(document.createElement("style"));
    style.dataset.test = "";
    style.textContent = MOTION;
    const surface = document.body.appendChild(document.createElement("div"));
    surface.className = className;
    surface.dataset.state = "open";
    const control = run(
        presence.machine,
        presence.connect,
        { present: true },
        () => {},
    );
    control.api().setNode(surface);
    /** Waits for the surface to be coming in, as it is when a user closes it. */
    const entering = async () => {
        await frame();
        expect(animations(surface)).toEqual(["test-in"]);
    };
    const close = async () => {
        surface.dataset.state = "closed";
        control.setProps({ present: false });
        await settle();
        await frame();
        await settle();
    };
    return { surface, control, entering, close };
};

describe("presence", () => {
    it("stays while its exit animation runs, then lets the surface go", async () => {
        const { surface, control, entering, close } = mount();
        await entering();
        await close();
        expect(control.service.state.get()).toBe("unmountSuspended");
        expect(control.api().present).toBe(true);
        expect(animations(surface)).toEqual(["test-out"]);
        surface.getAnimations()[0]!.finish();
        await expect.poll(() => control.api().present).toBe(false);
    });

    it("stays until the last of an exit's animations ends", async () => {
        const { surface, control, entering, close } = mount("surface both");
        await entering();
        await close();
        expect(animations(surface)).toEqual(["test-move", "test-out"]);
        const [move, fade] = surface.getAnimations();
        fade!.finish();
        await settle();
        await frame();
        expect(control.api().present).toBe(true);
        move!.finish();
        await expect.poll(() => control.api().present).toBe(false);
    });

    it("isn't let go by its enter animation's cancel once it's leaving", async () => {
        const { surface, control, entering, close } = mount();
        await entering();
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
