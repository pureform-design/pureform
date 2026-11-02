import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SelectionList } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={navigationRegistry()}>
            {view}
        </PureformProvider>,
    );

const ITEMS = [
    { value: "inbox", headline: "Inbox" },
    { value: "starred", headline: "Starred", supportingText: "12" },
    { value: "sent", headline: "Sent", disabled: true },
];

const options = () =>
    [
        ...document.querySelectorAll(
            `[data-testid="${testIds.listItem.root}"]`,
        ),
    ] as HTMLElement[];

describe("SelectionList", () => {
    it("takes a function of each option in the item's keys", async () => {
        withRegistry(
            <SelectionList
                aria-label="Folders"
                items={ITEMS}
                className={{ item: ({ item }) => `row-${item.value}` }}
                style={{ item: ({ index }) => ({ opacity: index ? 0.5 : 1 }) }}
                slotProps={{ item: ({ index }) => ({ title: `row ${index}` }) }}
                unstyled={{ item: ({ index }) => index === 0 }}
            />,
        );
        await settle();
        const rows = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${testIds.list.item}"]`,
            ),
        ];
        expect(rows[0]!.className).toBe("row-inbox");
        expect(rows[1]!.classList.contains("row-starred")).toBe(true);
        expect(rows[2]!.style.opacity).toBe("0.5");
        expect(rows[2]!.title).toBe("row 2");
    });

    it("renders a listbox of list items as options, marked with aria-selected", async () => {
        withRegistry(
            <SelectionList
                aria-label="Folders"
                density="-1"
                defaultValue={["starred"]}
                items={ITEMS}
            />,
        );
        await settle();
        const root = byTestId(testIds.list.root);
        expect(root.tagName).toBe("UL");
        expect(root.getAttribute("role")).toBe("listbox");
        expect(root.getAttribute("aria-label")).toBe("Folders");
        expect(root.tabIndex).toBe(0);
        const [inbox, starred, sent] = options();
        expect(inbox?.parentElement?.getAttribute("role")).toBe("presentation");
        expect(inbox?.getAttribute("role")).toBe("option");
        expect(inbox?.getAttribute("aria-selected")).toBe("false");
        expect(starred?.getAttribute("aria-selected")).toBe("true");
        expect(sent?.getAttribute("aria-disabled")).toBe("true");
        expect(inbox?.className).toContain("list-item--interactive-true");
        expect(inbox?.className).toContain("list-item--density--1");
    });

    it("selects several with clicks, and reports each change", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        withRegistry(
            <SelectionList
                selectionMode="multiple"
                items={ITEMS}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        expect(
            byTestId(testIds.list.root).getAttribute("aria-multiselectable"),
        ).toBe("true");
        const [inbox, starred, sent] = options();
        await userEvent.click(inbox!);
        await userEvent.click(starred!);
        await userEvent.click(sent!, { force: true });
        await settle();
        expect(options().map((o) => o.getAttribute("aria-selected"))).toEqual([
            "true",
            "true",
            "false",
        ]);
        expect(onValueChange.mock.calls.at(-1)?.[0]).toMatchObject({
            value: ["inbox", "starred"],
        });
    });

    it("selects one at a time by default, with the keyboard", async () => {
        withRegistry(<SelectionList items={ITEMS} />);
        await settle();
        byTestId(testIds.list.root).focus();
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await settle();
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await settle();
        expect(options().map((o) => o.getAttribute("aria-selected"))).toEqual([
            "false",
            "true",
            "false",
        ]);
        expect(
            byTestId(testIds.list.root).hasAttribute("aria-multiselectable"),
        ).toBe(false);
    });
});
