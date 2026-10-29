import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { FabMenu } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/mount";

const ids = testIds.fabMenu;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("FabMenu, composed", () => {
    it("takes an explicit item count without passing it to the element", async () => {
        withRegistry(() => (
            <FabMenu.Root itemCount={2} defaultOpen>
                <FabMenu.CloseTrigger aria-label="Create">
                    +
                </FabMenu.CloseTrigger>
                <FabMenu.List>
                    <FabMenu.Item value="message">
                        <FabMenu.ItemLabel>Message</FabMenu.ItemLabel>
                    </FabMenu.Item>
                    <FabMenu.Item value="call">
                        <FabMenu.ItemLabel>Call</FabMenu.ItemLabel>
                    </FabMenu.Item>
                </FabMenu.List>
            </FabMenu.Root>
        ));
        await settle();
        expect(all(ids.root)[0]!.hasAttribute("itemcount")).toBe(false);
        expect(all(ids.item)).toHaveLength(2);
    });
});

describe("FabMenu, ready-made", () => {
    it("takes a function of each item in its parts' keys", async () => {
        withRegistry(() => (
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                class={{
                    item: ({ item }) => `item-${item.value}`,
                    list: "actions",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    itemIcon: ({ index }) => ({ opacity: index ? 0.5 : 1 }),
                }}
                slotProps={{
                    itemLabel: ({ index }) => ({ title: `label ${index}` }),
                }}
                unstyled={{ item: ({ index }) => index === 0 }}
            />
        ));
        await settle();
        const items = all(ids.item);
        expect(items[0]!.className).toBe("item-message");
        expect(items[1]!.classList.contains("item-call")).toBe(true);
        expect(items[1]!.className).not.toBe("item-call");
        expect(all(ids.itemIcon)[1]!.style.opacity).toBe("0.5");
        expect(all(ids.itemLabel)[1]!.title).toBe("label 1");
        expect(all(ids.list)[0]!.classList.contains("actions")).toBe(true);
    });
});
