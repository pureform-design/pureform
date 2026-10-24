import { compositeTestIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Dialog } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { byTestId, mount, settle } from "../testing/mount";

const ids = compositeTestIds.dialog;
const backdrop = compositeTestIds.dialogBackdrop;

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

describe("Dialog, ready-made", () => {
    it("passes a part's class and style to the Button it draws", async () => {
        withRegistry(() => (
            <Dialog
                trigger="Discard"
                headline="Discard draft?"
                class={{ trigger: "my-trigger", backdrop: "my-backdrop" }}
                style={{
                    trigger: { color: "red" },
                    backdrop: { opacity: "0.5" },
                }}
                slotProps={{ backdrop: { title: "yes" } }}
            />
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        expect(trigger.classList.contains("my-trigger")).toBe(true);
        expect(trigger.style.color).toBe("red");
        const scrim = byTestId(backdrop.root);
        expect(scrim.classList.contains("my-backdrop")).toBe(true);
        expect(scrim.style.opacity).toBe("0.5");
        expect(scrim.getAttribute("title")).toBe("yes");
    });

    it("renders the dialog in place, named by its headline, hidden while closed", async () => {
        withRegistry(() => (
            <Dialog
                trigger="Discard"
                icon="★"
                headline="Discard draft?"
                body="Your changes won't be saved."
            />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("dialog dialog--icon-true");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.headline).id,
        );
        expect(byTestId(ids.headline).tagName).toBe("H2");
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(backdrop.root).className).toBe("scrim");
        expect(byTestId(backdrop.root).hidden).toBe(true);
        expect(byTestId(backdrop.root).style.position).toBe("fixed");
        const positioner = byTestId(ids.positioner);
        expect(positioner.hidden).toBe(true);
        expect(positioner.style.position).toBe("fixed");
        expect(byTestId(ids.root).contains(content)).toBe(true);
    });

    it("opens from its trigger, takes focus, closes with Escape, and gives focus back", async () => {
        const onOpenChange = vi.fn();
        withRegistry(() => (
            <Dialog
                trigger="Discard"
                headline="Discard draft?"
                onOpenChange={onOpenChange}
            />
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        await userEvent.click(trigger);
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        expect(byTestId(backdrop.root).hidden).toBe(false);
        expect(document.activeElement).toBe(byTestId(ids.content));
        await userEvent.keyboard("{Escape}");
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it("maps the backdrop's test id and unstyled from Root's", async () => {
        withRegistry(() => (
            <Dialog
                headline="Saved"
                testId={{ backdrop: "dim" }}
                unstyled={{ backdrop: true }}
            />
        ));
        await settle();
        expect(byTestId("dim").className).toBe("");
        expect(byTestId(ids.content).className).toBe("dialog");
    });
});

describe("Dialog, compound", () => {
    it("closes from a close trigger drawn as a button", async () => {
        const onOpenChange = vi.fn();
        withRegistry(() => (
            <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Headline>Saved</Dialog.Headline>
                        <Dialog.Actions>
                            <Dialog.CloseTrigger
                                as={Button}
                                label="Close"
                                variant="text"
                            />
                        </Dialog.Actions>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        ));
        await frames();
        const close = byTestId(ids.closeTrigger);
        expect(close.className).toBe("button button--variant-text");
        await userEvent.click(close);
        await frames();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false });
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });
});

describe("Dialog, onClose", () => {
    it("asks onClose before Escape, the scrim or its close trigger closes it, refused and then allowed", async () => {
        const onOpenChange = vi.fn();
        let answer = false;
        const onClose = vi.fn(() => answer);
        withRegistry(() => (
            <Dialog
                trigger="Discard"
                defaultOpen
                aria-label="Discard"
                headline="Discard draft?"
                actions={<Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>}
                onOpenChange={onOpenChange}
                onClose={onClose}
            />
        ));
        await frames();
        await userEvent.keyboard("{Escape}");
        await userEvent.click(byTestId(ids.positioner), {
            position: { x: 5, y: 5 },
            force: true,
        });
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onClose).toHaveBeenCalledTimes(3);
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(byTestId(ids.positioner).hidden).toBe(false);
        answer = true;
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onClose).toHaveBeenCalledTimes(4);
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("doesn't ask onClose when a controlled open closes it", async () => {
        const onClose = vi.fn(() => false);
        const [open, setOpen] = createSignal(true);
        withRegistry(() => (
            <Dialog
                trigger="Discard"
                aria-label="Discard"
                headline="Discard draft?"
                actions={<Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>}
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
