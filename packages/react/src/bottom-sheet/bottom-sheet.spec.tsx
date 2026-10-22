import { compositeTestIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { BottomSheet } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { DragHandle } from "../drag-handle";
import { interact, mount, settle, until } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.bottomSheet;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

describe("BottomSheet, ready-made", () => {
    it("renders a modal sheet in place over a backdrop, at the bottom, with a drag handle", async () => {
        withRegistry(
            <BottomSheet
                trigger="Share"
                aria-label="Share"
                body={<button type="button">Copy link</button>}
            />,
        );
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("bottom-sheet bottom-sheet--modal-true");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-modal")).toBe("true");
        const handle = byTestId(ids.dragHandle);
        expect(handle.tagName).toBe("BUTTON");
        expect(handle.className).toContain("bottom-sheet__dragHandle");
        expect(handle.className).toContain("drag-handle");
        expect(handle.getAttribute("aria-label")).toBe("Close sheet");
        expect(handle.querySelector(".drag-handle__handle")).not.toBeNull();
        expect(
            byTestId(compositeTestIds.bottomSheetBackdrop.root),
        ).toBeTruthy();
        const positioner = byTestId(ids.positioner);
        expect(positioner.hidden).toBe(true);
        expect(positioner.style.position).toBe("fixed");
        expect(positioner.style.justifyContent).toBe("flex-end");
    });

    it("traps focus while open, closes from its drag handle, and gives focus back", async () => {
        const onOpenChange = vi.fn();
        withRegistry(
            <>
                <button type="button">Outside</button>
                <BottomSheet
                    trigger="Share"
                    aria-label="Share"
                    body={<button type="button">Copy link</button>}
                    onOpenChange={onOpenChange}
                />
            </>,
        );
        await settle();
        const trigger = byTestId(ids.trigger);
        await interact(() => userEvent.click(trigger));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        const content = byTestId(ids.content);
        await until(() =>
            expect(content.contains(document.activeElement)).toBe(true),
        );
        for (let i = 0; i < 4; i++) {
            await interact(() => userEvent.tab());
            expect(content.contains(document.activeElement)).toBe(true);
        }
        await interact(() => userEvent.click(byTestId(ids.dragHandle)));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        await until(() => expect(document.activeElement).toBe(trigger));
    });

    it("closes when dragged down by its handle", async () => {
        const onOpenChange = vi.fn();
        withRegistry(
            <BottomSheet
                defaultOpen
                aria-label="Share"
                body="Options"
                onOpenChange={onOpenChange}
            />,
        );
        await frames();
        const handle = byTestId(ids.dragHandle);
        const at = (type: string, y: number) =>
            handle.dispatchEvent(
                new PointerEvent(type, {
                    clientY: y,
                    pointerId: 1,
                    button: 0,
                    bubbles: true,
                }),
            );
        at("pointerdown", 0);
        at("pointermove", 2000);
        at("pointerup", 2000);
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("asks onClose before Escape, the scrim, the handle's press, or a drag closes it", async () => {
        const onOpenChange = vi.fn();
        let answer = false;
        const onClose = vi.fn(() => answer);
        withRegistry(
            <BottomSheet
                defaultOpen
                aria-label="Share"
                body="Options"
                onOpenChange={onOpenChange}
                onClose={onClose}
            />,
        );
        await frames();
        const handle = byTestId(ids.dragHandle);
        const drag = () => {
            for (const [type, y] of [
                ["pointerdown", 0],
                ["pointermove", 2000],
                ["pointerup", 2000],
            ] as const)
                handle.dispatchEvent(
                    new PointerEvent(type, {
                        clientY: y,
                        pointerId: 1,
                        button: 0,
                        bubbles: true,
                    }),
                );
        };
        await interact(() => userEvent.keyboard("{Escape}"));
        await interact(() => userEvent.click(byTestId(ids.dragHandle)));
        await interact(() =>
            userEvent.click(byTestId(ids.positioner), {
                position: { x: 5, y: 5 },
                force: true,
            }),
        );
        drag();
        await frames();
        expect(onClose).toHaveBeenCalledTimes(4);
        expect(onOpenChange).not.toHaveBeenCalled();
        // Kept open, the dragged sheet settled back once that render committed.
        expect(byTestId(ids.content).style.translate).toBe("");
        answer = true;
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(onClose).toHaveBeenCalledTimes(5);
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("as a standard sheet, has no backdrop, doesn't trap focus, and lets presses beside it through", async () => {
        withRegistry(
            <BottomSheet modal={false} defaultOpen aria-label="Now playing" />,
        );
        await frames();
        const content = byTestId(ids.content);
        expect(content.className).toContain("bottom-sheet--modal-false");
        expect(content.getAttribute("aria-modal")).not.toBe("true");
        expect(
            document.querySelector(
                `[data-testid="${compositeTestIds.bottomSheetBackdrop.root}"]`,
            ),
        ).toBeNull();
        expect(byTestId(ids.positioner).style.pointerEvents).toBe("none");
        expect(content.style.pointerEvents).toBe("auto");
    });

    it("leaves the drag handle out on request", async () => {
        withRegistry(
            <BottomSheet defaultOpen dragHandle={false} body="Options" />,
        );
        await frames();
        expect(
            document.querySelector(`[data-testid="${ids.dragHandle}"]`),
        ).toBeNull();
    });
});

describe("DragHandle", () => {
    it("is a button holding a hidden pill, vertical on request", async () => {
        withRegistry(<DragHandle aria-label="Resize" orientation="vertical" />);
        await settle();
        const root = byTestId("pf-drag-handle-root");
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("type")).toBe("button");
        expect(root.className).toBe(
            "drag-handle drag-handle--orientation-vertical",
        );
        expect(
            byTestId("pf-drag-handle-handle").getAttribute("aria-hidden"),
        ).toBe("true");
    });
});
