import { compositeTestIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Menu } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { Errored, interact, mount, quietly, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.menu;

const ITEMS = [
    { value: "cut", label: "Cut", leadingIcon: "✂", trailingText: "⌘X" },
    { value: "copy", label: "Copy" },
    { value: "paste", label: "Paste", disabled: true },
];

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const items = () =>
    document.querySelectorAll<HTMLElement>(`[data-testid="${ids.item}"]`);

describe("Menu, ready-made", () => {
    it("renders the trigger as a button and the menu in place, hidden while closed", async () => {
        withRegistry(<Menu trigger="Edit" items={ITEMS} />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("");
        const trigger = byTestId<HTMLButtonElement>(ids.trigger);
        expect(trigger.tagName).toBe("BUTTON");
        expect(trigger.className).toBe("button");
        expect(trigger.getAttribute("data-scope")).toBe("menu");
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(trigger.textContent).toBe("Edit");
        expect(byTestId(ids.positioner).hidden).toBe(true);
        const content = byTestId(ids.content);
        expect(content.className).toBe("menu");
        expect(content.getAttribute("data-pf-part")).toBe("content");
        expect(content.getAttribute("role")).toBe("menu");
        expect(root.contains(content)).toBe(true);
        expect(items()).toHaveLength(3);
        expect(items()[0]!.className).toBe("menu__item");
        expect(byTestId(ids.itemLeading).getAttribute("aria-hidden")).toBe(
            "true",
        );
        expect(byTestId(ids.itemTrailingText).textContent).toBe("⌘X");
        expect(items()[2]!.getAttribute("aria-disabled")).toBe("true");
    });

    it("opens with a click, highlights with the arrow keys, and reports the chosen item", async () => {
        const onSelect = vi.fn();
        const onOpenChange = vi.fn();
        withRegistry(
            <Menu
                trigger="Edit"
                items={ITEMS}
                onSelect={onSelect}
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        expect(document.activeElement).toBe(byTestId(ids.content));
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        await settle();
        expect(items()[0]!.hasAttribute("data-pf-hover")).toBe(true);
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        await settle();
        expect(items()[1]!.hasAttribute("data-pf-hover")).toBe(true);
        await interact(() => userEvent.keyboard("{Enter}"));
        await frames();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "copy" });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(byTestId(ids.trigger));
    });

    it("takes slot-keyed classes, test ids, and the menu's variants", async () => {
        withRegistry(
            <Menu
                trigger="Edit"
                items={ITEMS}
                color="secondary"
                testId="edit"
                className={{ content: "wide", item: "row" }}
            />,
        );
        await settle();
        const content = byTestId("edit-content");
        expect(content.className).toBe("menu menu--color-secondary wide");
        expect(byTestId("edit-trigger").tagName).toBe("BUTTON");
        expect(byTestId("edit-root")).toBeTruthy();
        expect(
            document.querySelector('[data-testid="edit-item"]')!.className,
        ).toBe("menu__item row");
    });
});

describe("Menu, context trigger", () => {
    it("renders an area before the menu and opens it at a right-click and the context menu key", async () => {
        withRegistry(<Menu contextTrigger="Right-click here" items={ITEMS} />);
        await settle();
        const area = byTestId(ids.contextTrigger);
        expect(area.textContent).toBe("Right-click here");
        expect(area.getAttribute("data-part")).toBe("context-trigger");
        expect(document.querySelector(`[data-testid="${ids.trigger}"]`)).toBe(
            null,
        );
        expect(byTestId(ids.positioner).hidden).toBe(true);
        const event = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: 40,
            clientY: 50,
        });
        await interact(async () => area.dispatchEvent(event));
        await frames();
        expect(event.defaultPrevented).toBe(true);
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
        const key = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "F10",
            shiftKey: true,
        });
        await interact(async () => area.dispatchEvent(key));
        await frames();
        expect(key.defaultPrevented).toBe(true);
        expect(byTestId(ids.positioner).hidden).toBe(false);
    });

    it("composes, beside a trigger", async () => {
        withRegistry(
            <Menu.Root>
                <Menu.Trigger>Edit</Menu.Trigger>
                <Menu.ContextTrigger>Area</Menu.ContextTrigger>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.ItemEntry item={ITEMS[1]!} />
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>,
        );
        await settle();
        expect(byTestId(ids.trigger).textContent).toBe("Edit");
        expect(byTestId(ids.contextTrigger).textContent).toBe("Area");
    });
});

