import { testIds } from "@pureform/anatomy";
import { createInteractionSource } from "@pureform/binding-core/interaction";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { Button } from "./button";
import { Card } from "./card";
import { IconButton } from "./icon-button";
import { Glyph } from "./icon-style";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, settle } from "./testing/render";

const ids = testIds.card;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["card", "button", "iconButton", "ripple"]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const background = (id: string) =>
    getComputedStyle(byTestId(id)).backgroundColor;

describe("Card on React Native", () => {
    const widthOf = async (props: ComponentProps<typeof Card>) => {
        await withRegistry(
            <View style={{ width: 400 }}>
                <Card headline="Basic plan" {...props} />
            </View>,
        );
        return byTestId(ids.root).getBoundingClientRect().width;
    };

    it("fills its parent's width", async () => {
        expect(await widthOf({})).toBeCloseTo(400, 0);
    });

    it("hugs its content with width fit", async () => {
        expect(await widthOf({ width: "fit" })).toBeLessThan(200);
    });

    it("is one button around its children with onPress, as before", async () => {
        const press = vi.fn<() => void>();
        await withRegistry(
            <Card onPress={press} headline="Basic plan" supportingText="$4" />,
        );
        const root = byTestId(ids.root);
        expect(root.getAttribute("role")).toBe("button");
        expect(root.textContent).toBe("Basic plan$4");
        expect(
            document.querySelector(`[data-testid="${ids.actionArea}"]`),
        ).toBe(null);
        await interact(() => userEvent.click(root));
        expect(press).toHaveBeenCalledOnce();
    });

    it("moves onPress to the action area beside other controls, the root no button", async () => {
        const press = vi.fn<() => void>();
        const upgrade =
            vi.fn<NonNullable<ComponentProps<typeof Button>["onPress"]>>();
        await withRegistry(
            <Card
                onPress={press}
                headline="Basic plan"
                supportingText="$4 a month"
                headerAction={
                    <IconButton aria-label="More" icon={<Glyph glyph="⋮" />} />
                }
                actions={<Button label="Upgrade" onPress={upgrade} />}
            />,
        );
        const root = byTestId(ids.root);
        const area = byTestId(ids.actionArea);
        // The root groups nothing; the action area is the one button for the card's action.
        expect(root.getAttribute("role")).toBe(null);
        expect(root.hasAttribute("tabindex")).toBe(false);
        expect(area.getAttribute("role")).toBe("button");
        expect(area.textContent).toBe("$4 a month");
        expect(area.querySelector("[role=button]")).toBe(null);
        // The header holds a control, so it's outside, before the action area.
        expect(byTestId(ids.header).contains(area)).toBe(false);
        expect(area.contains(byTestId(ids.actions))).toBe(false);
        // The sections pad themselves.
        expect(getComputedStyle(root).paddingTop).toBe("0px");

        const rest = background(ids.root);
        await interact(() => userEvent.hover(area));
        await settle(50);
        expect(background(ids.root)).not.toBe(rest);
        await interact(() => userEvent.unhover(area));
        await settle(50);

        await interact(() => userEvent.click(area));
        expect(press).toHaveBeenCalledOnce();
        const button = byTestId(ids.actions).querySelector<HTMLElement>(
            "[role=button]",
        )!;
        await interact(() => userEvent.click(button));
        expect(upgrade).toHaveBeenCalledOnce();
        expect(press).toHaveBeenCalledOnce();
    });

    it("composes Root around the action area, its source the card's", async () => {
        const source = createInteractionSource();
        await withRegistry(
            <Card.Root padded={false} interactionSource={source} testId="plan">
                <Card.ActionArea onPress={() => {}}>
                    <Card.Header>
                        <Card.HeaderText>
                            <Card.Headline>Basic plan</Card.Headline>
                        </Card.HeaderText>
                    </Card.Header>
                </Card.ActionArea>
                <Card.Actions>
                    <Button label="Upgrade" />
                </Card.Actions>
            </Card.Root>,
        );
        await settle(20);
        const root = byTestId("plan-root");
        // The ripple's layer, last in the root, once the action area is there.
        expect(root.lastElementChild?.hasAttribute("data-testid")).toBe(false);
        await interact(() => userEvent.hover(byTestId("plan-action-area")));
        expect(source.state.hovered).toBe(true);
        await interact(() => userEvent.unhover(byTestId("plan-action-area")));
        await interact(() =>
            userEvent.hover(
                byTestId("plan-actions").querySelector<HTMLElement>(
                    "[role=button]",
                )!,
            ),
        );
        expect(source.state.hovered).toBe(false);
    });

    it("draws no layer in a card that doesn't act", async () => {
        await withRegistry(<Card headline="Basic plan" />);
        expect(byTestId(ids.root).lastElementChild).toBe(byTestId(ids.header));
    });
});

describe("Card actions as text on React Native", () => {
    it("draw a string in the card's content color, as the web's inherit it", async () => {
        await withRegistry(<Card headline="Plan" actions="Plan details" />);
        const text = byTestId(ids.actions).querySelector("div, span")!;
        expect(getComputedStyle(text).color).toBe(
            getComputedStyle(byTestId(ids.root)).color,
        );
        expect(getComputedStyle(text).color).not.toBe("rgb(0, 0, 0)");
    });
});
