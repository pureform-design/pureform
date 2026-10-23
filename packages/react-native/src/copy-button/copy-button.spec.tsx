import { testIds } from "@pureform/anatomy";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CopyButton } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact } from "../testing/render";
import { mount } from "../testing/render";

const ids = testIds.iconButton;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["iconButton", "ripple"]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

describe("CopyButton on React Native", () => {
    it("copies through the app's function, then shows it copied", async () => {
        const copy = vi.fn();
        const onCopy = vi.fn();
        await withRegistry(
            <CopyButton
                value="secret"
                copy={copy}
                onCopy={onCopy}
                icon="C"
                copiedIcon="OK"
                copiedLabel="Done"
            />,
        );
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-label")).toBe("Copy to clipboard");
        expect(byTestId(ids.icon).textContent).toBe("C");
        await interact(() => userEvent.click(root));
        expect(copy).toHaveBeenCalledWith("secret");
        expect(onCopy).toHaveBeenCalledWith("secret");
        expect(byTestId(ids.icon).textContent).toBe("OK");
        expect(byTestId(ids.root).getAttribute("aria-label")).toBe("Done");
    });

    it("shows nothing and calls onCopyError when the copy is denied", async () => {
        const copy = vi.fn(() => Promise.reject(new Error("denied")));
        const onCopy = vi.fn();
        const onCopyError = vi.fn();
        await withRegistry(
            <CopyButton
                value="secret"
                copy={copy}
                onCopy={onCopy}
                onCopyError={onCopyError}
                icon="C"
                copiedIcon="OK"
            />,
        );
        await interact(() => userEvent.click(byTestId(ids.root)));
        await vi.waitFor(() =>
            expect(onCopyError).toHaveBeenCalledWith({
                value: "secret",
                error: expect.objectContaining({ message: "denied" }),
            }),
        );
        expect(onCopy).not.toHaveBeenCalled();
        expect(byTestId(ids.icon).textContent).toBe("C");
    });
});
