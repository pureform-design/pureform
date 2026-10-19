import { materialIndication as webMaterialIndication } from "@pureform/binding-core/indication";
import type { Indication } from "@pureform/binding-core/indication";
import { createInteractionSource } from "@pureform/binding-core/interaction";
import { act } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import {
    defineIndication,
    FOCUS_AFTER_PRESS_MS,
    materialIndication,
    noIndication,
    PureformProvider,
    useIndication,
    useInteractionSource,
    useInteractionState,
    useTokens,
} from ".";
import type {
    Interaction,
    InteractionState,
    MutableInteractionSource,
    NativeIndicationProps,
} from ".";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { IconButton } from "./icon-button";
import { NavigationBar } from "./navigation-bar";
import { Radio } from "./radio-group";
import { Slider } from "./slider";
import { Snackbar } from "./snackbar";
import { Switch } from "./switch";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, outside, settle } from "./testing/render";
import { Text } from "./text";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "button",
        "card",
        "checkbox",
        "iconButton",
        "navigationBar",
        "radio",
        "slider",
        "snackbar",
        "switchControl",
        "tabs",
        "text",
        "ripple",
    ]);
});

afterEach(() => vi.restoreAllMocks());

const render = (
    node: ReactNode,
    props: { indication?: Indication; motion?: "reduce" | "full" } = {},
) =>
    mount(
        <PureformProvider
            registry={registry}
            motion={props.motion ?? "full"}
            {...(props.indication ? { indication: props.indication } : {})}
        >
            {node}
        </PureformProvider>,
    );

// A surface's ripple layer: its last element, which has no test id.
const layerOf = (id: string): HTMLElement | null => {
    const last = byTestId(id).lastElementChild as HTMLElement | null;
    return last && !last.hasAttribute("data-testid") ? last : null;
};
const ripples = (id: string) => layerOf(id)?.childElementCount ?? 0;

const background = (id: string) =>
    getComputedStyle(byTestId(id)).backgroundColor;

// Long enough for a state layer's color to fade to its new value.
const FADE_MS = 400;

const emit = (
    source: MutableInteractionSource,
    interaction: Interaction,
): Promise<void> =>
    act(async () => {
        source.emit(interaction);
    });

