import { testIds } from "@pureform/anatomy";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NavigationBar } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { NavigationRail } from "../navigation-rail";
import { mount, settle } from "../testing/render";

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

const ids = testIds.navigationBar;

const ITEMS = [
    { value: "home", label: "Home", icon: "⌂" },
    { value: "search", label: "Search", icon: "⌕" },
    { value: "settings", label: "Settings", disabled: true },
];

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={navigationRegistry()}>
            {view}
        </PureformProvider>,
    );

const items = (id: string = ids.item) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("NavigationBar, ready-made", () => {
    it("renders a nav of buttons, the current one marked, each in the preset's structure", async () => {
        withRegistry(
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                defaultValue="home"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("NAV");
        expect(root.className).toBe("navigation-bar");
        expect(items().map((item) => item.tagName)).toEqual([
            "BUTTON",
            "BUTTON",
            "BUTTON",
        ]);
        expect(items()[0]!.getAttribute("aria-current")).toBe("true");
        expect(items()[1]!.hasAttribute("aria-current")).toBe(false);
        expect((items()[2] as HTMLButtonElement).disabled).toBe(true);
        const indicator = items()[0]!.firstElementChild!;
        expect(indicator.getAttribute("data-pf-part")).toBe("indicator");
        expect(
            [...indicator.children].map(
                (part) =>
                    part.getAttribute("data-pf-part") ??
                    (part.hasAttribute("data-ripple-layer") ? "layer" : null),
            ),
        ).toEqual(["layer", "active-indicator", "icon"]);
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(items()[2]!.querySelector(`[data-testid="${ids.icon}"]`)).toBe(
            null,
        );
    });

    it("moves with a click and reports it once; controlled, it asks", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                defaultValue="home"
                onValueChange={onValueChange}
            />,
        );
        await settle();
        await userEvent.click(items()[1]!);
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "search",
        });
        expect(items()[1]!.getAttribute("aria-current")).toBe("true");
        cleanup();

        const asked = vi.fn();
        withRegistry(
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                value="home"
                onValueChange={asked}
            />,
        );
        await settle();
        await userEvent.click(items()[1]!);
        await settle();
        expect(asked).toHaveBeenCalledExactlyOnceWith({ value: "search" });
        expect(items()[0]!.getAttribute("aria-current")).toBe("true");
    });

    it("renders a destination with an href as a link to the current page", async () => {
        withRegistry(
            <NavigationBar
                aria-label="Main"
                defaultValue="home"
                items={[
                    { value: "home", label: "Home", href: "#home" },
                    { value: "inbox", label: "Inbox", href: "#inbox" },
                ]}
            />,
        );
        await settle();
        expect(items()[0]!.tagName).toBe("A");
        expect(items()[0]!.getAttribute("href")).toBe("#home");
        expect(items()[0]!.getAttribute("aria-current")).toBe("page");
    });
});

describe("NavigationRail", () => {
    it("is the bar's parts under its own scope", async () => {
        withRegistry(
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                defaultValue="search"
            />,
        );
        await settle();
        const root = byTestId(testIds.navigationRail.root);
        expect(root.className).toBe("navigation-rail");
        expect(root.getAttribute("data-scope")).toBe("navigation-rail");
        expect(
            items(testIds.navigationRail.item)[1]!.getAttribute("aria-current"),
        ).toBe("true");
    });

    it("renders its header above the destinations", async () => {
        withRegistry(
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                header={<button type="button">Menu</button>}
            />,
        );
        await settle();
        const header = byTestId(testIds.navigationRail.root).firstElementChild!;
        expect(header.getAttribute("data-testid")).toBe(
            testIds.navigationRail.header,
        );
        expect(header.className).toBe("navigation-rail__header");
        expect(header.textContent).toBe("Menu");
    });

    it("as a modal, sits in a dialog over the scrim, and closes with Escape", async () => {
        const onOpenChange = vi.fn();
        withRegistry(
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                modal
                defaultOpen
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        const root = byTestId(testIds.navigationRail.root);
        expect(root.className).toContain("navigation-rail--modal-true");
        expect(root.className).toContain("navigation-rail--expanded-true");
        const dialog = root.closest<HTMLElement>("[role=dialog]")!;
        expect(dialog.getAttribute("aria-modal")).toBe("true");
        expect(dialog.hidden).toBe(false);
        expect(document.querySelector(".scrim")).not.toBeNull();
        await userEvent.keyboard("{Escape}");
        await settle();
        expect(onOpenChange).toHaveBeenCalledWith(
            expect.objectContaining({ open: false }),
        );
        expect(dialog.hidden).toBe(true);
    });
});

describe("NavigationBar, item layout", () => {
    it("selects the horizontal layout", async () => {
        withRegistry(
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                itemLayout="horizontal"
            />,
        );
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "navigation-bar--itemLayout-horizontal",
        );
    });
});
