import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Snackbar } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.snackbar;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("Snackbar, ready-made", () => {
    it("renders a status with its message, action, and a named close button", async () => {
        withRegistry(() => (
            <Snackbar
                defaultOpen
                supportingText="Message archived"
                action="Undo"
                closeLabel="Dismiss"
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("snackbar");
        expect(root.getAttribute("role")).toBe("status");
        expect(root.hidden).toBe(false);
        expect(byTestId(ids.supportingText).textContent).toBe(
            "Message archived",
        );
        expect(byTestId(ids.action).textContent).toBe("Undo");
        const close = byTestId(ids.close);
        expect(close.getAttribute("aria-label")).toBe("Dismiss");
        expect(close.querySelector("svg")).not.toBeNull();
    });

    it("leaves out the action and close button unless given, and hides while closed", async () => {
        withRegistry(() => <Snackbar supportingText="Saved" />);
        await settle();
        expect(byTestId(ids.root).hidden).toBe(true);
        expect(
            document.querySelector(`[data-testid="${ids.action}"]`),
        ).toBeNull();
        expect(
            document.querySelector(`[data-testid="${ids.close}"]`),
        ).toBeNull();
    });

    it("reports the action, then asks to close with its reason", async () => {
        const onAction = vi.fn();
        const onOpenChange = vi.fn();
        withRegistry(() => (
            <Snackbar
                open
                // No countdown: a loaded machine's click can land after the default 5 seconds.
                duration={null}
                supportingText="Message archived"
                action="Undo"
                onAction={onAction}
                onOpenChange={onOpenChange}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.action));
        await settle();
        expect(onAction).toHaveBeenCalledOnce();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "action",
        });
        // Controlled: it stays until the owner closes it.
        expect(byTestId(ids.root).hidden).toBe(false);
    });

    it("closes itself after its duration", async () => {
        const onOpenChange = vi.fn();
        withRegistry(() => (
            <Snackbar
                defaultOpen
                duration={50}
                supportingText="Saved"
                onOpenChange={onOpenChange}
                // The pointer may rest where the last test left it, which holds the snackbar open.
                style={{ root: { "pointer-events": "none" } }}
            />
        ));
        await settle();
        await new Promise((resolve) => setTimeout(resolve, 100));
        await settle();
        expect(byTestId(ids.root).hidden).toBe(true);
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "timeout",
        });
    });
});
