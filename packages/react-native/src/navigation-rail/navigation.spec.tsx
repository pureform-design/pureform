import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { NavigationRail } from ".";
import { PureformProvider } from "..";
import { NavigationBar } from "../navigation-bar";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, mount, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "navigationBar",
        "navigationRail",
        "scrim",
        "ripple",
    ]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {node}
        </PureformProvider>,
    );

const DESTINATIONS = [
    { value: "mail", label: "Mail" },
    { value: "chat", label: "Chat" },
];

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("NavigationBar and NavigationRail on React Native", () => {
    it("takes a function of each destination in its parts' style and slotProps", async () => {
        await render(
            <NavigationBar
                items={DESTINATIONS}
                defaultValue="chat"
                style={{
                    label: ({ selected }) =>
                        selected ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    item: ({ index }) => ({ accessibilityHint: `at ${index}` }),
                }}
            />,
        );
        expect(
            all(testIds.navigationBar.label).map(
                (each) => getComputedStyle(each).opacity,
            ),
        ).toEqual(["1", "0.5"]);
    });

    it("reaches a modal rail's scrim and dialog by their keys", async () => {
        await render(
            <NavigationRail
                items={DESTINATIONS}
                modal
                defaultOpen
                testId={{ scrim: "rail-scrim", dialog: "rail-dialog" }}
                style={{ scrim: { opacity: 0.25 }, dialog: { opacity: 0.75 } }}
            />,
        );
        await until(() => expect(byTestId("rail-dialog")).toBeTruthy());
        expect(byTestId("rail-dialog").getAttribute("role")).toBe("dialog");
        expect(getComputedStyle(byTestId("rail-dialog")).opacity).toBe("0.75");
        expect(getComputedStyle(byTestId("rail-scrim")).opacity).toBe("0.25");
    });
});
