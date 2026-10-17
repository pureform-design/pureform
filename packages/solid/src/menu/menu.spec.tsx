import { compositeTestIds } from "@pureform/anatomy";
import { Errored } from "solid-js";
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

const items = () =>
    document.querySelectorAll<HTMLElement>(`[data-testid="${ids.item}"]`);

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