describe("Menu, groups and toggles", () => {
    it("renders groups after the items, each labelled, and is grouped unless told otherwise", async () => {
        withRegistry(
            <Menu
                trigger="View"
                items={[
                    { value: "zoom", label: "Zoom", supportingText: "Ctrl +" },
                ]}
                groups={[
                    {
                        id: "sort",
                        label: "Sort by",
                        items: [{ value: "name", label: "Name" }],
                    },
                    { id: "misc", items: [{ value: "help", label: "Help" }] },
                ]}
                vibrant
            />,
        );
        await settle();
        expect(byTestId(ids.content).className).toBe(
            "menu menu--vibrant-true menu--grouped-true",
        );
        const groups = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.itemGroup}"]`,
        );
        expect(groups).toHaveLength(2);
        expect(groups[0]!.getAttribute("role")).toBe("group");
        const label = byTestId(ids.itemGroupLabel);
        expect(label.textContent).toBe("Sort by");
        expect(groups[0]!.getAttribute("aria-labelledby")).toBe(label.id);
        expect(groups[0]!.textContent).toContain("Name");
        expect(items()[0]!.textContent).toBe("ZoomCtrl +");
        const content = items()[0]!.querySelector<HTMLElement>(
            `[data-testid="${ids.itemContent}"]`,
        )!;
        expect(content.className).toBe("menu__itemContent");
        expect(byTestId(ids.itemSupportingText).parentElement).toBe(content);
        expect(byTestId(ids.itemSupportingText).textContent).toBe("Ctrl +");
    });

    it("takes grouped={false} over its groups", async () => {
        withRegistry(
            <Menu
                trigger="View"
                grouped={false}
                groups={[{ id: "a", items: [{ value: "x", label: "X" }] }]}
            />,
        );
        await settle();
        expect(byTestId(ids.content).className).toBe("menu");
    });

    it("toggles a checkbox item, reporting the change", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Menu
                trigger="View"
                items={[
                    {
                        value: "grid",
                        label: "Grid",
                        type: "checkbox",
                        checked: false,
                        onCheckedChange,
                    },
                    {
                        value: "list",
                        label: "List",
                        type: "checkbox",
                        checked: true,
                    },
                ]}
            />,
        );
        await settle();
        expect(items()[0]!.getAttribute("role")).toBe("menuitemcheckbox");
        expect(items()[0]!.getAttribute("aria-checked")).toBe("false");
        expect(items()[1]!.getAttribute("aria-checked")).toBe("true");
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        await interact(() => userEvent.click(items()[0]!));
        await frames();
        expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
    });
});

describe("Menu, compound", () => {
    it("composes its parts, with any component as the trigger", async () => {
        const onSelect = vi.fn();
        withRegistry(
            <Menu.Root onSelect={onSelect}>
                <Menu.Trigger as={Button} label="More" variant="text" />
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Item value="share">
                            <Menu.ItemLabel>Share</Menu.ItemLabel>
                            <Menu.ItemTrailing mirror>→</Menu.ItemTrailing>
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>,
        );
        await settle();
        const trigger = byTestId(ids.trigger);
        expect(trigger.className).toBe("button button--variant-text");
        expect(byTestId(ids.itemTrailing).hasAttribute("data-pf-mirror")).toBe(
            true,
        );
        await interact(() => userEvent.click(trigger));
        await frames();
        await interact(() => userEvent.click(byTestId(ids.item)));
        await settle();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "share" });
    });

    it("marks its groups' first and last itself, from where they are", async () => {
        withRegistry(
            <Menu.Root defaultOpen>
                <Menu.Trigger>More</Menu.Trigger>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Item value="loose">
                            <Menu.ItemLabel>Loose</Menu.ItemLabel>
                        </Menu.Item>
                        {["a", "b", "c"].map((id) => (
                            <Menu.ItemGroup key={id} id={id}>
                                <Menu.Item value={id}>
                                    <Menu.ItemLabel>{id}</Menu.ItemLabel>
                                </Menu.Item>
                            </Menu.ItemGroup>
                        ))}
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>,
        );
        await frames();
        const groups = [
            ...document.querySelectorAll<HTMLElement>('[role="group"]'),
        ];
        expect(
            groups.map((group) => [
                group.hasAttribute("data-first"),
                group.hasAttribute("data-last"),
            ]),
        ).toEqual([
            [true, false],
            [false, false],
            [false, true],
        ]);
    });

    it("takes a group's own first and last over where it is", async () => {
        withRegistry(
            <Menu.Root defaultOpen>
                <Menu.Trigger>More</Menu.Trigger>
                <Menu.Positioner>
                    <Menu.Content>
                        {["a", "b", "c"].map((id) => (
                            <Menu.ItemGroup
                                key={id}
                                id={id}
                                {...(id === "a" ? { first: false } : {})}
                                {...(id === "b"
                                    ? { first: true, last: true }
                                    : {})}
                            >
                                <Menu.Item value={id}>
                                    <Menu.ItemLabel>{id}</Menu.ItemLabel>
                                </Menu.Item>
                            </Menu.ItemGroup>
                        ))}
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>,
        );
        await frames();
        const groups = [
            ...document.querySelectorAll<HTMLElement>('[role="group"]'),
        ];
        expect(
            groups.map((group) => [
                group.hasAttribute("data-first"),
                group.hasAttribute("data-last"),
            ]),
        ).toEqual([
            [false, false],
            [true, true],
            [false, true],
        ]);
    });

    it("throws for a part outside Root", () => {
        quietly(() =>
            mount(
                <Errored>
                    <Menu.Content />
                </Errored>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<Menu.Content> must be inside <Menu.Root>/,
        );
    });
});

