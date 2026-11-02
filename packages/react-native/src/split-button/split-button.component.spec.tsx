import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { SplitButton } from ".";
import { PureformProvider } from "..";
import { FabMenu } from "../fab-menu";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount, settle, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "splitButton",
        "fabMenu",
        "menu",
        "button",
        "ripple",
    ]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <View style={{ width: 600, height: 400, padding: 160 }}>
                {node}
            </View>
        </PureformProvider>,
    );

const split = testIds.splitButton;
const fab = testIds.fabMenu;
const box = (element: Element) => element.getBoundingClientRect();
const query = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe("SplitButton", () => {
    it("hugs its buttons in a stretching column", async () => {
        await render(
            <SplitButton
                label="Save"
                items={[{ value: "draft", label: "Draft" }]}
            />,
        );
        expect(box(byTestId(split.root)).width).toBeCloseTo(
            box(byTestId(split.leadingButton)).width +
                box(byTestId(split.trailingButton)).width +
                2,
            0,
        );
        expect(box(byTestId(split.root)).width).toBeLessThan(280);
    });

    it("takes a function of each item in menuProps", async () => {
        await render(
            <SplitButton
                label="Save"
                items={[
                    { value: "draft", label: "Draft" },
                    { value: "copy", label: "Copy" },
                ]}
                menuProps={{
                    style: {
                        item: ({ index }) => ({
                            opacity: index === 0 ? 0.4 : 0.9,
                        }),
                    },
                }}
            />,
        );
        await interact(() => userEvent.click(byTestId(split.trailingButton)));
        await settle(300);
        const items = [
            ...document.querySelectorAll<HTMLElement>(
                '[data-testid="pf-menu-item"]',
            ),
        ];
        expect(items).toHaveLength(2);
        expect(getComputedStyle(items[0]!).opacity).toBe("0.4");
        expect(getComputedStyle(items[1]!).opacity).toBe("0.9");
    });

    it("still allows an explicit full-width root", async () => {
        await render(
            <SplitButton
                label="Save"
                items={[]}
                style={{ root: { width: "100%" } }}
            />,
        );
        expect(box(byTestId(split.root)).width).toBeCloseTo(280, 0);
    });

    it("draws two buttons 2px apart, runs the action, and opens the menu under the trailing one", async () => {
        const actions: string[] = [];
        await render(
            <SplitButton
                label="Save"
                onAction={() => actions.push("save")}
                items={[{ value: "draft", label: "Save as draft" }]}
                onSelect={(details) => actions.push(details.value)}
            />,
        );
        const leading = byTestId(split.leadingButton);
        const trailing = byTestId(split.trailingButton);
        expect(box(trailing).left - box(leading).right).toBeCloseTo(2, 0);
        expect(box(leading).height).toBeCloseTo(40, 0);
        expect(trailing.getAttribute("aria-expanded")).toBe("false");
        await interact(() => userEvent.click(leading));
        expect(actions).toEqual(["save"]);
        await interact(() => userEvent.click(trailing));
        await settle(300);
        expect(trailing.getAttribute("aria-expanded")).toBe("true");
        const item = query("pf-menu-item")!;
        expect(item).not.toBeNull();
        // Under the trailing button, at its end.
        expect(box(item.parentElement!).right).toBeCloseTo(
            box(trailing).right,
            0,
        );
        await interact(() => userEvent.click(item));
        expect(actions).toEqual(["save", "draft"]);
        await until(() => expect(query("pf-menu-item")).toBeNull());
    });
});

describe("FabMenu", () => {
    it("hugs its FAB in a stretching column", async () => {
        await render(<FabMenu icon="+" fabLabel="Create" items={[]} />);
        expect(box(byTestId(fab.root)).width).toBeCloseTo(56, 0);
    });

    it("still allows an explicit full-width root", async () => {
        await render(
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={[]}
                style={{ root: { width: "100%" } }}
            />,
        );
        expect(box(byTestId(fab.root)).width).toBeCloseTo(280, 0);
    });

    it("opens its items above the FAB and turns the FAB into the close button", async () => {
        const picked: string[] = [];
        await render(
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                onSelect={(details) => picked.push(details.value)}
            />,
        );
        const trigger = byTestId(fab.closeTrigger);
        expect(trigger.getAttribute("aria-label")).toBe("Create");
        expect(box(trigger).width).toBeCloseTo(56, 0);
        expect(query(fab.list)).toBeNull();
        await interact(() => userEvent.click(trigger));
        await settle(300);
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(trigger.textContent).toBe("×");
        const list = byTestId(fab.list);
        expect(box(list).bottom).toBeLessThanOrEqual(box(trigger).top);
        const items = document.querySelectorAll(`[data-testid="${fab.item}"]`);
        expect(items).toHaveLength(2);
        await interact(() => userEvent.click(items[1]!));
        expect(picked).toEqual(["call"]);
        await until(() => expect(query(fab.list)).toBeNull());
        expect(trigger.textContent).toBe("+");
    });
});