describe("the interaction source from Pressable", () => {
    it("hears a component's hover, press, and release, and the selection follows", async () => {
        const source = createInteractionSource();
        const heard: string[] = [];
        source.subscribe((interaction) => heard.push(interaction.type));
        await render(
            <Button label="Save" interactionSource={source} testId="save" />,
        );
        const rest = background("save-root");
        await interact(() => userEvent.hover(byTestId("save-root")));
        expect(source.state.hovered).toBe(true);
        await settle(FADE_MS);
        expect(background("save-root")).not.toBe(rest);
        await interact(() => userEvent.click(byTestId("save-root")));
        await interact(() => userEvent.unhover(byTestId("save-root")));
        expect(heard).toEqual([
            "hoverEnter",
            "press",
            "focus",
            "release",
            "hoverExit",
        ]);
        expect(source.state.pressed).toBe(false);
        expect(source.state.hovered).toBe(false);
    });

    it("presses from the pointer's page point, and from the center for a key", async () => {
        const source = createInteractionSource();
        const presses: Interaction[] = [];
        source.subscribe((interaction) => {
            if (interaction.type === "press") presses.push(interaction);
        });
        await render(
            <Button label="Save" interactionSource={source} testId="save" />,
        );
        const root = byTestId("save-root");
        await interact(() => userEvent.click(root));
        const box = root.getBoundingClientRect();
        expect(presses[0]).toMatchObject({ pointer: "mouse" });
        const origin = (presses[0] as { origin: { x: number; y: number } })
            .origin;
        expect(origin.x).toBeCloseTo(box.left + box.width / 2, 0);
        expect(origin.y).toBeCloseTo(box.top + box.height / 2, 0);
        root.focus();
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(presses[1]).toMatchObject({
            origin: "center",
            pointer: "keyboard",
        });
    });

    it("ends a press in progress when the component becomes disabled", async () => {
        const source = createInteractionSource();
        const disabled = outside(false);
        await render(
            <disabled.Holder>
                {(value) => (
                    <Button
                        label="Save"
                        interactionSource={source}
                        disabled={value}
                    />
                )}
            </disabled.Holder>,
        );
        const root = byTestId("pf-button-root");
        const box = root.getBoundingClientRect();
        const at = {
            bubbles: true,
            button: 0,
            clientX: box.left + 4,
            clientY: box.top + 4,
        };
        await act(async () => {
            root.dispatchEvent(new MouseEvent("mousedown", at));
        });
        expect(source.state.pressed).toBe(true);
        const heard: string[] = [];
        source.subscribe((interaction) => heard.push(interaction.type));
        await disabled.set(true);
        await settle();
        expect(source.state.pressed).toBe(false);
        expect(heard).toContain("cancel");
        await act(async () => {
            document.dispatchEvent(new MouseEvent("mouseup", at));
        });
    });

    it("ends a destination's press when the whole navigation becomes disabled", async () => {
        const source = createInteractionSource();
        const disabled = outside(false);
        await render(
            <disabled.Holder>
                {(value) => (
                    <NavigationBar
                        aria-label="Main"
                        disabled={value}
                        items={[
                            {
                                value: "home",
                                label: "Home",
                                interactionSource: source,
                            },
                        ]}
                    />
                )}
            </disabled.Holder>,
        );
        const item = byTestId("pf-navigation-bar-item");
        const box = item.getBoundingClientRect();
        const at = {
            bubbles: true,
            button: 0,
            clientX: box.left + 4,
            clientY: box.top + 4,
        };
        await act(async () => {
            item.dispatchEvent(new MouseEvent("mousedown", at));
        });
        expect(source.state.pressed).toBe(true);
        await disabled.set(true);
        await settle();
        expect(source.state.pressed).toBe(false);
        expect(item.getAttribute("aria-disabled")).toBe("true");
        await act(async () => {
            document.dispatchEvent(new MouseEvent("mouseup", at));
        });
    });

    it("presses and drags a slider", async () => {
        const source = createInteractionSource();
        const heard: string[] = [];
        source.subscribe((interaction) => heard.push(interaction.type));
        await render(<Slider aria-label="Volume" interactionSource={source} />);
        await interact(() => userEvent.click(byTestId("pf-slider-root")));
        // A click focuses it, as a pressed range input is.
        expect(heard).toEqual([
            "hoverEnter",
            "press",
            "dragStart",
            "focus",
            "dragStop",
            "release",
        ]);
    });
});

describe("the slider and the keyboard", () => {
    it("takes focus, shows it, and steps with the arrow keys by direction", async () => {
        const source = createInteractionSource();
        const value = outside<"ltr" | "rtl">("ltr");
        await render(
            <value.Holder>
                {(dir) => (
                    <PureformProvider registry={registry} dir={dir}>
                        <Slider
                            aria-label="Volume"
                            defaultValue={40}
                            interactionSource={source}
                        />
                    </PureformProvider>
                )}
            </value.Holder>,
        );
        await settle(FOCUS_AFTER_PRESS_MS);
        const root = byTestId("pf-slider-root");
        await act(async () => root.focus());
        expect(source.state.focusVisible).toBe(true);
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(root.getAttribute("aria-valuenow")).toBe("41");
        await interact(() => userEvent.keyboard("{End}"));
        expect(root.getAttribute("aria-valuenow")).toBe("100");
        await value.set("rtl");
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(root.getAttribute("aria-valuenow")).toBe("99");
    });
});

