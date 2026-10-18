import { afterEach, describe, expect, it } from "vitest";

import * as dialog from "./dialog";
import { run, settle } from "./testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const mount = () => {
    document.body.innerHTML = `
        <button data-part="trigger"></button>
        <div data-part="backdrop"></div>
        <div data-part="positioner"><div data-part="content" style="z-index: 400"><button>Close</button></div></div>
        <button data-part="outside">Outside</button>`;
    const part = (name: string) =>
        document.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
    const control = run(
        dialog.machine,
        dialog.connect,
        { id: "d", modal: true },
        (api, spread) => {
            spread(part("trigger"), api.getTriggerProps());
            spread(part("backdrop"), api.getBackdropProps());
            spread(part("positioner"), api.getPositionerProps());
            spread(part("content"), api.getContentProps());
        },
    );
    return { control, part };
};

describe("dialog", () => {
    it("doesn't mirror its layer onto the backdrop and positioner, and still dismisses", async () => {
        const { control, part } = mount();
        control.api().setOpen(true);
        await settle();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(control.api().open).toBe(true);
        // Zag's layer stack marks the content, and reads no style for the others.
        expect(part("content").style.getPropertyValue("--layer-index")).toBe(
            "0",
        );
        for (const name of ["backdrop", "positioner"]) {
            expect(part(name).style.getPropertyValue("--z-index")).toBe("");
            expect(part(name).style.getPropertyValue("--layer-index")).toBe("");
        }
        part("outside").dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true }),
        );
        part("outside").dispatchEvent(
            new PointerEvent("pointerup", { bubbles: true }),
        );
        part("outside").click();
        await settle();
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(control.api().open).toBe(false);
        control.stop();
    });
});
