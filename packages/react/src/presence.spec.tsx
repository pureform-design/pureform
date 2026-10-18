import { compositeTestIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { overlaysRegistry } from "./__fixtures__/registry";
import { Dialog } from "./dialog";
import { Menu } from "./menu";
import { interact, mount, settle } from "./testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const menuIds = compositeTestIds.menu;
const dialogIds = compositeTestIds.dialog;
const backdropId = compositeTestIds.dialogBackdrop.root;

const ITEMS = [
    { value: "cut", label: "Cut" },
    { value: "copy", label: "Copy" },
];

// The surfaces' motion, as a stylesheet would draw it: in over 400ms, out over 200ms.
const MOTION = `
@keyframes test-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes test-out { from { opacity: 1 } to { opacity: 0 } }
.menu[data-state=open], .dialog[data-state=open] { animation: test-in 400ms }
.menu[data-state=closed], .dialog[data-state=closed] { animation: test-out 200ms }
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const menu = () =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            <Menu trigger="Edit" items={ITEMS} />
        </PureformProvider>,
    );

describe("presence", () => {
    it("keeps a closing menu until its exit animation ends, then hides it", async () => {
        withMotion();
        menu();
        await settle();
        await interact(() => userEvent.click(byTestId(menuIds.trigger)));
        await frames();
        const content = byTestId(menuIds.content);
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        expect(content.getAnimations().length).toBeGreaterThan(0);
        await wait(100);
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        // Closed, and still showing while it fades out.
        expect(byTestId(menuIds.trigger).getAttribute("aria-expanded")).toBe(
            "false",
        );
        expect(content.dataset.state).toBe("closed");
        expect(content.hidden).toBe(false);
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        expect(
            content
                .getAnimations()
                .map((a) => (a as CSSAnimation).animationName),
        ).toEqual(["test-out"]);
        await wait(250);
        await frames();
        expect(content.hidden).toBe(true);
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
    });

    it("shows again when it opens while closing", async () => {
        withMotion();
        menu();
        await settle();
        await interact(() => userEvent.click(byTestId(menuIds.trigger)));
        await frames();
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames(2);
        await interact(() => userEvent.click(byTestId(menuIds.trigger)));
        await wait(300);
        await frames();
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        expect(byTestId(menuIds.content).dataset.state).toBe("open");
    });

    it("hides a closing menu at once when no animation runs", async () => {
        menu();
        await settle();
        await interact(() => userEvent.click(byTestId(menuIds.trigger)));
        await frames();
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames(2);
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
        expect(byTestId(menuIds.content).hidden).toBe(true);
    });

    it("keeps a dialog's backdrop with its surface, and stacks its positioner at the surface's layer", async () => {
        withMotion();
        mount(
            <PureformProvider registry={overlaysRegistry()}>
                <Dialog trigger="Discard" headline="Discard draft?" />
            </PureformProvider>,
        );
        await settle();
        const positioner = byTestId(dialogIds.positioner);
        expect(positioner.style.zIndex).toBe("");
        await interact(() => userEvent.click(byTestId(dialogIds.trigger)));
        await frames();
        expect(positioner.hidden).toBe(false);
        expect(getComputedStyle(positioner).zIndex).toBe("400");
        await wait(100);
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(byTestId(dialogIds.content).hidden).toBe(false);
        expect(byTestId(backdropId).hidden).toBe(false);
        await wait(250);
        await frames();
        expect(positioner.hidden).toBe(true);
        expect(byTestId(backdropId).hidden).toBe(true);
    });
});
