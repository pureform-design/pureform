import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { List } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/mount";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={navigationRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("List, ready-made", () => {
    it("takes a function of each item in the item's keys", async () => {
        withRegistry(() => (
            <List
                items={[
                    { headline: "Inbox", value: "inbox" },
                    { headline: "Sent", value: "sent" },
                ]}
                class={{
                    item: ({ item }) => `row-${item.value}`,
                    root: "rows",
                }}
                // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                style={{ item: ({ index }) => ({ opacity: index ? 0.5 : 1 }) }}
                slotProps={{ item: ({ index }) => ({ title: `row ${index}` }) }}
                unstyled={{ item: ({ index }) => index === 0 }}
            />
        ));
        await settle();
        const rows = all(testIds.list.item);
        expect(rows[0]!.className).toBe("row-inbox");
        expect(rows[1]!.classList.contains("row-sent")).toBe(true);
        expect(rows[1]!.style.opacity).toBe("0.5");
        expect(rows[1]!.title).toBe("row 1");
        expect(all(testIds.list.root)[0]!.classList.contains("rows")).toBe(
            true,
        );
    });
});
