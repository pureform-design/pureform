import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { List } from ".";
import { PureformProvider } from "..";
import { SelectionList } from "../selection-list";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["list", "listItem", "ripple"]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const rows = () => [
    ...document.querySelectorAll<HTMLElement>(
        `[data-testid="${testIds.list.item}"]`,
    ),
];

describe("List's and SelectionList's item by item on React Native", () => {
    it("takes a function of each list item in the item's style and slotProps", async () => {
        await render(
            <List
                items={[{ headline: "Inbox" }, { headline: "Sent" }]}
                style={{
                    item: ({ index }) => (index ? { opacity: 0.5 } : undefined),
                }}
                slotProps={{
                    item: ({ item }) => ({
                        accessibilityHint:
                            typeof item.headline === "string"
                                ? item.headline
                                : undefined,
                    }),
                }}
            />,
        );
        expect(rows().map((row) => getComputedStyle(row).opacity)).toEqual([
            "1",
            "0.5",
        ]);
    });

    it("takes a function of each option in the item's style", async () => {
        await render(
            <SelectionList
                aria-label="Folders"
                items={[
                    { value: "inbox", headline: "Inbox" },
                    { value: "sent", headline: "Sent" },
                ]}
                style={{
                    item: ({ item }) =>
                        item.value === "inbox" ? { opacity: 0.5 } : undefined,
                }}
            />,
        );
        expect(rows().map((row) => getComputedStyle(row).opacity)).toEqual([
            "0.5",
            "1",
        ]);
    });
});
