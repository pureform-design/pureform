import { compositeTestIds } from "@pureform/anatomy";
import type { ComponentProps } from "solid-js";
import { createSignal, Errored, For } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Menu } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.menu;

const ITEMS = [
    { value: "cut", label: "Cut", leadingIcon: "✂", trailingText: "⌘X" },
    { value: "copy", label: "Copy" },
    { value: "paste", label: "Paste", disabled: true },
];

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const items = () => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.item}"]`),
];

describe("Menu, ready-made", () => {
    it("renders the trigger as a button and the menu in place, hidden while closed", async () => {
        withRegistry(() => <Menu trigger="Edit" items={ITEMS} />);
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
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof Menu>["onSelect"]>>();
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(() => (
            <Menu
                trigger="Edit"
                items={ITEMS}
                onSelect={onSelect}
                onOpenChange={onOpenChange}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        expect(document.activeElement).toBe(byTestId(ids.content));
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(items()[0]!.hasAttribute("data-pf-hover")).toBe(true);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(items()[1]!.hasAttribute("data-pf-hover")).toBe(true);
        await userEvent.keyboard("{Enter}");
        await frames();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "copy" });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(byTestId(ids.trigger));
    });

    it("takes slot-keyed classes, test ids, and the menu's variants", async () => {
        withRegistry(() => (
            <Menu
                trigger="Edit"
                items={ITEMS}
                color="secondary"
                testId="edit"
                class={{ content: "wide", item: "row" }}
            />
        ));
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
        withRegistry(() => (
            <Menu contextTrigger="Right-click here" items={ITEMS} />
        ));
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
        area.dispatchEvent(event);
        await frames();
        expect(event.defaultPrevented).toBe(true);
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await userEvent.keyboard("{Escape}");
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
        const key = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "F10",
            shiftKey: true,
        });
        area.dispatchEvent(key);
        await frames();
        expect(key.defaultPrevented).toBe(true);
        expect(byTestId(ids.positioner).hidden).toBe(false);
    });

    it("composes, beside a trigger", async () => {
        withRegistry(() => (
            <Menu.Root>
                <Menu.Trigger>Edit</Menu.Trigger>
                <Menu.ContextTrigger>Area</Menu.ContextTrigger>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Items items={[ITEMS[1]!]} />
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>
        ));
        await settle();
        expect(byTestId(ids.trigger).textContent).toBe("Edit");
        expect(byTestId(ids.contextTrigger).textContent).toBe("Area");
    });
});

describe("Menu, groups and toggleable items", () => {
    it("renders groups after the items, each a group named by its label, and sets grouped", async () => {
        withRegistry(() => (
            <Menu
                trigger="Edit"
                items={[{ value: "undo", label: "Undo" }]}
                groups={[
                    {
                        id: "clipboard",
                        label: "Clipboard",
                        items: [
                            {
                                value: "cut",
                                label: "Cut",
                                supportingText: "To the clipboard",
                            },
                        ],
                    },
                    { id: "more", items: [{ value: "share", label: "Share" }] },
                ]}
            />
        ));
        await settle();
        expect(byTestId(ids.content).className).toBe("menu menu--grouped-true");
        const groups = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.itemGroup}"]`,
        );
        expect(groups).toHaveLength(2);
        expect(groups[0]!.className).toBe("menu__itemGroup");
        expect(groups[0]!.getAttribute("role")).toBe("group");
        const label = byTestId(ids.itemGroupLabel);
        expect(label.textContent).toBe("Clipboard");
        expect(groups[0]!.getAttribute("aria-labelledby")).toBe(label.id);
        expect(
            document.querySelectorAll(`[data-testid="${ids.itemGroupLabel}"]`),
        ).toHaveLength(1);
        expect(items().map((item) => item.textContent)).toEqual([
            "Undo",
            "CutTo the clipboard",
            "Share",
        ]);
        expect(items()[0]!.parentElement).toBe(byTestId(ids.content));
        const supporting = byTestId(ids.itemSupportingText);
        expect(supporting.textContent).toBe("To the clipboard");
        expect(supporting.parentElement!.getAttribute("data-testid")).toBe(
            ids.itemContent,
        );
        expect(
            document.querySelectorAll(`[data-testid="${ids.itemContent}"]`),
        ).toHaveLength(3);
    });

    it("takes vibrant, and grouped over its groups", async () => {
        withRegistry(() => (
            <Menu
                items={ITEMS}
                groups={[{ id: "g", items: [{ value: "a", label: "A" }] }]}
                vibrant
                grouped={false}
            />
        ));
        await settle();
        expect(byTestId(ids.content).className).toBe(
            "menu menu--vibrant-true menu--grouped-false",
        );
    });

    it("toggles a checkbox item, reporting the change", async () => {
        const onCheckedChange = vi.fn<(checked: boolean) => void>();
        const [checked, setChecked] = createSignal(false);
        withRegistry(() => (
            <Menu
                trigger="View"
                closeOnSelect={false}
                items={[
                    {
                        value: "ruler",
                        label: "Ruler",
                        type: "checkbox",
                        checked: checked(),
                        onCheckedChange: (next: boolean) => {
                            onCheckedChange(next);
                            setChecked(next);
                        },
                    },
                ]}
            />
        ));
        await settle();
        const item = () => items()[0]!;
        expect(item().getAttribute("role")).toBe("menuitemcheckbox");
        expect(item().getAttribute("aria-checked")).toBe("false");
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        await userEvent.click(item());
        await settle();
        expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
        expect(item().getAttribute("aria-checked")).toBe("true");
    });
});

