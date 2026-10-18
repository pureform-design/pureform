import { Profiler, useId } from "react";
import type {
    ComponentProps,
    ProfilerOnRenderCallback,
    ReactNode,
} from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { Radio, RadioGroup } from "./radio-group";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, outside } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["radio", "ripple"]);
});

// Every row's surface is a `Pressable`. This engine profiles each one under its test id and its
// own id, so the commits name the rows that rendered again.
let renders: string[] = [];
const record: ProfilerOnRenderCallback = (id) => {
    renders.push(id);
};
const ProfiledPressable = (
    props: ComponentProps<typeof animated.Pressable> & { testID: string },
) => (
    <Profiler id={`${props.testID}#${useId()}`} onRender={record}>
        <animated.Pressable {...props} />
    </Profiler>
);
const profiled: MotionEngine = {
    ...animated,
    name: "profiled",
    Pressable: ProfiledPressable,
};

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
                tokens={{ ...TOKENS }}
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
});
