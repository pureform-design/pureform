import { testIds } from "@pureform/anatomy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CopyButton } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.iconButton;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={togglesRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

// Headless Chromium denies the clipboard write; the machine still goes to copied.
beforeEach(() => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
});

describe("CopyButton", () => {
    it("is a named icon button showing the copy icon", async () => {
        withRegistry(() => <CopyButton value="secret" variant="tonal" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("aria-label")).toBe("Copy to clipboard");
        expect(root.className).toContain("icon-button--variant-tonal");
        expect(root.hasAttribute("data-copied")).toBe(false);
        expect(byTestId(ids.icon).querySelector("svg")).not.toBeNull();
    });

    it("copies the value, swaps the icon and the name, and calls onCopy", async () => {
        const onCopy = vi.fn();
        withRegistry(() => (
            <CopyButton
                value="secret"
                onCopy={onCopy}
                icon="C"
                copiedIcon="OK"
                copiedLabel="Done"
            />
        ));
        await settle();
        expect(byTestId(ids.icon).textContent).toBe("C");
        await userEvent.click(byTestId(ids.root));
        expect(onCopy).toHaveBeenCalledWith("secret");
        expect(byTestId(ids.icon).textContent).toBe("OK");
        expect(byTestId(ids.root).getAttribute("aria-label")).toBe("Done");
        expect(byTestId(ids.root).hasAttribute("data-copied")).toBe(true);
    });

    it("goes back to idle after its timeout", async () => {
        withRegistry(() => (
            <CopyButton value="x" icon="C" copiedIcon="OK" timeout={1500} />
        ));
        await settle();
        await userEvent.click(byTestId(ids.root));
        await vi.waitFor(() =>
            expect(byTestId(ids.icon).textContent).toBe("OK"),
        );
        await vi.waitFor(
            () => expect(byTestId(ids.icon).textContent).toBe("C"),
            { timeout: 4000 },
        );
    });
});
