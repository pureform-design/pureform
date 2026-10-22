// The play tests a story gets from its component's case (`@pureform/component-cases`): the
// state's (read gives `from`, one `act`, read gives `to`) and each key's (focus, press, then the
// key's effect). The cases act through `storybook/test`'s `userEvent`, so the Interactions panel
// shows their steps.

import { createCases } from "@pureform/component-cases";
import type { ComponentCase, KeyCase } from "@pureform/component-cases";
import type { StoryObj } from "@storybook/html-vite";
import { expect, waitFor } from "storybook/test";

import { userEvent } from "#user-event";

const CASES = createCases(userEvent);

/** The case for a component, by its export name (`Switch`). */
export const caseFor = (component: string): ComponentCase => {
    const found = CASES.find((c) => c.component === component);
    if (!found) throw new Error(`no component case for ${component}`);
    return found;
};

/** The prop that starts the state uncontrolled: `checked` gives `defaultChecked`. */
export const defaultProp = (prop: string): string =>
    `default${prop[0]!.toUpperCase()}${prop.slice(1)}`;

/** The canvas, once the component's root is in it. */
const mounted = async (c: ComponentCase, canvas: HTMLElement) => {
    await waitFor(() =>
        expect(
            canvas.querySelector(`[data-testid="${c.root}"]`),
        ).not.toBeNull(),
    );
    return canvas;
};

type Play = NonNullable<StoryObj["play"]>;

/** One `act` moves the state from `from` to `to`. */
export const statePlay =
    (c: ComponentCase): Play =>
    async ({ canvasElement }) => {
        const state = c.state!;
        const host = await mounted(c, canvasElement);
        await expect(state.read(host)).toEqual(state.from);
        await state.act(host);
        await waitFor(() => expect(state.read(host)).toEqual(state.to));
    };

/** A key on the focused component does what the case says. */
export const keyPlay =
    (c: ComponentCase, key: KeyCase): Play =>
    async ({ args, canvasElement }) => {
        const host = await mounted(c, canvasElement);
        c.keyboard!.focusable(host).focus();
        await userEvent.keyboard(key.key);
        const onClick = args["onClick"] as
            | { mock: { calls: unknown[] } }
            | undefined;
        if (key.does === "click") {
            await waitFor(() => expect(onClick).toHaveBeenCalledOnce());
        } else if (key.does === "change") {
            const to = key.to ?? c.state!.to;
            await waitFor(() => expect(c.state!.read(host)).toEqual(to));
        } else {
            if (c.state) await expect(c.state.read(host)).toEqual(c.state.from);
            if (onClick) await expect(onClick).not.toHaveBeenCalled();
        }
    };
