import { createInteractionSource } from "@pureform/binding-core/interaction";
import { act } from "@testing-library/react";
import { createElement, forwardRef } from "react";
import type { ComponentType, ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { Button } from "./button";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { ListItem } from "./list-item";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    interact,
    mount,
    pointerAway,
    settle,
    until,
} from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["listItem", "button", "ripple"]);
});

// An engine whose views mark what they render, so a test can tell them from React Native's own.
const marked = (engine: MotionEngine): MotionEngine => {
    const mark = (Base: ComponentType<any>, name: string) =>
        forwardRef((props: object, ref) =>
            createElement(Base, { ...props, ref, dataSet: { engine: name } }),
        );
    return {
        ...engine,
        name: `marked-${engine.name}`,
        View: mark(engine.View, "view"),
        Text: mark(engine.Text, "text"),
        Pressable: mark(engine.Pressable, "pressable"),
    };
};

const render = (
    node: ReactNode,
    engine: MotionEngine,
    given = registry,
    timeScale = 1,
) =>
    mount(
        <PureformProvider
            registry={given}
            engine={engine}
            motion="full"
            timeScale={timeScale}
        >
            {node}
        </PureformProvider>,
    );

const fromEngine = (id: string) => byTestId(id).dataset.engine !== undefined;

describe.each([animated, reanimated])("with $name", (engine) => {
    it("draws a list item's still slots with React Native's views, and its surface with the engine's", async () => {
        await render(
            <ListItem
                headline="Inbox"
                supportingText="3 new"
                onPress={() => {}}
            />,
            marked(engine),
        );
        // The surface's background tweens; nothing else in the list item moves.
        expect(fromEngine("pf-list-item-root")).toBe(true);
        expect(fromEngine("pf-list-item-content")).toBe(false);
        expect(fromEngine("pf-list-item-headline")).toBe(false);
        expect(fromEngine("pf-list-item-supporting-text")).toBe(false);
    });

    it("keeps each slot's view through a change of state", async () => {
        await render(
            <ListItem headline="Inbox" onPress={() => {}} />,
            marked(engine),
        );
        const [root, headline] = [
            byTestId("pf-list-item-root"),
            byTestId("pf-list-item-headline"),
        ];
        await interact(() => userEvent.hover(root));
        await settle(50);
        expect(byTestId("pf-list-item-root")).toBe(root);
        expect(byTestId("pf-list-item-headline")).toBe(headline);
    });

    it("still tweens a slot that moves", async () => {
        // Hovered from a source in the page, since under load a hover command can come back
        // after the tween has ended; beside a copy with no time to take, which shows at once the
        // color the tween ends at.
        const source = createInteractionSource();
        const copy = (timeScale: number, testId: string) => (
            <PureformProvider
                registry={registry}
                engine={engine}
                motion="full"
                timeScale={timeScale}
            >
                <Button
                    label="Save"
                    variant="text"
                    testId={testId}
                    interactionSource={source}
                />
            </PureformProvider>
        );
        await pointerAway();
        await mount(
            <>
                {copy(10, "slow")}
                {copy(0, "quick")}
            </>,
        );
        const background = (id: string) =>
            getComputedStyle(byTestId(`${id}-root`)).backgroundColor;
        const rest = background("slow");
        expect(background("quick")).toBe(rest);
        await act(async () => source.emit({ type: "hoverEnter" }));
        const hovered = background("quick");
        expect(hovered).not.toBe(rest);
        // Slowed down tenfold, it's still on its way.
        expect(background("slow")).not.toBe(hovered);
        await until(() => expect(background("slow")).toBe(hovered));
    });
});

it("keeps every slot on the engine for a factory that can't say which move", async () => {
    const factory = registry.entry("listItem");
    if (factory.kind !== "static") throw new Error("expected a static entry");
    const { moving: _, ...rest } = factory.factory;
    const bare = Object.assign(
        (selection: never) => factory.factory(selection),
        rest,
    );
    const { createRegistry } = await import("@pureform/styling");
    const handmade = createRegistry({
        listItem: bare,
        ripple: (registry.entry("ripple") as { factory: unknown }).factory,
    } as never) as unknown as TestRegistry;
    await render(<ListItem headline="Inbox" />, marked(animated), handmade);
    expect(fromEngine("pf-list-item-headline")).toBe(true);
});
