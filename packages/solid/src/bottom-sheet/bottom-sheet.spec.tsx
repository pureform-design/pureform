import { compositeTestIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { BottomSheet } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { DragHandle } from "../drag-handle";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.bottomSheet;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

describe("BottomSheet, ready-made", () => {
    it("renders a modal sheet in place over a backdrop, at the bottom, with a drag handle", async () => {
        withRegistry(() => (
            <BottomSheet
                trigger="Share"
                aria-label="Share"
                body={<button type="button">Copy link</button>}
            />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe(
            "bottom-sheet bottom-sheet--modal-true bottom-sheet--dragHandle-true",
        );
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
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <>
                <button type="button">Outside</button>
                <BottomSheet
                    trigger="Share"
                    aria-label="Share"
                    body={<button type="button">Copy link</button>}
                    onOpenChange={onOpenChange}
                />
            </>
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        await userEvent.click(trigger);
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        const content = byTestId(ids.content);
        await until(() =>
            expect(content.contains(document.activeElement)).toBe(true),
        );
        for (let i = 0; i < 4; i++) {
            await userEvent.tab();
            expect(content.contains(document.activeElement)).toBe(true);
        }
        await userEvent.click(byTestId(ids.dragHandle));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        await until(() => expect(document.activeElement).toBe(trigger));
    });

    it("rests partly open when it can, and moves between partly and fully open", async () => {
        const onExpandedChange =
            vi.fn<(details: ChangeDetails<"expanded", boolean>) => void>();
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <BottomSheet
                defaultOpen
                aria-label="Share"
                body={<div style={{ height: "200vh" }}>Options</div>}
                onExpandedChange={onExpandedChange}
                onOpenChange={onOpenChange}
            />
        ));
        await frames();
        const content = byTestId(ids.content);
        const handle = byTestId(ids.dragHandle);
        await until(() => expect(content.style.translate).not.toBe(""));
        await until(() =>
            expect(handle.getAttribute("aria-label")).toBe("Expand sheet"),
        );
        // Opening partly open isn't the user's move: nothing reports it.
        expect(onExpandedChange).not.toHaveBeenCalled();
        await userEvent.click(handle);
        await frames();
        expect(content.style.translate).toBe("");
        await until(() =>
            expect(handle.getAttribute("aria-label")).toBe("Collapse sheet"),
        );
        expect(onExpandedChange).toHaveBeenLastCalledWith({ expanded: true });
        expect(onExpandedChange).toHaveBeenCalledTimes(1);
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("closes when dragged down by its handle", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <BottomSheet
                defaultOpen
                aria-label="Share"
                body="Options"
                onOpenChange={onOpenChange}
            />
        ));
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

    it("follows a controlled expanded, and scrolls its body by keyboard", async () => {
        const onExpandedChange =
            vi.fn<(details: ChangeDetails<"expanded", boolean>) => void>();
        const [expanded, setExpanded] = createSignal(true);
        withRegistry(() => (
            <>
                <button type="button" onClick={() => setExpanded(false)}>
                    Collapse
                </button>
                <BottomSheet
                    defaultOpen
                    modal={false}
                    aria-label="Share"
                    body={<div style={{ height: "200vh" }}>Options</div>}
                    expanded={expanded()}
                    onExpandedChange={onExpandedChange}
                    // This registry doesn't bound the body; the preset does.
                    slotProps={{
                        body: {
                            style: { "max-height": "70vh", overflow: "auto" },
                        },
                    }}
                />
            </>
        ));
        await frames();
        const content = byTestId(ids.content);
        const handle = byTestId(ids.dragHandle);
        expect(content.style.translate).toBe("");
        await until(() =>
            expect(byTestId(ids.body).getAttribute("tabindex")).toBe("0"),
        );
        // A press asks to collapse; the app didn't take it, so it stays fully open.
        await userEvent.click(handle);
        await frames();
        expect(onExpandedChange).toHaveBeenLastCalledWith({ expanded: false });
        expect(content.style.translate).toBe("");
        setExpanded(false);
        await frames();
        expect(content.style.translate).not.toBe("");
    });

    it("opens fully with partiallyExpandable off, and keeps a short body out of the tab order", async () => {
        withRegistry(() => (
            <BottomSheet
                defaultOpen
                partiallyExpandable={false}
                aria-label="Share"
                body="Options"
            />
        ));
        await frames();
        expect(byTestId(ids.content).style.translate).toBe("");
        expect(byTestId(ids.body).hasAttribute("tabindex")).toBe(false);
    });

    it("asks onClose before Escape, the scrim, the handle's press, or a drag closes it", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        let answer = false;
        const onClose = vi.fn<() => boolean | Promise<boolean>>(() => answer);
        withRegistry(() => (
            <BottomSheet
                defaultOpen
                aria-label="Share"
                body="Options"
                onOpenChange={onOpenChange}
                onClose={onClose}
            />
        ));
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
        await userEvent.keyboard("{Escape}");
        await userEvent.click(byTestId(ids.dragHandle));
        await userEvent.click(byTestId(ids.positioner), {
            position: { x: 5, y: 5 },
            force: true,
        });
        drag();
        await frames();
        expect(onClose).toHaveBeenCalledTimes(4);
        expect(onOpenChange).not.toHaveBeenCalled();
        // Kept open, the dragged sheet settled back once that render was done.
        expect(byTestId(ids.content).style.translate).toBe("");
        answer = true;
        await userEvent.keyboard("{Escape}");
        await frames();
        expect(onClose).toHaveBeenCalledTimes(5);
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("as a standard sheet, hides its backdrop, doesn't trap focus, and lets presses beside it through", async () => {
        withRegistry(() => (
            <BottomSheet modal={false} defaultOpen aria-label="Now playing" />
        ));
        await frames();
        const content = byTestId(ids.content);
        expect(content.className).toContain("bottom-sheet--modal-false");
        expect(content.getAttribute("aria-modal")).not.toBe("true");
        expect(byTestId(compositeTestIds.bottomSheetBackdrop.root).hidden).toBe(
            true,
        );
        expect(byTestId(ids.positioner).style.pointerEvents).toBe("none");
        expect(content.style.pointerEvents).toBe("auto");
    });

    it("leaves the drag handle out on request", async () => {
        withRegistry(() => (
            <BottomSheet defaultOpen dragHandle={false} body="Options" />
        ));
        await frames();
        expect(
            document.querySelector(`[data-testid="${ids.dragHandle}"]`),
        ).toBeNull();
        // Its body takes the top padding the handle gave it.
        expect(byTestId(ids.content).className).toContain(
            "bottom-sheet--dragHandle-false",
        );
    });
});

describe("DragHandle", () => {
    it("is a button holding a hidden pill, vertical on request", async () => {
        withRegistry(() => (
            <DragHandle aria-label="Resize" orientation="vertical" />
        ));
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

    it("gives the pill its slotProps", async () => {
        withRegistry(() => (
            <DragHandle
                aria-label="Close"
                slotProps={{ handle: { class: "pill", title: "grip" } }}
            />
        ));
        await settle();
        const handle = byTestId("pf-drag-handle-handle");
        expect(handle.classList.contains("pill")).toBe(true);
        expect(handle.title).toBe("grip");
    });
});