describe("keyboard-only focusVisible", () => {
    it("shows the focus indicator for focus that doesn't follow a press", async () => {
        const source = createInteractionSource();
        await render(
            <Button label="Save" interactionSource={source} testId="save" />,
        );
        await settle(FOCUS_AFTER_PRESS_MS);
        await act(async () => byTestId("save-root").focus());
        await settle(FADE_MS);
        expect(source.state.focusVisible).toBe(true);
        expect(getComputedStyle(byTestId("save-root")).outlineWidth).toBe(
            "3px",
        );
    });

    it("hides it for focus a press brings", async () => {
        const source = createInteractionSource();
        await render(
            <Button label="Save" interactionSource={source} testId="save" />,
        );
        await interact(() => userEvent.click(byTestId("save-root")));
        await settle(FADE_MS);
        expect(source.state.focused).toBe(true);
        expect(source.state.focusVisible).toBe(false);
        expect(getComputedStyle(byTestId("save-root")).outlineWidth).toBe(
            "0px",
        );
    });

    it("hides it for focus that comes just after a press ends, as a tap's does", async () => {
        const source = createInteractionSource();
        await render(
            <>
                <Button label="Tap" testId="tap" />
                <Button label="Next" interactionSource={source} testId="next" />
            </>,
        );
        await interact(() => userEvent.click(byTestId("tap-root")));
        await act(async () => byTestId("next-root").focus());
        expect(source.state.focusVisible).toBe(false);
        await settle(FOCUS_AFTER_PRESS_MS);
        await act(async () => byTestId("tap-root").focus());
        await act(async () => byTestId("next-root").focus());
        expect(source.state.focusVisible).toBe(true);
    });
});

describe("the provider's default", () => {
    it("is Material's: a ripple in each surface, from the source's presses", async () => {
        await render(
            <>
                <Button label="Save" />
                <IconButton aria-label="Edit" icon="✎" />
            </>,
        );
        expect(layerOf("pf-button-root")).not.toBeNull();
        expect(ripples("pf-button-root")).toBe(0);
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        expect(ripples("pf-button-root")).toBe(1);
        // The icon button's surface is its container.
        await interact(() => userEvent.click(byTestId("pf-icon-button-root")));
        expect(ripples("pf-icon-button-container")).toBe(1);
    });

    it("ripples on the components that gained one", async () => {
        await render(
            <>
                <Checkbox aria-label="Agree" />
                <Switch aria-label="Wi-Fi" />
                <Radio aria-label="Small" />
                <Card onPress={() => {}}>
                    <Text>Card</Text>
                </Card>
                <Snackbar supportingText="Archived" action="Undo" />
                <Slider aria-label="Volume" />
            </>,
        );
        for (const [press, surface] of [
            ["pf-checkbox-root", "pf-checkbox-root"],
            ["pf-switch-control-root", "pf-switch-control-state-layer"],
            ["pf-radio-root", "pf-radio-root"],
            ["pf-snackbar-action", "pf-snackbar-action"],
            ["pf-snackbar-close", "pf-snackbar-close"],
            ["pf-slider-root", "pf-slider-state-layer"],
            ["pf-card-root", "pf-card-root"],
        ] as const) {
            expect(ripples(surface), surface).toBe(0);
            await interact(() => userEvent.click(byTestId(press)));
            expect(ripples(surface), surface).toBe(1);
        }
    });

    it("draws no ripple under reduced motion, and no layer on a card that doesn't act", async () => {
        await render(
            <>
                <Button label="Save" />
                <Card testId="still" />
            </>,
            { motion: "reduce" },
        );
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        expect(layerOf("pf-button-root")).not.toBeNull();
        expect(ripples("pf-button-root")).toBe(0);
        expect(layerOf("still-root")).toBeNull();
    });

    it("can be no indication: no ripple and no state layer, with the focus indicator kept", async () => {
        const source = createInteractionSource();
        await render(
            <Button label="Save" interactionSource={source} testId="save" />,
            { indication: noIndication },
        );
        const rest = background("save-root");
        await interact(() => userEvent.hover(byTestId("save-root")));
        await settle(FADE_MS);
        expect(background("save-root")).toBe(rest);
        await interact(() => userEvent.click(byTestId("save-root")));
        expect(layerOf("save-root")).toBeNull();
        await interact(() => userEvent.unhover(byTestId("save-root")));
        await act(async () => byTestId("save-root").blur());
        await settle(FOCUS_AFTER_PRESS_MS);
        await act(async () => byTestId("save-root").focus());
        await settle(FADE_MS);
        expect(getComputedStyle(byTestId("save-root")).outlineWidth).toBe(
            "3px",
        );
    });

    it("writes its theme-level tokens in the overrides, and its focus indicator color on each component", async () => {
        let tokens: Record<string, unknown> = {};
        function Probe() {
            tokens = useTokens();
            return null;
        }
        const custom = defineIndication({
            name: "app:strong",
            tokens: {
                stateHoverOpacity: 0.2,
                focusIndicatorThickness: 5,
                focusIndicatorColor: "rgb(255, 0, 0)",
            },
        });
        await render(
            <>
                <Probe />
                <Button label="Save" testId="save" />
            </>,
            { indication: custom },
        );
        expect(tokens["opacity.stateHover"]).toBe(0.2);
        expect(tokens["sizes.focusIndicatorThickness"]).toBe(5);
        await settle(FOCUS_AFTER_PRESS_MS);
        await act(async () => byTestId("save-root").focus());
        await settle(FADE_MS);
        const style = getComputedStyle(byTestId("save-root"));
        expect(style.outlineWidth).toBe("5px");
        expect(style.outlineColor).toBe("rgb(255, 0, 0)");
        // No native half, so no layer.
        expect(layerOf("save-root")).toBeNull();
    });

    it("is inherited, and a nested provider's wins", async () => {
        await mount(
            <PureformProvider
                registry={registry}
                motion="full"
                indication={noIndication}
            >
                <Button label="Outer" testId="outer" />
                <PureformProvider indication={materialIndication()}>
                    <Button label="Inner" testId="inner" />
                </PureformProvider>
            </PureformProvider>,
        );
        expect(layerOf("outer-root")).toBeNull();
        expect(layerOf("inner-root")).not.toBeNull();
    });
});

