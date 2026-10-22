import { compositeTestIds } from "@pureform/anatomy";
import { createSignal, Errored, For } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Menu } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { byTestId, mount, settle } from "../testing/mount";

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
        const onSelect = vi.fn();
        const onOpenChange = vi.fn();
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
        const onCheckedChange = vi.fn();
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
        const onSelect = vi.fn();
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

    it("draws an item with items as the submenu's trigger, an arrow at its end", async () => {
        withRegistry(() => <Menu trigger="Edit" items={NESTED} />);
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
        const onSelect = vi.fn();
        withRegistry(() => (
            <Menu trigger="Edit" items={NESTED} onSelect={onSelect} />
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
        withRegistry(() => <Menu trigger="Edit" items={NESTED} />);
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
});
