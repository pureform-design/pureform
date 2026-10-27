import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { IconButton } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { interact, mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.iconButton;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={togglesRegistry()}>
            {view}
        </PureformProvider>,
    );

describe("IconButton, ready-made", () => {
    it("renders a named native button with its touch target, container, icon, and outline", async () => {
        withRegistry(
            <IconButton icon="★" aria-label="Favorite" variant="outlined" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("aria-label")).toBe("Favorite");
        expect(root.className).toBe(
            "icon-button icon-button--variant-outlined icon-button--toggle-false",
        );
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "container", "outline"]);
        expect(byTestId(ids.icon).parentElement).toBe(byTestId(ids.container));
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(root.hasAttribute("aria-pressed")).toBe(false);
    });

    it("draws as a toggle once given selected or defaultSelected, and toggles", async () => {
        const onSelectedChange =
            vi.fn<(details: ChangeDetails<"selected", boolean>) => void>();
        withRegistry(
            <IconButton
                icon="★"
                aria-label="Favorite"
                defaultSelected={false}
                onSelectedChange={onSelectedChange}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("icon-button icon-button--toggle-true");
        expect(root.getAttribute("aria-pressed")).toBe("false");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange.mock.calls).toEqual([[{ selected: true }]]);
    });

    it("warns in development when it has no accessible name", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        withRegistry(
            <IconButton.Root>
                <IconButton.Icon>★</IconButton.Icon>
            </IconButton.Root>,
        );
        await settle();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("IconButton shows only an icon"),
        );
        warn.mockRestore();
    });
});