describe("a component's indication prop", () => {
    it("overrides the provider's for that component alone", async () => {
        await render(
            <>
                <Button
                    label="Plain"
                    indication={noIndication}
                    testId="plain"
                />
                <Button label="Other" testId="other" />
            </>,
        );
        const rest = background("plain-root");
        await interact(() => userEvent.hover(byTestId("plain-root")));
        await settle(FADE_MS);
        expect(background("plain-root")).toBe(rest);
        expect(layerOf("plain-root")).toBeNull();
        const other = background("other-root");
        await interact(() => userEvent.hover(byTestId("other-root")));
        await settle(FADE_MS);
        expect(background("other-root")).not.toBe(other);
        expect(layerOf("other-root")).not.toBeNull();
    });

    it("reaches a composite's items, from its root", async () => {
        await render(
            <Tabs
                indication={noIndication}
                items={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                ]}
            />,
        );
        expect(layerOf("pf-tabs-tab")).toBeNull();
    });

    it("draws with a custom native half, given the source and the surface", async () => {
        const seen: NativeIndicationProps[] = [];
        function Native(props: NativeIndicationProps) {
            seen.push(props);
            const state = useInteractionState(props.source);
            return (
                <span data-testid="native">
                    {state.pressed ? "pressed" : "idle"}
                </span>
            );
        }
        const custom = defineIndication({ name: "app:native", native: Native });
        const source = createInteractionSource();
        await render(
            <IconButton
                aria-label="Edit"
                icon="✎"
                indication={custom}
                interactionSource={source}
            />,
        );
        expect(seen.at(-1)).toMatchObject({
            centered: true,
            reducedMotion: false,
            dir: "ltr",
        });
        expect(seen.at(-1)!.source).toBe(source);
        expect(seen.at(-1)!.surface.style).toEqual(
            registry.entry("iconButton").factory({}).container!.style,
        );
        expect(byTestId("native").parentElement).toBe(
            byTestId("pf-icon-button-container"),
        );
        await emit(source, {
            type: "press",
            id: 7,
            origin: "center",
            pointer: "keyboard",
        });
        expect(byTestId("native").textContent).toBe("pressed");
    });

    it("warns once in development when it hides the focus indicator", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const hidden = defineIndication({
            name: "app:hidden",
            tokens: { focusIndicatorThickness: 0 },
        });
        await render(
            <>
                <Button label="A" indication={hidden} />
                <Button label="B" indication={hidden} />
            </>,
        );
        expect(
            warn.mock.calls.filter(([message]) =>
                String(message).includes('"app:hidden"'),
            ),
        ).toHaveLength(1);
    });
});

