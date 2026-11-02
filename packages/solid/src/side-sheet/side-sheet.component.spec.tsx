import { compositeTestIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SideSheet } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.sideSheet;

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

describe("SideSheet, ready-made", () => {
    it("renders a modal sheet named by its headline, with a close button, body and actions", async () => {
        withRegistry(() => (
            <SideSheet
                trigger="Filters"
                headline="Filters"
                body="Pick some."
                actions={<Button label="Save" />}
            />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe(
            "side-sheet side-sheet--modal-true side-sheet--coplanar-false",
        );
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.headline).id,
        );
        expect(byTestId(ids.headline).tagName).toBe("H2");
        expect(byTestId(ids.closeTrigger).getAttribute("aria-label")).toBe(
            "Close",
        );
        expect(byTestId(ids.actions).textContent).toBe("Save");
        expect(
            document.querySelector(`[data-testid="${ids.backButton}"]`),
        ).toBeNull();
        expect(byTestId(ids.positioner).style.justifyContent).toBe("flex-end");
        expect(byTestId(compositeTestIds.sideSheetBackdrop.root)).toBeTruthy();
    });

    it("traps focus while open, closes with its close button, and gives focus back", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <>
                <button type="button">Outside</button>
                <SideSheet
                    trigger="Filters"
                    headline="Filters"
                    body={<button type="button">Reset</button>}
                    onOpenChange={onOpenChange}
                />
            </>
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        await userEvent.click(trigger);
        await frames();
        const content = byTestId(ids.content);
        await until(() =>
            expect(content.contains(document.activeElement)).toBe(true),
        );
        for (let i = 0; i < 4; i++) {
            await userEvent.tab();
            expect(content.contains(document.activeElement)).toBe(true);
        }
        await userEvent.click(byTestId(ids.closeTrigger));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        await until(() => expect(document.activeElement).toBe(trigger));
    });

    it("shows a mirrored back button given onBack", async () => {
        const onBack = vi.fn<() => void>();
        withRegistry(() => (
            <SideSheet defaultOpen headline="Filters" onBack={onBack} />
        ));
        await frames();
        const back = byTestId(ids.backButton);
        expect(back.getAttribute("aria-label")).toBe("Back");
        await userEvent.click(back);
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("as a coplanar sheet, stays in the page's layout with its backdrop hidden", async () => {
        withRegistry(() => (
            <SideSheet modal={false} coplanar defaultOpen headline="Details" />
        ));
        await frames();
        expect(byTestId(ids.content).className).toBe(
            "side-sheet side-sheet--modal-false side-sheet--coplanar-true",
        );
        expect(byTestId(ids.positioner).style.position).toBe("");
        expect(byTestId(compositeTestIds.sideSheetBackdrop.root).hidden).toBe(
            true,
        );
    });

    it("ignores coplanar on a modal sheet", async () => {
        withRegistry(() => <SideSheet coplanar defaultOpen headline="A" />);
        await frames();
        expect(byTestId(ids.content).className).toContain(
            "side-sheet--coplanar-false",
        );
    });
});

describe("SideSheet, onClose", () => {
    it("asks onClose before Escape, the scrim or its close trigger closes it, refused and then allowed", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        let answer = false;
        const onClose = vi.fn<() => boolean | Promise<boolean>>(() => answer);
        withRegistry(() => (
            <SideSheet
                defaultOpen
                aria-label="Filters"
                headline="Filters"
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
        const onClose = vi.fn<() => boolean | Promise<boolean>>(() => false);
        const [open, setOpen] = createSignal(true);
        withRegistry(() => (
            <SideSheet
                aria-label="Filters"
                headline="Filters"
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
