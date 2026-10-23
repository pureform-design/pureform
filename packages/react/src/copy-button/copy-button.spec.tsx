import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CopyButton } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.iconButton;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={togglesRegistry()}>
            {view}
        </PureformProvider>,
    );

// Headless Chromium denies the clipboard write, which a test of its own covers.
beforeEach(() => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("CopyButton", () => {
    it("is a named icon button showing the copy icon", async () => {
        withRegistry(<CopyButton value="secret" variant="tonal" />);
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
        withRegistry(
            <CopyButton
                value="secret"
                onCopy={onCopy}
                icon="C"
                copiedIcon="OK"
                copiedLabel="Done"
            />,
        );
        await settle();
        expect(byTestId(ids.icon).textContent).toBe("C");
        await userEvent.click(byTestId(ids.root));
        await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith("secret"));
        expect(byTestId(ids.icon).textContent).toBe("OK");
        expect(byTestId(ids.root).getAttribute("aria-label")).toBe("Done");
        expect(byTestId(ids.root).hasAttribute("data-copied")).toBe(true);
    });

    it("goes back to idle after its timeout", async () => {
        withRegistry(
            <CopyButton value="x" icon="C" copiedIcon="OK" timeout={1500} />,
        );
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

    it("announces the copy in a polite live region beside the button", async () => {
        withRegistry(<CopyButton value="x" copiedLabel="Token copied" />);
        await settle();
        const status = document.querySelector<HTMLElement>('[role="status"]')!;
        expect(status.textContent).toBe("");
        await userEvent.click(byTestId(ids.root));
        await vi.waitFor(() => expect(status.textContent).toBe("Token copied"));
    });

    it("doesn't show copied when the write is denied, and calls onCopyError", async () => {
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
            new Error("denied"),
        );
        vi.spyOn(document, "execCommand").mockReturnValue(false);
        const onCopy = vi.fn();
        const onCopyError = vi.fn();
        withRegistry(
            <CopyButton
                value="secret"
                icon="C"
                copiedIcon="OK"
                onCopy={onCopy}
                onCopyError={onCopyError}
            />,
        );
        await settle();
        await userEvent.click(byTestId(ids.root));
        await vi.waitFor(() =>
            expect(onCopyError).toHaveBeenCalledWith({
                value: "secret",
                error: expect.objectContaining({ message: "denied" }),
            }),
        );
        expect(onCopy).not.toHaveBeenCalled();
        expect(byTestId(ids.icon).textContent).toBe("C");
        expect(byTestId(ids.root).hasAttribute("data-copied")).toBe(false);
        expect(
            document.querySelector<HTMLElement>('[role="status"]')!.textContent,
        ).toBe("");
    });
});