describe("a shared source", () => {
    it("shows one component's press on another, ripples on both, and reports it", async () => {
        let state: InteractionState | undefined;
        function Shared() {
            const source = useInteractionSource();
            state = useInteractionState(source);
            return (
                <>
                    <Button label="A" interactionSource={source} testId="a" />
                    <Button label="B" interactionSource={source} testId="b" />
                </>
            );
        }
        await render(<Shared />);
        const rest = background("b-root");
        await act(async () => {
            await userEvent.hover(byTestId("a-root"));
        });
        expect(state!.hovered).toBe(true);
        await settle(FADE_MS);
        expect(background("b-root")).not.toBe(rest);
        await interact(() => userEvent.click(byTestId("a-root")));
        expect(ripples("a-root")).toBe(1);
        expect(ripples("b-root")).toBe(1);
        expect(state!.pressed).toBe(false);
    });

    it("never shows one component's focus on another", async () => {
        const source = createInteractionSource();
        await render(
            <>
                <Button label="A" interactionSource={source} testId="a" />
                <Button label="B" interactionSource={source} testId="b" />
            </>,
        );
        await settle(FOCUS_AFTER_PRESS_MS);
        await act(async () => byTestId("a-root").focus());
        await settle(FADE_MS);
        expect(source.state.focusVisible).toBe(true);
        expect(getComputedStyle(byTestId("a-root")).outlineWidth).toBe("3px");
        expect(getComputedStyle(byTestId("b-root")).outlineWidth).toBe("0px");
    });

    it("reaches every subscriber with an app's own kind, and leaves the state alone", async () => {
        // The pointer away from where the button renders: an earlier test's click leaves it
        // there, and the button showing under it would hear it hover.
        const corner = document.body.appendChild(document.createElement("div"));
        corner.style.cssText =
            "position: fixed; right: 0; bottom: 0; width: 4px; height: 4px";
        await userEvent.hover(corner);
        corner.remove();
        const source = createInteractionSource();
        const heard: unknown[] = [];
        source.subscribe((interaction) => heard.push(interaction));
        await render(<Button label="A" interactionSource={source} />);
        await act(async () =>
            source.emit({ type: "app:longPress", id: 1, duration: 600 }),
        );
        expect(heard).toEqual([
            { type: "app:longPress", id: 1, duration: 600 },
        ]);
        expect(source.state.pressed).toBe(false);
    });
});

declare module "@pureform/binding-core/interaction" {
    interface InteractionKinds {
        "app:longPress": { id: number; duration: number };
    }
}

describe("materialIndication", () => {
    it("is named as on the web, the same object for the same options, with a native half", () => {
        expect(materialIndication()).toBe(materialIndication({}));
        expect(materialIndication().name).toBe(webMaterialIndication().name);
        expect(materialIndication({ ripple: "ink-sparkle" }).name).toBe(
            "material:ink-sparkle",
        );
        expect(materialIndication().native).toBeTypeOf("function");
        expect(materialIndication().web).toBe(webMaterialIndication().web);
        expect(materialIndication({ ripple: false })).toBe(
            webMaterialIndication({ ripple: false }),
        );
        expect(noIndication.native).toBeUndefined();
    });

    it("takes binding-core's Material indication as its own", async () => {
        await render(<Button label="Save" />, {
            indication: webMaterialIndication(),
        });
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        expect(ripples("pf-button-root")).toBe(1);
    });
});

describe("useIndication", () => {
    it("gives an app's pressable the provider's indication", async () => {
        let state: InteractionState | undefined;
        function Surface(): ReactNode {
            const source = useInteractionSource();
            state = useInteractionState(source);
            const { surface, layer } = useIndication(source, {
                style: { color: "rgb(0, 0, 255)", borderRadius: 8 },
            });
            const [count, setCount] = useState(0);
            return (
                <Pressable
                    {...surface}
                    onPress={() => setCount(count + 1)}
                    testID="surface"
                    style={{ width: 80, height: 40, overflow: "hidden" }}
                >
                    {layer}
                </Pressable>
            );
        }
        await render(<Surface />);
        await interact(() => userEvent.click(byTestId("surface")));
        expect(ripples("surface")).toBe(1);
        expect(state!.focused).toBe(true);
    });
});