describe("Menu, submenus", () => {
    const NESTED = [
        { value: "cut", label: "Cut" },
        {
            value: "share",
            label: "Share",
            items: [
                { value: "mail", label: "Mail" },
                { value: "link", label: "Copy link" },
            ],
        },
    ];

    const contents = () => [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.content}"]`,
        ),
    ];

    it("draws an item with items as the submenu's trigger, an arrow at its end", async () => {
        withRegistry(<Menu trigger="Edit" submenu="cascade" items={NESTED} />);
        await settle();
        expect(contents()).toHaveLength(2);
        const share = items()[1]!;
        expect(share.textContent).toContain("Share");
        expect(share.className).toBe("menu__item");
        expect(share.getAttribute("aria-haspopup")).toBe("menu");
        expect(share.getAttribute("aria-controls")).toBe(contents()[1]!.id);
        const arrow = share.querySelector<HTMLElement>(
            `[data-testid="${ids.itemTrailing}"]`,
        )!;
        expect(arrow.hasAttribute("data-pf-mirror")).toBe(true);
        expect(arrow.querySelector("svg")).not.toBeNull();
        expect(contents()[0]!.contains(contents()[1]!)).toBe(true);
    });

    it("opens the submenu with the arrow toward the end, reports its items' choice, and closes back", async () => {
        const onSelect = vi.fn();
        withRegistry(
            <Menu
                trigger="Edit"
                submenu="cascade"
                items={NESTED}
                onSelect={onSelect}
            />,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        await interact(() => userEvent.keyboard("{ArrowDown}{ArrowDown}"));
        await settle();
        const share = items()[1]!;
        expect(share.hasAttribute("data-pf-hover")).toBe(true);
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        await frames();
        expect(share.getAttribute("aria-expanded")).toBe("true");
        expect(document.activeElement).toBe(contents()[1]);
        expect(share.hasAttribute("data-pf-hover")).toBe(true);
        expect(items()[2]!.hasAttribute("data-pf-hover")).toBe(true);
        await interact(() => userEvent.keyboard("{ArrowLeft}"));
        await frames(6);
        expect(share.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(contents()[0]);
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        await frames();
        await interact(() => userEvent.keyboard("{Enter}"));
        await frames();
        expect(onSelect).toHaveBeenCalledWith({ value: "mail" });
    });

    const labels = () =>
        [...items()].map(
            (item) =>
                item.querySelector(`[data-testid="${ids.itemLabel}"]`)
                    ?.textContent,
        );

    it("drills into a submenu in the menu's place, under a row that goes back", async () => {
        const onSelect = vi.fn();
        const onOpenChange = vi.fn();
        withRegistry(
            <Menu
                trigger="Edit"
                submenu="drill"
                items={NESTED}
                onSelect={onSelect}
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        // One surface: the submenu's item is a row of the menu, its arrow at its end.
        expect(contents()).toHaveLength(1);
        const share = items()[1]!;
        expect(share.getAttribute("aria-haspopup")).toBe("menu");
        expect(
            share.querySelector(`[data-testid="${ids.itemTrailing}"] svg`),
        ).not.toBeNull();
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        await interact(() => userEvent.click(share));
        await frames();
        expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
        expect(onSelect).not.toHaveBeenCalled();
        expect(byTestId(ids.trigger).getAttribute("aria-expanded")).toBe(
            "true",
        );
        // The back row is highlighted, so the keys go on from it.
        expect(items()[0]!.hasAttribute("data-pf-hover")).toBe(true);
        await interact(() => userEvent.keyboard("{Enter}"));
        await frames();
        expect(labels()).toEqual(["Cut", "Share"]);
        await interact(() => userEvent.click(items()[1]!));
        await frames();
        await interact(() => userEvent.click(items()[1]!));
        await frames();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "mail" });
        // Choosing closes the menu; it opens again at the top.
        await frames(6);
        expect(byTestId(ids.trigger).getAttribute("aria-expanded")).toBe(
            "false",
        );
        expect(labels()).toEqual(["Cut", "Share"]);
    });

    it("cascades by default when a submenu fits beside the open menu, and drills when its container is narrow", async () => {
        try {
            await page.viewport(1000, 800);
            withRegistry(<Menu trigger="Edit" items={NESTED} />);
            await interact(() => userEvent.click(byTestId(ids.trigger)));
            await frames(6);
            expect(contents()).toHaveLength(2);
            await interact(() => userEvent.keyboard("{Escape}"));
            await frames();
            document.body.innerHTML = "";
            // A wide window, but the menu sits in a narrow panel that clips it.
            withRegistry(
                <div style={{ width: "70px", overflow: "hidden" }}>
                    <Menu trigger="Edit" items={NESTED} />
                </div>,
            );
            await interact(() => userEvent.click(byTestId(ids.trigger)));
            await frames(6);
            expect(contents()).toHaveLength(1);
            expect(items()[1]!.getAttribute("aria-haspopup")).toBe("menu");
        } finally {
            await page.viewport(414, 896);
        }
    });
});
