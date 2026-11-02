import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";

import {
    Portal,
    PortalHost,
    PureformProvider,
    useDirection,
    useEngine,
    useTokens,
} from ".";
import { reanimated } from "./engines/reanimated";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, mount, outside } from "./testing/render";

let registry: TestRegistry;
let themed: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["menu"]);
    themed = await presetRegistry(["menu"], [], "themed");
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width: 600, height: 400 }}>{node}</View>
        </PureformProvider>,
    );

describe("Portal", () => {
    it("renders its children at the host, after the page, ordered by layer and then by when each opened", async () => {
        await render(
            <View testID="page">
                <Portal layer="tooltip">
                    <Text testID="tooltip">tooltip</Text>
                </Portal>
                <Portal layer="menu">
                    <Text testID="menu">menu</Text>
                    <Portal layer="base">
                        <Text testID="inside">inside the menu</Text>
                    </Portal>
                </Portal>
                <Portal layer="menu">
                    <Text testID="later">later menu</Text>
                </Portal>
            </View>,
        );
        expect(byTestId("page").textContent).toBe("");
        const order = [
            ...document.querySelectorAll(
                '[data-testid="menu"], [data-testid="inside"], [data-testid="later"], [data-testid="tooltip"]',
            ),
        ].map((element) => element.getAttribute("data-testid"));
        expect(order).toEqual(["menu", "inside", "later", "tooltip"]);
        const page = byTestId("page");
        expect(
            page.compareDocumentPosition(byTestId("menu")) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("keeps the provider it's declared under: nested themes, overrides, direction, and engine", async () => {
        const seen: unknown[] = [];
        function Probe(): ReactNode {
            const tokens = useTokens();
            seen.push([
                JSON.stringify(tokens),
                tokens["colors.primary"],
                useDirection(),
                useEngine().name,
            ]);
            return null;
        }
        await mount(
            <PureformProvider registry={themed}>
                <PureformProvider theme="sharp">
                    <PureformProvider
                        theme="teal"
                        dir="rtl"
                        engine={reanimated}
                        overrides={{ "colors.primary": "#123456" }}
                    >
                        <Probe />
                        <Portal>
                            <Probe />
                        </Portal>
                    </PureformProvider>
                </PureformProvider>
            </PureformProvider>,
        );
        expect(seen.length).toBeGreaterThanOrEqual(2);
        expect(seen.at(-1)).toEqual(seen[0]);
        expect((seen[0] as unknown[])[1]).toBe("#123456");
        expect((seen[0] as unknown[])[2]).toBe("rtl");
    });

    it("renders at a host the app places, as inside a Modal", async () => {
        await render(
            <>
                <View testID="outer">
                    <PortalHost>
                        <View testID="inner">
                            <Portal>
                                <Text testID="portaled">here</Text>
                            </Portal>
                        </View>
                    </PortalHost>
                </View>
            </>,
        );
        expect(byTestId("outer").contains(byTestId("portaled"))).toBe(true);
        expect(byTestId("inner").contains(byTestId("portaled"))).toBe(false);
    });

    it("leaves the host when it unmounts", async () => {
        const shown = outside(true);
        await render(
            <shown.Holder>
                {(value) =>
                    value ? (
                        <Portal>
                            <Text testID="gone">soon gone</Text>
                        </Portal>
                    ) : null
                }
            </shown.Holder>,
        );
        expect(byTestId("gone")).toBeTruthy();
        await shown.set(false);
        expect(document.querySelector('[data-testid="gone"]')).toBeNull();
    });
});
