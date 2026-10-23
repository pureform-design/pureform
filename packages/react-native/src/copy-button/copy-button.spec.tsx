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
});
