import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Toolbar } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount, settle, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "toolbar",
        "iconButton",
        "button",
        "menu",
        "ripple",
    ]);
});

const render = (node: ReactNode, width = 600) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width, height: 400, padding: 160 }}>{node}</View>
        </PureformProvider>,
    );

const box = (element: Element) => element.getBoundingClientRect();
const query = (id: string) =>
    document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`);

const ITEMS = ["a", "b", "c", "d", "e", "f", "g"].map((value) => ({
    value,
    label: value.toUpperCase(),
    icon: value.toUpperCase(),
    testId: `item-${value}`,
}));

const shown = () =>
    ITEMS.filter((item) => {
        const element = query(`${item.testId}-root`)[0];
        return element !== undefined && box(element).width > 0;
    }).map((item) => item.value);

describe("Toolbar", () => {
    it("draws a 64px pill with its elements 4px apart, a toolbar to assistive technology", async () => {
        await render(<Toolbar aria-label="Edit" items={ITEMS.slice(0, 3)} />);
        const root = byTestId(testIds.toolbar.root);
        expect(root.getAttribute("role")).toBe("toolbar");
        expect(root.getAttribute("aria-label")).toBe("Edit");
        expect(box(root).height).toBeCloseTo(64, 0);
        const [a, b] = [query("item-a-root")[0]!, query("item-b-root")[0]!];
        expect(box(b).left - box(a).right).toBeCloseTo(4, 0);
        expect(box(a).left - box(root).left).toBeCloseTo(8, 0);
        expect(getComputedStyle(root).borderTopLeftRadius).not.toBe("0px");
    });

    it("stands up when vertical", async () => {
        await render(
            <Toolbar orientation="vertical" items={ITEMS.slice(0, 3)} />,
        );
        const root = byTestId(testIds.toolbar.root);
        expect(root.getAttribute("aria-orientation")).toBe("vertical");
        expect(box(root).width).toBeCloseTo(64, 0);
        const [a, b] = [query("item-a-root")[0]!, query("item-b-root")[0]!];
        expect(box(b).top - box(a).bottom).toBeCloseTo(4, 0);
    });

    it("moves what doesn't fit into the overflow menu, and runs its click there", async () => {
        const clicked: string[] = [];
        await render(
            <Toolbar
                overflow
                testId="edit"
                items={ITEMS.map((item) => ({
                    ...item,
                    onClick: () => clicked.push(item.value),
                }))}
            />,
        );
        // 280px of room less 16px of padding: five 40px buttons 4px apart and the overflow
        // button.
        await until(() => expect(shown()).toEqual(["a", "b", "c", "d", "e"]));
        const trigger = byTestId("edit-overflow-root");
        expect(trigger.getAttribute("aria-label")).toBe("More options");
        await interact(() => userEvent.click(trigger));
        await settle(300);
        const items = [...query("pf-menu-item")];
        expect(items.map((item) => item.textContent)).toEqual(["FF", "GG"]);
        await interact(() => userEvent.click(items[1]!));
        expect(clicked).toEqual(["g"]);
    });

    it("keeps every element and no overflow button when they fit", async () => {
        await render(<Toolbar overflow items={ITEMS.slice(0, 3)} testId="x" />);
        await until(() => expect(shown()).toEqual(["a", "b", "c"]));
        expect(box(byTestId("x-overflow-root")).width).toBe(0);
    });
});
