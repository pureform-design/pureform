import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider, useLayer } from ".";
import { Menu } from "./menu";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, computed, mount } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["menu", "ripple"]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {node}
        </PureformProvider>,
    );

// A menu placed over the page by a wrapper, and a view after it that covers the same spot.
function Page(props: { readonly layered: boolean }): ReactNode {
    const menu = useLayer("menu");
    return (
        <View style={{ width: 200, height: 200 }}>
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    ...(props.layered ? { zIndex: menu } : {}),
                }}
            >
                <Menu items={[{ value: "cut", label: "Cut" }]} />
            </View>
            <View
                testID="cover"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 200,
                    height: 200,
                }}
            />
        </View>
    );
}

// What the page shows at the menu item's center.
const onTop = (): Element | null => {
    const box = byTestId("pf-menu-item").getBoundingClientRect();
    return document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
    );
};

describe("useLayer", () => {
    it("gives the theme's z-index for a layer, with the provider's overrides", async () => {
        const layers: (number | undefined)[] = [];
        function Probe(): ReactNode {
            layers.push(
                useLayer("menu"),
                useLayer("dialog"),
                useLayer("tooltip"),
                useLayer("nowhere"),
            );
            return null;
        }
        await render(
            <>
                <Probe />
                <PureformProvider overrides={{ "zIndices.dialog": 450 }}>
                    <Probe />
                </PureformProvider>
            </>,
        );
        expect(layers.slice(-8)).toEqual([
            200,
            400,
            600,
            undefined,
            200,
            450,
            600,
            undefined,
        ]);
    });

    it("lifts an overlay over the page from its wrapper, where the surface's own layer can't", async () => {
        await render(<Page layered={false} />);
        expect(computed("pf-menu-content").zIndex).toBe("200");
        expect(byTestId("cover").contains(onTop())).toBe(true);
        cleanup();
        await render(<Page layered />);
        expect(byTestId("pf-menu-content").contains(onTop())).toBe(true);
    });
});
