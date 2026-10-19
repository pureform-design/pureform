import { testIds } from "@pureform/anatomy";
import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NavigationBar } from ".";
import type { NavigationBarProps } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { NavigationRail } from "../navigation-rail";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.navigationBar;

const ITEMS: NavigationBarProps["items"] = [
    { value: "home", label: "Home", icon: "⌂" },
    { value: "search", label: "Search", icon: "⌕" },
    { value: "settings", label: "Settings", disabled: true },
];

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={navigationRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const items = (id: string = ids.item) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("NavigationBar, ready-made", () => {
    it("renders a nav of buttons, the current one marked, each in the preset's structure", async () => {
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                defaultValue="home"
            />
        ));
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
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                defaultValue="home"
                onValueChange={onValueChange}
            />
        ));
        await settle();
        await userEvent.click(items()[1]!);
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "search",
        });
        expect(items()[1]!.getAttribute("aria-current")).toBe("true");
        document.body.innerHTML = "";

        const asked = vi.fn();
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                value="home"
                onValueChange={asked}
            />
        ));
        await settle();
        await userEvent.click(items()[1]!);
        await settle();
        expect(asked).toHaveBeenCalledExactlyOnceWith({ value: "search" });
        expect(items()[0]!.getAttribute("aria-current")).toBe("true");
    });

    it("keeps its destinations, and the focus, when the owner takes a change through a spread", async () => {
        const warn = vi.spyOn(console, "warn");
        try {
            const [props, setProps] = createSignal(
                { value: "home" },
                { ownedWrite: true },
            );
            withRegistry(() => (
                <NavigationBar
                    aria-label="Main"
                    items={ITEMS}
                    {...props()}
                    onValueChange={({ value }) => {
                        setProps({ value: value! });
                        flush();
                    }}
                />
            ));
            await settle();
            const before = items();
            await userEvent.click(before[1]!);
            await settle();
            expect(items()).toEqual(before);
            expect(before[1]!.getAttribute("aria-current")).toBe("true");
            expect(document.activeElement).toBe(before[1]);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it("turns a destination into a link when it's given an href", async () => {
        const [entries, setEntries] = createSignal(ITEMS, { ownedWrite: true });
        withRegistry(() => (
            <NavigationBar aria-label="Main" items={entries()} />
        ));
        await settle();
        expect(items()[0]!.tagName).toBe("BUTTON");
        setEntries([{ ...ITEMS[0]!, href: "#home" }, ...ITEMS.slice(1)]);
        await settle();
        expect(items()[0]!.tagName).toBe("A");
        expect(items()[0]!.getAttribute("href")).toBe("#home");
    });

    it("renders a destination with an href as a link to the current page", async () => {
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                defaultValue="home"
                items={[
                    { value: "home", label: "Home", href: "#home" },
                    { value: "inbox", label: "Inbox", href: "#inbox" },
                ]}
            />
        ));
        await settle();
        expect(items()[0]!.tagName).toBe("A");
        expect(items()[0]!.getAttribute("href")).toBe("#home");
        expect(items()[0]!.getAttribute("aria-current")).toBe("page");
    });
});

describe("NavigationRail", () => {
    it("is the bar's parts under its own scope", async () => {
        withRegistry(() => (
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                defaultValue="search"
            />
        ));
        await settle();
        const root = byTestId(testIds.navigationRail.root);
        expect(root.className).toBe("navigation-rail");
        expect(root.getAttribute("data-scope")).toBe("navigation-rail");
        expect(
            items(testIds.navigationRail.item)[1]!.getAttribute("aria-current"),
        ).toBe("true");
    });
});
