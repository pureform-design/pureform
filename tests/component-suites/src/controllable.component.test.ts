// The controlled and uncontrolled rules (design doc §9.4), for every component with a state:
// uncontrolled state changes on its own; controlled state asks and moves only with the prop; each
// callback fires once per user action and never for a prop change; the default is read once; and
// switching between the two warns.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import type { ComponentCase, StateCase } from "./components";
import type { Mounted } from "./harness/harness";
import { mountCase, stateNames, watchConsole } from "./harness/page";

const stateful = COMPONENTS.filter(
    (component): component is ComponentCase & { state: StateCase } =>
        component.state !== undefined,
);

describe.each(stateful)("$component", (component) => {
    const state = component.state;
    const names = stateNames(state.prop);
    const mount = (props: Record<string, unknown>) =>
        mountCase(component, { ...state.props, ...props });

    // The pointer stays wherever an earlier test left it. Resting where a trigger renders, it
    // would open (or keep open) a tooltip with no delay, so it waits in the viewport's far corner.
    beforeEach(async () => {
        await commands.mouse(
            "move",
            window.innerWidth - 1,
            window.innerHeight - 1,
        );
    });

    it("uncontrolled: changes on its own and reports the change once", async () => {
        const onChange = vi.fn<(details: Record<string, unknown>) => void>();
        const { host } = mount({
            [names.defaultValue]: state.from,
            [names.onChange]: onChange,
        });
        expect(state.read(host)).toEqual(state.from);
        await state.act(host);
        await harness.settle();
        expect(state.read(host)).toEqual(state.to);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]![0]).toMatchObject({
            [state.prop]: state.to,
        });
    });

    it("uncontrolled: reads the default once, at creation", async () => {
        const scene = mount({ [names.defaultValue]: state.from });
        await scene.update({ [names.defaultValue]: state.to });
        expect(state.read(scene.host)).toEqual(state.from);
    });

    it("controlled: asks to change, and doesn't move until the prop does", async () => {
        const onChange = vi.fn<(details: Record<string, unknown>) => void>();
        const { host } = mount({
            [names.value]: state.from,
            [names.onChange]: onChange,
        });
        await state.act(host);
        await harness.settle();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]![0]).toMatchObject({
            [state.prop]: state.to,
        });
        expect(state.read(host)).toEqual(state.from);
        // A second action asks again: nothing moved in between.
        await state.act(host);
        await harness.settle();
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange.mock.calls[1]![0]).toMatchObject({
            [state.prop]: state.to,
        });
        expect(state.read(host)).toEqual(state.from);
    });

    it("controlled: moves when the owner takes the change", async () => {
        let scene!: Mounted;
        const onChange = vi.fn<(details: Record<string, unknown>) => void>(
            (details) => {
                void scene.update({ [names.value]: details[state.prop] });
            },
        );
        scene = mount({
            [names.value]: state.from,
            [names.onChange]: onChange,
        });
        await state.act(scene.host);
        await harness.settle();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(state.read(scene.host)).toEqual(state.to);
    });

    it("controlled: a prop change moves it without calling back", async () => {
        const onChange = vi.fn<(details: Record<string, unknown>) => void>();
        const scene = mount({
            [names.value]: state.from,
            [names.onChange]: onChange,
        });
        await scene.update({ [names.value]: state.to });
        expect(state.read(scene.host)).toEqual(state.to);
        await scene.update({ [names.value]: state.from });
        expect(state.read(scene.host)).toEqual(state.from);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("warns once when it switches between uncontrolled and controlled", async () => {
        const console = watchConsole();
        try {
            const scene = mount({ [names.defaultValue]: state.from });
            await scene.update({ [names.value]: state.to });
            await scene.update({ [names.value]: undefined });
            const warnings = console.logged.filter((line) =>
                line.includes("pureform:"),
            );
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain(names.value);
        } finally {
            console.stop();
        }
    });
});
