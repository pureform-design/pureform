import { compositeTestIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { FullscreenDialog } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { byTestId, mount, settle } from "../testing/mount";

const ids = compositeTestIds.fullscreenDialog;

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

describe("FullscreenDialog, ready-made", () => {
    it("renders the dialog in place, named by its headline, hidden while closed, with no backdrop", async () => {
        withRegistry(() => (
            <FullscreenDialog
                trigger="New event"
                headline="New event"
                confirmAction="Save"
                body="Fill in the details."
            />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("fullscreen-dialog");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.headline).id,
        );
        expect(content.getAttribute("aria-describedby")).toBe(
            byTestId(ids.body).id,
        );
        expect(byTestId(ids.headline).tagName).toBe("H2");
        expect(byTestId(ids.header).contains(byTestId(ids.closeTrigger))).toBe(
            true,
        );
        expect(byTestId(ids.header).contains(byTestId(ids.confirmAction))).toBe(
            true,
        );
        expect(byTestId(ids.confirmAction).className).toContain(
            "button--variant-text",
        );
        expect(byTestId(ids.closeTrigger).getAttribute("aria-label")).toBe(
            "Close",
        );
        expect(document.querySelector("[data-part=backdrop]")).toBeNull();
        const positioner = byTestId(ids.positioner);
        expect(positioner.hidden).toBe(true);
        expect(positioner.style.position).toBe("fixed");
        expect(positioner.style.padding).toBe("");
        expect(byTestId(ids.root).contains(content)).toBe(true);
    });

    it("opens from its trigger, takes focus, closes with its close trigger, and gives focus back", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <FullscreenDialog
                trigger="New event"
                headline="New event"
                closeLabel="Discard"
                onOpenChange={onOpenChange}
            />
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        await userEvent.click(trigger);
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        expect(byTestId(ids.closeTrigger).getAttribute("aria-label")).toBe(
            "Discard",
        );
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it("closes with Escape", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <FullscreenDialog
                defaultOpen
                headline="New event"
                onOpenChange={onOpenChange}
            />
        ));
        await frames();
        await userEvent.keyboard("{Escape}");
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });
});

describe("FullscreenDialog, compound", () => {
    it("draws its confirm action as a button and its own close trigger", async () => {
        withRegistry(() => (
            <FullscreenDialog.Root defaultOpen>
                <FullscreenDialog.Positioner>
                    <FullscreenDialog.Content>
                        <FullscreenDialog.Header>
                            <FullscreenDialog.CloseTrigger aria-label="Close">
                                ×
                            </FullscreenDialog.CloseTrigger>
                            <FullscreenDialog.Headline>
                                Settings
                            </FullscreenDialog.Headline>
                            <FullscreenDialog.ConfirmAction
                                as={Button}
                                variant="text"
                                label="Save"
                            />
                        </FullscreenDialog.Header>
                        <FullscreenDialog.Body>…</FullscreenDialog.Body>
                    </FullscreenDialog.Content>
                </FullscreenDialog.Positioner>
            </FullscreenDialog.Root>
        ));
        await frames();
        expect(byTestId(ids.header).className).toBe(
            "fullscreen-dialog__header",
        );
        expect(byTestId(ids.closeTrigger).className).toBe(
            "fullscreen-dialog__closeTrigger",
        );
        expect(byTestId(ids.confirmAction).className).toContain("button");
    });
});

describe("FullscreenDialog, onClose", () => {
    it("asks onClose before Escape or its close trigger closes it, refused and then allowed", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        let answer = false;
        const onClose = vi.fn<() => boolean | Promise<boolean>>(() => answer);
        withRegistry(() => (
            <FullscreenDialog
                defaultOpen
                aria-label="Event"
                headline="New event"
                onOpenChange={onOpenChange}
                onClose={onClose}
            />
        ));
        await frames();
        await userEvent.keyboard("{Escape}");
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(byTestId(ids.positioner).hidden).toBe(false);
        answer = true;
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onClose).toHaveBeenCalledTimes(3);
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("doesn't ask onClose when a controlled open closes it", async () => {
        const onClose = vi.fn<() => boolean | Promise<boolean>>(() => false);
        const [open, setOpen] = createSignal(true);
        withRegistry(() => (
            <FullscreenDialog
                aria-label="Event"
                headline="New event"
                open={open()}
                onClose={onClose}
            />
        ));
        await frames();
        setOpen(false);
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(onClose).not.toHaveBeenCalled();
    });
});