describe("Menu, compound", () => {
    it("composes its parts, with any component as the trigger", async () => {
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof Menu.Root>["onSelect"]>>();
        withRegistry(() => (
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
            </Menu.Root>
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        expect(trigger.className).toBe("button button--variant-text");
        expect(byTestId(ids.itemTrailing).hasAttribute("data-pf-mirror")).toBe(
            true,
        );
        await userEvent.click(trigger);
        await frames();
        await userEvent.click(byTestId(ids.item));
        await settle();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "share" });
    });

    it("marks its groups' first and last itself, from where they are", async () => {
        withRegistry(() => (
            <Menu.Root defaultOpen>
                <Menu.Trigger>More</Menu.Trigger>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Item value="loose">
                            <Menu.ItemLabel>Loose</Menu.ItemLabel>
                        </Menu.Item>
                        <For each={["a", "b", "c"]}>
                            {(id) => (
                                <Menu.ItemGroup id={id}>
                                    <Menu.Item value={id}>
                                        <Menu.ItemLabel>{id}</Menu.ItemLabel>
                                    </Menu.Item>
                                </Menu.ItemGroup>
                            )}
                        </For>
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>
        ));
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
        withRegistry(() => (
            <Menu.Root defaultOpen>
                <Menu.Trigger>More</Menu.Trigger>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.ItemGroup id="a" first={false}>
                            <Menu.Item value="a">
                                <Menu.ItemLabel>a</Menu.ItemLabel>
                            </Menu.Item>
                        </Menu.ItemGroup>
                        <Menu.ItemGroup id="b" first last>
                            <Menu.Item value="b">
                                <Menu.ItemLabel>b</Menu.ItemLabel>
                            </Menu.Item>
                        </Menu.ItemGroup>
                        <Menu.ItemGroup id="c">
                            <Menu.Item value="c">
                                <Menu.ItemLabel>c</Menu.ItemLabel>
                            </Menu.Item>
                        </Menu.ItemGroup>
                    </Menu.Content>
                </Menu.Positioner>
            </Menu.Root>
        ));
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
        mount(() => (
            <Errored
                fallback={(error) => (
                    <p data-testid="error">{String(error())}</p>
                )}
            >
                <Menu.Content />
            </Errored>
        ));
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

    it("takes a function of each row in an item's keys, at every level", async () => {
        withRegistry(() => (
            <Menu
                trigger="Edit"
                submenu="cascade"
                items={NESTED}
                class={{
                    item: ({ item, depth }) => `row-${depth}-${item.value}`,
                    content: "surface",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    itemLabel: ({ index }) => ({ opacity: index ? 0.5 : 1 }),
                }}
                slotProps={{ item: ({ index }) => ({ title: `row ${index}` }) }}
                unstyled={{ item: ({ item }) => item.value === "cut" }}
            />
        ));
        await settle();
        const rows = items();
        expect(rows[0]!.className).toBe("row-0-cut");
        expect(rows[1]!.classList.contains("row-0-share")).toBe(true);
        expect(rows[1]!.classList.contains("menu__item")).toBe(true);
        expect(rows[2]!.classList.contains("row-1-mail")).toBe(true);
        expect(rows[3]!.title).toBe("row 1");
        const labels = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.itemLabel}"]`,
        );
        expect(labels[1]!.style.opacity).toBe("0.5");
        expect(contents()[1]!.classList.contains("surface")).toBe(true);
    });

    it("gives a submenu the menu's test ids and unstyled", async () => {
        withRegistry(() => (
            <Menu
                trigger="Edit"
                submenu="cascade"
                items={NESTED}
                testId="edit"
                unstyled
            />
        ));
        await settle();
        const submenus = document.querySelectorAll<HTMLElement>(
            '[data-testid="edit-content"]',
        );
        expect(submenus).toHaveLength(2);
        expect(submenus[1]!.className).toBe("");
    });

    it("draws an item with items as the submenu's trigger, an arrow at its end", async () => {
        withRegistry(() => (
            <Menu trigger="Edit" submenu="cascade" items={NESTED} />
        ));
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

    it("opens the submenu with the arrow toward the end, and reports its items' choice", async () => {
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof Menu>["onSelect"]>>();
        withRegistry(() => (
            <Menu
                trigger="Edit"
                submenu="cascade"
                items={NESTED}
                onSelect={onSelect}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        await settle();
        const share = items()[1]!;
        expect(share.hasAttribute("data-pf-hover")).toBe(true);
        await userEvent.keyboard("{ArrowRight}");
        await frames();
        expect(share.getAttribute("aria-expanded")).toBe("true");
        const positioners = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.positioner}"]`,
        );
        expect(positioners[1]!.hidden).toBe(false);
        expect(document.activeElement).toBe(contents()[1]);
        // The item that opened it stays hovered while it's open.
        expect(share.hasAttribute("data-pf-hover")).toBe(true);
        // Opened from the keyboard, it highlights its first item.
        expect(items()[2]!.hasAttribute("data-pf-hover")).toBe(true);
        await userEvent.keyboard("{Enter}");
        await frames();
        expect(onSelect).toHaveBeenCalledWith({ value: "mail" });
    });

    it("closes the submenu with the arrow toward the start, back on its item", async () => {
        withRegistry(() => (
            <Menu trigger="Edit" submenu="cascade" items={NESTED} />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
        await frames();
        await userEvent.keyboard("{ArrowLeft}");
        await frames(6);
        expect(items()[1]!.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(contents()[0]);
    });

    const labels = () =>
        items().map(
            (item) =>
                item.querySelector(`[data-testid="${ids.itemLabel}"]`)
                    ?.textContent,
        );

    it("drills into a submenu in the menu's place, under a row that goes back", async () => {
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof Menu>["onSelect"]>>();
        withRegistry(() => (
            <Menu
                trigger="Edit"
                submenu="drill"
                items={NESTED}
                onSelect={onSelect}
            />
        ));
        await settle();
        // One surface: the submenu's item is a row of the menu, its arrow at its end.
        expect(contents()).toHaveLength(1);
        expect(items()[1]!.getAttribute("aria-haspopup")).toBe("menu");
        expect(
            items()[1]!.querySelector(
                `[data-testid="${ids.itemTrailing}"] svg`,
            ),
        ).not.toBeNull();
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        await userEvent.click(items()[1]!);
        await frames();
        expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
        expect(onSelect).not.toHaveBeenCalled();
        expect(byTestId(ids.trigger).getAttribute("aria-expanded")).toBe(
            "true",
        );
        // The back row is highlighted, so the keys go on from it.
        expect(items()[0]!.hasAttribute("data-pf-hover")).toBe(true);
        await userEvent.keyboard("{Enter}");
        await frames();
        expect(labels()).toEqual(["Cut", "Share"]);
        await userEvent.click(items()[1]!);
        await frames();
        await userEvent.click(items()[1]!);
        await frames(6);
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "mail" });
        // Choosing closes the menu; it opens again at the top.
        expect(byTestId(ids.trigger).getAttribute("aria-expanded")).toBe(
            "false",
        );
        expect(labels()).toEqual(["Cut", "Share"]);
    });

    it("animates a drill step: the content's size, and the pressed label into the header and back", async () => {
        withRegistry(() => (
            <Menu trigger="Edit" submenu="drill" items={NESTED} />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await frames();
        const content = () => contents()[0]!;
        const moving = () =>
            content()
                .getAnimations({ subtree: true })
                .map(
                    (animation) =>
                        (
                            (animation.effect as KeyframeEffect)
                                .target as HTMLElement
                        ).dataset["pfPart"],
                );
        await userEvent.click(items()[1]!);
        expect(moving()).toContain("content");
        // The header's label, which the pressed item's moves into.
        const header = items()[0]!.querySelector(
            `[data-testid="${ids.itemLabel}"]`,
        )!;
        expect(header.getAnimations()).toHaveLength(1);
        await frames(30);
        await userEvent.click(items()[0]!);
        const share = items()[1]!.querySelector(
            `[data-testid="${ids.itemLabel}"]`,
        )!;
        expect(share.getAnimations()).toHaveLength(1);
    });

    // The submenu as it opens: its content shown, or drilled into (the rows read the submenu's).
    const openShare = async (view: () => unknown) => {
        await userEvent.keyboard("{Escape}{Escape}");
        await frames();
        document.body.innerHTML = "";
        withRegistry(view);
        await userEvent.click(byTestId(ids.trigger));
        await frames(4);
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        await settle();
        await userEvent.keyboard("{ArrowRight}");
        await frames(4);
    };
    const cascaded = () =>
        contents().length === 2 &&
        !contents()[1]!.hidden &&
        contents()[1]!.style.visibility !== "hidden";

    it("cascades by default when a submenu fits beside the open menu, and drills as it opens when its container is narrow", async () => {
        try {
            await page.viewport(1000, 800);
            await openShare(() => <Menu trigger="Edit" items={NESTED} />);
            expect(cascaded()).toBe(true);
            // A wide window, but the menu sits in a narrow panel that clips it: the press drills.
            await openShare(() => (
                <div
                    style={{
                        width: "70px",
                        height: "300px",
                        overflow: "hidden",
                    }}
                >
                    <Menu trigger="Edit" items={NESTED} />
                </div>
            ));
            expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
            expect(contents()).toHaveLength(1);
            // The keys go on in the menu.
            expect(document.activeElement).toBe(contents()[0]);
            // Back out, the item still drills: the submenu doesn't fit there.
            await userEvent.click(items()[0]!);
            await frames();
            expect(labels()).toEqual(["Cut", "Share"]);
            expect(contents()).toHaveLength(1);
            // The pointer resting on it doesn't drill, nor show a submenu that doesn't fit; a
            // click then does.
            await userEvent.keyboard("{Escape}");
            document.body.innerHTML = "";
            withRegistry(() => (
                <div
                    style={{
                        width: "70px",
                        height: "300px",
                        overflow: "hidden",
                    }}
                >
                    <Menu trigger="Edit" items={NESTED} />
                </div>
            ));
            await userEvent.click(byTestId(ids.trigger));
            await frames(4);
            await userEvent.hover(items()[1]!);
            await frames(10);
            expect(labels().slice(0, 2)).toEqual(["Cut", "Share"]);
            expect(cascaded()).toBe(false);
            await userEvent.hover(items()[0]!);
            await userEvent.click(items()[1]!);
            await frames(4);
            expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
        } finally {
            await page.viewport(414, 896);
        }
    });

    it("drills the open submenu when the room goes, keeping it and the keys, and cascades back with room to spare", async () => {
        await openShare(() => (
            <div
                id="panel"
                style={{ width: "600px", height: "300px", overflow: "hidden" }}
            >
                <Menu trigger="Edit" items={NESTED} />
            </div>
        ));
        const panel = document.getElementById("panel")!;
        expect(cascaded()).toBe(true);
        panel.style.width = "70px";
        await until(() => expect(contents()).toHaveLength(1));
        expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
        expect(document.activeElement).toBe(contents()[0]);
        panel.style.width = "600px";
        await until(() => expect(contents()).toHaveLength(2));
        expect(cascaded()).toBe(true);
        expect(contents()[1]!.textContent).toContain("Mail");
    });

    it("measures the submenu's own width and height as it opens", async () => {
        const wide = [
            NESTED[0]!,
            {
                value: "share",
                label: "Share",
                items: [
                    {
                        value: "mail",
                        label: "Mail it to everyone on the list, with a long note attached at the end",
                    },
                ],
            },
        ];
        const tall = [
            NESTED[0]!,
            {
                value: "share",
                label: "Share",
                items: Array.from({ length: 24 }, (_, i) => ({
                    value: `to-${i}`,
                    label: `To ${i}`,
                })),
            },
        ];
        try {
            await page.viewport(1000, 800);
            const panel = (items_: typeof NESTED, style: object) => (
                <div style={{ overflow: "hidden", ...style }}>
                    <Menu trigger="Edit" items={items_} />
                </div>
            );
            // A 400 px panel has room for a submenu as wide as the menu, not for a wider one.
            await openShare(() => panel(NESTED, { width: "400px" }));
            expect(cascaded()).toBe(true);
            await openShare(() => panel(wide, { width: "400px" }));
            expect(labels()[0]).toBe("Share");
            expect(contents()).toHaveLength(1);
            // A short panel has no room for a tall submenu, down or up.
            await openShare(() => panel(tall, { height: "160px" }));
            expect(labels()[0]).toBe("Share");
            expect(labels()).toHaveLength(25);
        } finally {
            await page.viewport(414, 896);
        }
    });

    it("keeps within the nearest container, or the one `container` names", async () => {
        try {
            await page.viewport(1000, 800);
            const nested = (container?: string) => (
                <div
                    style={{
                        "container-type": "inline-size",
                        "container-name": "page",
                        width: "900px",
                    }}
                >
                    <div
                        style={{
                            "container-type": "inline-size",
                            width: "90px",
                        }}
                    >
                        <Menu
                            trigger="Edit"
                            items={NESTED}
                            {...(container ? { container } : {})}
                        />
                    </div>
                </div>
            );
            await openShare(() => nested());
            expect(labels()).toEqual(["Share", "Mail", "Copy link"]);
            await openShare(() => nested("page"));
            expect(cascaded()).toBe(true);
        } finally {
            await page.viewport(414, 896);
        }
    });
});
