import { compositeTestIds, testIds } from "@pureform/anatomy";
import type { ComponentProps } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SplitButton } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { FabMenu } from "../fab-menu";
import { byTestId, mount, settle } from "../testing/mount";

const split = testIds.splitButton;
const fab = testIds.fabMenu;
const menuIds = compositeTestIds.menu;

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

const ITEMS = [
    { value: "draft", label: "Save as draft" },
    { value: "template", label: "Save as template" },
];

describe("SplitButton, ready-made", () => {
    it("renders the two buttons and the menu's items, closed", async () => {
        withRegistry(() => (
            <SplitButton label="Save" items={ITEMS} variant="tonal" />
        ));
        await settle();
        const root = byTestId(split.root);
        expect(root.className).toContain("split-button");
        expect(root.className).toContain("split-button--variant-tonal");
        const leading = byTestId<HTMLButtonElement>(split.leadingButton);
        expect(leading.tagName).toBe("BUTTON");
        expect(leading.className).toBe("split-button__leadingButton");
        expect(leading.textContent).toBe("Save");
        const trailing = byTestId<HTMLButtonElement>(split.trailingButton);
        expect(trailing.getAttribute("data-scope")).toBe("split-button");
        expect(trailing.getAttribute("data-pf-part")).toBe("trailing-button");
        expect(trailing.getAttribute("aria-haspopup")).toBe("menu");
        expect(trailing.getAttribute("aria-expanded")).toBe("false");
        expect(trailing.getAttribute("aria-label")).toBe("More options");
        expect(byTestId(split.trailingIcon).getAttribute("aria-hidden")).toBe(
            "true",
        );
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
        expect(
            document.querySelectorAll(`[data-testid="${menuIds.item}"]`),
        ).toHaveLength(2);
    });

    it("runs the action from the leading button and opens the menu from the trailing one", async () => {
        const onAction = vi.fn<() => void>();
        const onSelect =
            vi.fn<
                NonNullable<ComponentProps<typeof SplitButton>["onSelect"]>
            >();
        withRegistry(() => (
            <SplitButton
                label="Save"
                items={ITEMS}
                onAction={onAction}
                onSelect={onSelect}
            />
        ));
        await settle();
        await userEvent.click(byTestId(split.leadingButton));
        expect(onAction).toHaveBeenCalledOnce();
        expect(byTestId(menuIds.positioner).hidden).toBe(true);
        const trailing = byTestId(split.trailingButton);
        await userEvent.click(trailing);
        await frames();
        expect(trailing.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menuIds.positioner).hidden).toBe(false);
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await frames();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "draft" });
        expect(trailing.getAttribute("aria-expanded")).toBe("false");
    });

    it("disables both buttons", async () => {
        withRegistry(() => <SplitButton label="Save" items={ITEMS} disabled />);
        await settle();
        expect(byTestId<HTMLButtonElement>(split.leadingButton).disabled).toBe(
            true,
        );
        expect(byTestId<HTMLButtonElement>(split.trailingButton).disabled).toBe(
            true,
        );
    });
});

describe("FabMenu, ready-made", () => {
    const FAB_ITEMS = [
        { value: "message", label: "Message", icon: "✉" },
        { value: "call", label: "Call", icon: "☎" },
    ];

    it("renders the FAB and the items above it, closed", async () => {
        withRegistry(() => (
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={FAB_ITEMS}
                color="tertiary"
            />
        ));
        await settle();
        const root = byTestId(fab.root);
        expect(root.className).toContain("fab-menu--color-tertiary");
        const trigger = byTestId<HTMLButtonElement>(fab.closeTrigger);
        expect(trigger.tagName).toBe("BUTTON");
        expect(trigger.className).toBe("fab-menu__closeTrigger");
        expect(trigger.getAttribute("aria-label")).toBe("Create");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(trigger.textContent).toBe("+");
        expect(byTestId(fab.list).hidden).toBe(true);
        expect(byTestId(fab.list).className).toBe("fab-menu__list");
        expect(byTestId(fab.list).getAttribute("role")).toBe("menu");
        const items = document.querySelectorAll(`[data-testid="${fab.item}"]`);
        expect(items).toHaveLength(2);
        // The list's exit holds for exactly its items: Root's itemCount token.
        expect(root.style.getPropertyValue("--pf-fab-menu-item-count")).toBe(
            "2",
        );
        expect(
            document
                .querySelector(`[data-testid="${fab.itemIcon}"]`)
                ?.getAttribute("aria-hidden"),
        ).toBe("true");
    });

    it("opens, turns the FAB into the close button, and reports the chosen item", async () => {
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof FabMenu>["onSelect"]>>();
        withRegistry(() => (
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={FAB_ITEMS}
                onSelect={onSelect}
            />
        ));
        await settle();
        const trigger = byTestId(fab.closeTrigger);
        await userEvent.click(trigger);
        await frames();
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(trigger.querySelector("svg")).not.toBeNull();
        expect(byTestId(fab.list).hidden).toBe(false);
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
        await frames();
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "call" });
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(trigger.textContent).toBe("+");
    });
});
