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

    it("renders its header above the destinations", async () => {
        withRegistry(() => (
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                header={<button type="button">Menu</button>}
            />
        ));
        await settle();
        const root = byTestId(testIds.navigationRail.root);
        const header = root.firstElementChild!;
        expect(header.getAttribute("data-testid")).toBe(
            testIds.navigationRail.header,
        );
        expect(header.className).toBe("navigation-rail__header");
        expect(header.textContent).toBe("Menu");
    });

    it("composes a section label over a run of destinations", async () => {
        withRegistry(() => (
            <NavigationRail.Root aria-label="Main" expanded>
                <NavigationRail.SectionLabel>Mail</NavigationRail.SectionLabel>
                <NavigationRail.Item value="inbox">
                    <NavigationRail.Label>Inbox</NavigationRail.Label>
                </NavigationRail.Item>
            </NavigationRail.Root>
        ));
        await settle();
        const root = byTestId(testIds.navigationRail.root);
        const label = root.firstElementChild!;
        expect(label.getAttribute("data-testid")).toBe(
            testIds.navigationRail.sectionLabel,
        );
        expect(label.getAttribute("data-part")).toBe("section-label");
        expect(label.className).toBe("navigation-rail__sectionLabel");
        expect(label.textContent).toBe("Mail");
    });

    it("draws one heading over each section's destinations, the rail's only", async () => {
        const items = [
            { ...ITEMS[0]!, section: "Mail" },
            ITEMS[1]!,
            { ...ITEMS[2]!, section: "Mail" },
        ];
        withRegistry(() => (
            <>
                <NavigationRail aria-label="Main" items={items} expanded />
                <NavigationBar aria-label="Bar" items={items} />
            </>
        ));
        await settle();
        const labels = document.querySelectorAll<HTMLElement>(
            '[data-part="section-label"]',
        );
        expect(labels).toHaveLength(1);
        expect(labels[0]!.textContent).toBe("Mail");
        // The section's destinations sit together under it; the bar keeps its order.
        const values = (root: string) =>
            [
                ...byTestId(root).querySelectorAll<HTMLElement>(
                    '[data-part="item"]',
                ),
            ].map((item) => item.dataset["value"]);
        expect(values(testIds.navigationRail.root)).toEqual([
            "home",
            "settings",
            "search",
        ]);
        expect(values(testIds.navigationBar.root)).toEqual([
            "home",
            "search",
            "settings",
        ]);
        expect(labels[0]!.nextElementSibling!.getAttribute("data-value")).toBe(
            "home",
        );
    });

    it("selects expanded, and a modal rail is expanded too", async () => {
        withRegistry(() => (
            <NavigationRail aria-label="Main" items={ITEMS} expanded />
        ));
        await settle();
        expect(byTestId(testIds.navigationRail.root).className).toContain(
            "navigation-rail--expanded-true",
        );
    });

    it("as a modal, sits in a dialog over the scrim, and closes with Escape", async () => {
        const onOpenChange = vi.fn();
        withRegistry(() => (
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                modal
                defaultOpen
                onOpenChange={onOpenChange}
            />
        ));
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

describe("NavigationBar and NavigationRail, keyed by destination", () => {
    it("takes a function of each destination in its parts' keys", async () => {
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                defaultValue="search"
                class={{
                    item: ({ item, selected }) =>
                        selected ? `current-${item.value}` : undefined,
                }}
                style={{ label: ({ index }) => ({ opacity: index / 4 }) }}
                slotProps={{
                    icon: ({ index }) => ({ title: `icon ${index}` }),
                }}
                unstyled={{ activeIndicator: ({ index }) => index === 0 }}
            />
        ));
        await settle();
        const destinations = items();
        expect(destinations[1]!.classList.contains("current-search")).toBe(
            true,
        );
        expect(destinations[0]!.classList.contains("current-home")).toBe(false);
        expect(items(ids.label)[2]!.style.opacity).toBe("0.5");
        expect(items(ids.icon)[1]!.title).toBe("icon 1");
        expect(items(ids.activeIndicator)[0]!.className).toBe("");
        expect(items(ids.activeIndicator)[1]!.className).not.toBe("");
    });

    it("reaches a modal rail's scrim and dialog by their keys", async () => {
        withRegistry(() => (
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                modal
                defaultOpen
                testId={{ scrim: "rail-scrim", dialog: "rail-dialog" }}
                class={{ scrim: "dim", dialog: "sheet" }}
                style={{ scrim: { opacity: 0.5 } }}
                slotProps={{ dialog: { title: "Main menu" } }}
            />
        ));
        await settle();
        const scrim = byTestId("rail-scrim");
        expect(scrim.classList.contains("dim")).toBe(true);
        expect(scrim.classList.contains("scrim")).toBe(true);
        expect(scrim.style.opacity).toBe("0.5");
        const dialog = byTestId("rail-dialog");
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.classList.contains("sheet")).toBe(true);
        expect(dialog.title).toBe("Main menu");
    });

    it("leaves a modal rail's scrim unstyled by its key", async () => {
        withRegistry(() => (
            <NavigationRail
                aria-label="Main"
                items={ITEMS}
                modal
                defaultOpen
                testId="rail"
                unstyled={{ scrim: true }}
            />
        ));
        await settle();
        expect(byTestId("rail-scrim").className).toBe("");
        expect(byTestId("rail-dialog").getAttribute("role")).toBe("dialog");
    });
});

describe("NavigationBar, item layout", () => {
    it("selects the horizontal layout", async () => {
        withRegistry(() => (
            <NavigationBar
                aria-label="Main"
                items={ITEMS}
                itemLayout="horizontal"
            />
        ));
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "navigation-bar--itemLayout-horizontal",
        );
    });
});
