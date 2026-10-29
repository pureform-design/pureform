import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Toolbar } from ".";
import { ProvidedTokens, PureformProvider, useTokens } from "..";
import { AppBar } from "../app-bar";
import { IconButton } from "../icon-button";
import { colorText } from "../styles";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import {
    byTestId,
    computed,
    interact,
    mount,
    settle,
    until,
} from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "appBar",
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
    it("gives an element its own style over buttonProps, and no other element's", async () => {
        await render(
            <Toolbar
                aria-label="Edit"
                buttonProps={{ style: { root: { opacity: 0.9 } } }}
                items={[
                    {
                        value: "bold",
                        label: "Bold",
                        testId: "bold",
                        style: { root: { opacity: 0.4 } },
                    },
                    { value: "italic", label: "Italic", testId: "italic" },
                ]}
            />,
        );
        expect(computed("bold-root").opacity).toBe("0.4");
        expect(computed("italic-root").opacity).toBe("0.9");
    });

    it("hugs its elements when floating, as the web's inline-flex bar, and fills its edge when docked", async () => {
        await render(<Toolbar aria-label="Edit" items={ITEMS.slice(0, 3)} />);
        const floating = box(byTestId(testIds.toolbar.root)).width;
        // Three 48px icon buttons, 4px apart, and the bar's padding: far less than the column.
        expect(floating).toBeLessThan(200);
        document.body.innerHTML = "";
        await render(
            <Toolbar
                aria-label="Edit"
                placement="docked"
                items={ITEMS.slice(0, 3)}
            />,
        );
        // The column is 600 wide less the 160 padding on each side.
        expect(box(byTestId(testIds.toolbar.root)).width).toBeCloseTo(280, 0);
    });

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
        // Until the row is measured, every element shows with the overflow button, so the
        // three alone don't say it's measured: wait for both.
        await until(() => {
            expect(shown()).toEqual(["a", "b", "c"]);
            expect(box(byTestId("x-overflow-root")).width).toBe(0);
        });
    });
});

describe("provided tokens", () => {
    // The CSS color a token value draws in, as the browser computes it.
    const css = (value: string) => {
        const probe = document.createElement("div");
        probe.style.color = value;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
    };
    // The color an icon button's glyph draws in.
    const glyph = (testId: string) => {
        const icon = byTestId(`${testId}-icon`);
        const text =
            [...icon.querySelectorAll<HTMLElement>("*")].at(-1) ?? icon;
        return getComputedStyle(text).color;
    };
    let onContainer = "";
    let onSurface = "";
    let onSurfaceVariant = "";
    const Probe = () => {
        const tokens = useTokens();
        // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
        onContainer = colorText(tokens["colors.onPrimaryContainer"]) ?? "";
        // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
        onSurface = colorText(tokens["colors.onSurface"]) ?? "";
        // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
        onSurfaceVariant = colorText(tokens["colors.onSurfaceVariant"]) ?? "";
        return null;
    };

    it("draws a vibrant toolbar's icon buttons in its content color", async () => {
        await render(
            <>
                <Probe />
                <Toolbar
                    aria-label="Edit"
                    color="vibrant"
                    items={ITEMS.slice(0, 1)}
                />
                <Toolbar
                    aria-label="Standard"
                    items={[{ ...ITEMS[1]!, testId: "standard" }]}
                />
            </>,
        );
        await settle();
        expect(glyph("item-a")).toBe(css(onContainer));
        expect(glyph("standard")).not.toBe(css(onContainer));
    });

    it("lets an icon button's own color group and tokens win over what's provided", async () => {
        await render(
            <ProvidedTokens tokens={{ iconButton: { accent: "#ff0000" } }}>
                <IconButton aria-label="P" icon="P" testId="provided" />
                <IconButton
                    aria-label="S"
                    icon="S"
                    color="secondary"
                    testId="own"
                />
                <IconButton
                    aria-label="T"
                    icon="T"
                    tokens={{ accent: "#00ff00" }}
                    testId="instance"
                />
                <ProvidedTokens tokens={{ iconButton: { accent: "#0000ff" } }}>
                    <IconButton aria-label="N" icon="N" testId="nearest" />
                </ProvidedTokens>
            </ProvidedTokens>,
        );
        await settle();
        expect(glyph("provided")).toBe(css("#ff0000"));
        expect(glyph("own")).not.toBe(css("#ff0000"));
        expect(glyph("instance")).toBe(css("#00ff00"));
        expect(glyph("nearest")).toBe(css("#0000ff"));
    });

    it("draws an app bar's leading and trailing icon buttons in their parts' colors", async () => {
        await render(
            <>
                <Probe />
                <AppBar
                    headline="Inbox"
                    leading={
                        <IconButton aria-label="Back" icon="←" testId="back" />
                    }
                    trailing={
                        <IconButton aria-label="More" icon="⋮" testId="more" />
                    }
                />
            </>,
        );
        await settle();
        expect(glyph("back")).toBe(css(onSurface));
        expect(glyph("more")).toBe(css(onSurfaceVariant));
    });
});
