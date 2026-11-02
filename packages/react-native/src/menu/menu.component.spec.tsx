import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Menu } from ".";
import { PureformProvider } from "..";
import { Dialog } from "../dialog";
import { Popover } from "../popover";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount, settle, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "menu",
        "button",
        "popover",
        "dialog",
        "scrim",
        "ripple",
    ]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width: 600, height: 400, padding: 40 }}>{node}</View>
        </PureformProvider>,
    );

const items = () => [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
];

describe("Menu's parts on React Native", () => {
    it("takes a function of each row in an item's style and slotProps", async () => {
        await render(
            <Menu
                trigger="Edit"
                defaultOpen
                items={[
                    { value: "cut", label: "Cut" },
                    { value: "copy", label: "Copy" },
                ]}
                style={{
                    item: ({ index, depth }) =>
                        index === 1 && depth === 0
                            ? { opacity: 0.5 }
                            : undefined,
                }}
                slotProps={{
                    itemLabel: ({ item }) => ({
                        accessibilityHint: item.value,
                    }),
                }}
            />,
        );
        await until(() => expect(items()).toHaveLength(2));
        expect(items().map((item) => getComputedStyle(item).opacity)).toEqual([
            "1",
            "0.5",
        ]);
    });

    it("reaches the trigger drawn as a button and the context trigger by their keys", async () => {
        await render(
            <Menu
                trigger="Edit"
                contextTrigger={<Text>Hold</Text>}
                items={[{ value: "cut", label: "Cut" }]}
                testId={{ trigger: "edit", contextTrigger: "area" }}
                style={{
                    trigger: { opacity: 0.5 },
                    contextTrigger: { opacity: 0.25 },
                }}
                slotProps={{
                    trigger: { accessibilityHint: "Opens the menu" },
                }}
            />,
        );
        const trigger = byTestId("edit");
        expect(trigger.getAttribute("role")).toBe("button");
        expect(getComputedStyle(trigger).opacity).toBe("0.5");
        expect(getComputedStyle(byTestId("area")).opacity).toBe("0.25");
        await interact(() => userEvent.click(trigger));
        await settle(300);
        expect(items()).toHaveLength(1);
    });

    it("reaches a dialog's and a popover's trigger by its key, and prefixes its test id", async () => {
        await render(
            <>
                <Dialog
                    trigger="Open"
                    headline="Hi"
                    testId="note"
                    style={{ trigger: { opacity: 0.5 } }}
                />
                <Popover
                    trigger="More"
                    testId={{ trigger: "more" }}
                    style={{ trigger: { opacity: 0.25 } }}
                    body={<Text>Body</Text>}
                />
            </>,
        );
        expect(getComputedStyle(byTestId("note-trigger")).opacity).toBe("0.5");
        expect(getComputedStyle(byTestId("more")).opacity).toBe("0.25");
    });
});
