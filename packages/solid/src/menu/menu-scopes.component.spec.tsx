// A field's list drawn as a menu takes a function of each option in its `menuProps`' keys.

import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { PureformProvider } from "..";
import { overlaysRegistry, textInputsRegistry } from "../__fixtures__/registry";
import { Autocomplete } from "../autocomplete";
import { SearchView } from "../search-view";
import { Select } from "../select";
import { mount, settle } from "../testing/mount";

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const ITEMS = [
    { value: "a", label: "Alpha", group: "First" },
    { value: "b", label: "Beta" },
];

describe("menu scopes, by option", () => {
    it("Select", async () => {
        mount(() => (
            <PureformProvider registry={textInputsRegistry()}>
                <Select
                    label="Size"
                    items={ITEMS}
                    defaultOpen
                    menuProps={{
                        class: {
                            item: ({ item, index }) =>
                                `row-${index}-${item.value}`,
                            root: "list",
                        },
                        style: {
                            itemLabel: ({ index }) => ({
                                opacity: index ? 0.5 : 1,
                            }),
                        },
                        slotProps: {
                            item: ({ item }) => ({ title: item.label }),
                        },
                        unstyled: { item: ({ index }) => index === 0 },
                    }}
                />
            </PureformProvider>
        ));
        await settle();
        const ids = compositeTestIds.selectMenu;
        const rows = all(ids.item);
        expect(rows.map((row) => row.title)).toEqual(["Alpha", "Beta"]);
        expect(rows[0]!.className).toBe("row-0-a");
        expect(rows[1]!.classList.contains("row-1-b")).toBe(true);
        expect(rows[1]!.className).not.toBe("row-1-b");
        expect(all(ids.itemLabel)[1]!.style.opacity).toBe("0.5");
    });

    it("Autocomplete", async () => {
        mount(() => (
            <PureformProvider registry={textInputsRegistry()}>
                <Autocomplete
                    label="City"
                    items={ITEMS}
                    menuProps={{
                        class: { item: ({ index }) => `row-${index}` },
                        slotProps: {
                            itemLabel: ({ item }) => ({ title: item.value }),
                        },
                    }}
                />
            </PureformProvider>
        ));
        await settle();
        const ids = compositeTestIds.autocompleteMenu;
        expect(
            all(ids.item).map((row) => row.classList.contains("row-1")),
        ).toEqual([false, true]);
        expect(all(ids.itemLabel).map((label) => label.title)).toEqual([
            "a",
            "b",
        ]);
    });

    it("SearchView", async () => {
        mount(() => (
            <PureformProvider registry={overlaysRegistry()}>
                <SearchView
                    placeholder="Search"
                    items={[
                        {
                            value: "inbox",
                            label: "Inbox",
                            supportingText: "Mail",
                        },
                        { value: "drafts", label: "Drafts" },
                    ]}
                    menuProps={{
                        class: { item: ({ item }) => `row-${item.value}` },
                        style: {
                            itemSupportingText: ({ index }) => ({
                                opacity: index ? 1 : 0.5,
                            }),
                        },
                    }}
                />
            </PureformProvider>
        ));
        await settle();
        const ids = compositeTestIds.searchViewMenu;
        expect(all(ids.item)[1]!.classList.contains("row-drafts")).toBe(true);
        expect(all(ids.itemSupportingText)[0]!.style.opacity).toBe("0.5");
    });
});
