import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";

import { FabMenu } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount, until } from "../testing/render";

const ids = testIds.fabMenu;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["fabMenu", "ripple"]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width: 600, height: 400, padding: 160 }}>
                {node}
            </View>
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("FabMenu on React Native", () => {
    it("takes a function of each item in its parts' style and slotProps", async () => {
        await render(
            <FabMenu
                icon="+"
                fabLabel="Create"
                defaultOpen
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                style={{
                    itemLabel: ({ index }) =>
                        index ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    item: ({ item }) => ({ accessibilityHint: item.value }),
                }}
            />,
        );
        await until(() => expect(all(ids.itemLabel)).toHaveLength(2));
        expect(
            all(ids.itemLabel).map((each) => getComputedStyle(each).opacity),
        ).toEqual(["1", "0.5"]);
    });
});
