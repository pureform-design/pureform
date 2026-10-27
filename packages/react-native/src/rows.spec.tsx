import { Profiler, useId, useState } from "react";
import type { ProfilerOnRenderCallback, ReactNode } from "react";
import type { PressableProps } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Glyph, PureformProvider } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { Menu } from "./menu";
import { NavigationBar } from "./navigation-bar";
import { NavigationRail } from "./navigation-rail";
import { Radio, RadioGroup } from "./radio-group";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { interact, mount, outside, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "radio",
        "tabs",
        "menu",
        "navigationBar",
        "navigationRail",
        "ripple",
    ]);
});

// Every row's surface is a `Pressable`. This engine profiles each one under its test id and its
// own id, so the commits name the rows that rendered again.
let renders: string[] = [];
const record: ProfilerOnRenderCallback = (id) => {
    renders.push(id);
};
const ProfiledPressable = (props: PressableProps & { testID: string }) => (
    <Profiler id={`${props.testID}#${useId()}`} onRender={record}>
        <animated.Pressable {...props} />
    </Profiler>
);
const profiled: MotionEngine = {
    ...animated,
    name: "profiled",
    Pressable: ProfiledPressable,
};

const ITEMS = [
    { value: "mail", label: "Mail", icon: <Glyph glyph="✉" /> },
    { value: "chat", label: "Chat", icon: <Glyph glyph="☏" /> },
    { value: "meet", label: "Meet", icon: <Glyph glyph="☺" /> },
];
const TOKENS = { densityOffset: 0 };

// Renders `view` for a value under a parent the test renders again: `rerender()` with the same
// value, `set(value)` with another.
const mountUnder = async <T,>(initial: T, view: (value: T) => ReactNode) => {
    const parent = outside({ value: initial, tick: 0 });
    let current = { value: initial, tick: 0 };
    await mount(
        <PureformProvider registry={registry} engine={profiled} motion="reduce">
            <parent.Holder>
                {(state) => {
                    current = state;
                    return view(state.value);
                }}
            </parent.Holder>
        </PureformProvider>,
    );
    // Rows can render again after mounting, once they're laid out; under load that lands late, so
    // wait until they're quiet before counting what a change renders.
    for (let tries = 0; tries < 20; tries++) {
        renders = [];
        await settle(50);
        if (renders.length === 0) break;
    }
    const rendering = async (change: () => Promise<void>) => {
        renders = [];
        await change();
        return renders;
    };
    return {
        rerender: () =>
            rendering(() =>
                parent.set({ value: current.value, tick: current.tick + 1 }),
            ),
        set: (value: T) =>
            rendering(() => parent.set({ value, tick: current.tick + 1 })),
    };
};

// How many rows with a test id rendered.
const count = (ids: readonly string[], testId: string) =>
    new Set(ids.filter((id) => id.startsWith(`${testId}#`))).size;

describe("a composite's rows", () => {
    it("a radio group's radios don't render again with the group's parent", async () => {
        const items = await mountUnder("a", (value) => (
            <RadioGroup
                items={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                    { value: "c", label: "C" },
                ]}
                value={value}
                color="error"
                radioProps={{ tokens: { ...TOKENS } }}
            />
        ));
        expect(await items.rerender()).toEqual([]);
        // The value is the group's: every radio reads it.
        expect(count(await items.set("b"), "pf-radio-root")).toBe(3);
    });

    it("radios given as children don't render again with the group's parent", async () => {
        const children = await mountUnder("a", (value) => (
            <RadioGroup value={value} onValueChange={() => {}}>
                <Radio value="a" aria-label="A" />
                <Radio value="b" aria-label="B" />
            </RadioGroup>
        ));
        expect(await children.rerender()).toEqual([]);
        expect(count(await children.set("b"), "pf-radio-root")).toBe(2);
    });

    it("tabs render again only those whose selection changed", async () => {
        const tabs = await mountUnder("mail", (value) => (
            <Tabs
                items={ITEMS}
                value={value}
                onValueChange={() => {}}
                variant="secondary"
                tokens={{ ...TOKENS }}
            />
        ));
        expect(await tabs.rerender()).toEqual([]);
        expect(count(await tabs.set("chat"), "pf-tabs-tab")).toBe(2);
    });

    it("navigation destinations render again only those whose selection changed", async () => {
        for (const [Navigation, item] of [
            [NavigationBar, "pf-navigation-bar-item"],
            [NavigationRail, "pf-navigation-rail-item"],
        ] as const) {
            const navigation = await mountUnder("mail", (value) => (
                <Navigation
                    items={ITEMS}
                    value={value}
                    onValueChange={() => {}}
                    tokens={{ ...TOKENS }}
                />
            ));
            expect(await navigation.rerender()).toEqual([]);
            expect(count(await navigation.set("meet"), item)).toBe(2);
        }
    });

    it("a menu's items render again only those whose selection changed", async () => {
        const menu = await mountUnder("mail", (value) => (
            <Menu
                items={ITEMS}
                value={value}
                onSelect={() => {}}
                density="-1"
                tokens={{ ...TOKENS }}
            />
        ));
        expect(await menu.rerender()).toEqual([]);
        expect(count(await menu.set("chat"), "pf-menu-item")).toBe(2);
    });

    it("rows call the latest callback their parent gave", async () => {
        const picked: string[] = [];
        function Parent(): ReactNode {
            const [round, setRound] = useState(0);
            return (
                <Menu
                    items={ITEMS}
                    onSelect={({ value }) => {
                        picked.push(`${value}@${round}`);
                        setRound(round + 1);
                    }}
                />
            );
        }
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <Parent />
            </PureformProvider>,
        );
        const items =
            document.querySelectorAll<HTMLElement>('[role="menuitem"]');
        await interact(() => userEvent.click(items[1]!));
        await interact(() => userEvent.click(items[2]!));
        expect(picked).toEqual(["chat@0", "meet@1"]);
    });

    it("keyed style and slotProps the app keeps don't render rows again", async () => {
        const style = {
            item: { minHeight: 52 },
            itemLabel: { fontWeight: "600" },
        } as const;
        const slotProps = { item: { onPressIn: () => {} } };
        const menu = await mountUnder("mail", (value) => (
            <Menu
                items={ITEMS}
                value={value}
                onSelect={() => {}}
                style={style}
                slotProps={slotProps}
            />
        ));
        expect(await menu.rerender()).toEqual([]);
    });
});
