import { compositeTestIds } from "@pureform/anatomy";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { overlaysRegistry } from "./__fixtures__/registry";
import { Dialog } from "./dialog";
import { Menu } from "./menu";
import { byTestId, mount, settle, until } from "./testing/mount";

const menuIds = compositeTestIds.menu;
const dialogIds = compositeTestIds.dialog;
const backdropId = compositeTestIds.dialogBackdrop.root;

const ITEMS = [
    { value: "cut", label: "Cut" },
    { value: "copy", label: "Copy" },
];

// The surfaces' motion, as a stylesheet would draw it, but slow enough that no loaded machine
// outlasts it: a test ends an animation itself, with `finish()`. A user event alone can take
// seconds to come back, and a real 200ms exit would be over before the test looks at it.
const MOTION = `
@keyframes test-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes test-out { from { opacity: 1 } to { opacity: 0 } }
.menu[data-state=open], .dialog[data-state=open] { animation: test-in 60s }
.menu[data-state=closed], .dialog[data-state=closed] { animation: test-out 60s }
.dialog { z-index: 400 }
`;

const withMotion = () => {
    const style = document.createElement("style");
    style.dataset.test = "";
    style.textContent = MOTION;
    document.head.append(style);
};

afterEach(() => {
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((s) => s.remove());
});

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const animations = (element: Element) =>
    element.getAnimations().map((a) => (a as CSSAnimation).animationName);

/** Ends the exit animation running on `element`, as its time would. */
const finishExit = (element: Element) => {
    const exit = element
        .getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "test-out");
    expect(exit).toBeDefined();
    exit!.finish();
};

const menu = () =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            <Menu trigger="Edit" items={ITEMS} />
        </PureformProvider>
    ));

describe("presence", () => {
    it("keeps a closing menu until its exit animation ends, then hides it", async () => {
        withMotion();
        menu();
        await settle();
        await userEvent.click(byTestId(menuIds.trigger));
        await until(() =>
            expect(byTestId(menuIds.positioner).hidden).toBe(false),
        );
        const content = byTestId(menuIds.content);
        // Closed while it's still coming in.
        expect(animations(content)).toEqual(["test-in"]);
        await userEvent.keyboard("{Escape}");
        await until(() => expect(content.dataset.state).toBe("closed"));
        await frames();
        // Closed, and still showing while it fades out.
        expect(byTestId(menuIds.trigger).getAttribute("aria-expanded")).toBe(
            "false",
        );
        expect(content.hidden).toBe(false);
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        expect(animations(content)).toEqual(["test-out"]);
        finishExit(content);
        await until(() => expect(content.hidden).toBe(true));
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
    });

    it("shows again when it opens while closing", async () => {
        withMotion();
        menu();
        await settle();
        await userEvent.click(byTestId(menuIds.trigger));
        await until(() =>
            expect(byTestId(menuIds.positioner).hidden).toBe(false),
        );
        const content = byTestId(menuIds.content);
        await userEvent.keyboard("{Escape}");
        await until(() => expect(animations(content)).toEqual(["test-out"]));
        await userEvent.click(byTestId(menuIds.trigger));
        await until(() => expect(content.dataset.state).toBe("open"));
        await frames();
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        expect(content.hidden).toBe(false);
        expect(animations(content)).toEqual(["test-in"]);
    });

    it("hides a closing menu at once when no animation runs", async () => {
        menu();
        await settle();
        await userEvent.click(byTestId(menuIds.trigger));
        await frames();
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        await userEvent.keyboard("{Escape}");
        await frames(2);
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
        expect(byTestId(menuIds.content).hidden).toBe(true);
    });

    it("keeps a dialog's backdrop with its surface, and stacks its positioner at the surface's layer", async () => {
        withMotion();
        mount(() => (
            <PureformProvider registry={overlaysRegistry()}>
                <Dialog trigger="Discard" headline="Discard draft?" />
            </PureformProvider>
        ));
        await settle();
        const positioner = byTestId(dialogIds.positioner);
        expect(positioner.style.zIndex).toBe("");
        await userEvent.click(byTestId(dialogIds.trigger));
        await until(() => expect(positioner.hidden).toBe(false));
        expect(getComputedStyle(positioner).zIndex).toBe("400");
        const content = byTestId(dialogIds.content);
        await userEvent.keyboard("{Escape}");
        await until(() => expect(content.dataset.state).toBe("closed"));
        await frames();
        expect(content.hidden).toBe(false);
        expect(byTestId(backdropId).hidden).toBe(false);
        finishExit(content);
        await until(() => expect(positioner.hidden).toBe(true));
        expect(byTestId(backdropId).hidden).toBe(true);
    });
});
