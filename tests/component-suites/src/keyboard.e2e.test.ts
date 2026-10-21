// The keyboard, for every component: Tab reaches it and skips it when disabled, each key does what
// the component's case says (clicks it, changes its state, or nothing), and arrow keys do what
// they should in both directions. Tab passes over a component with no keyboard case.

import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import type { ComponentCase, KeyboardCase, KeyCase } from "./components";
import { motionDone } from "./harness/animations";
import { hostIn, mountCase, stateNames } from "./harness/page";

/** Mounts the component after a plain button, and tabs from it onto the component. */
const focusWithTab = async (
    component: ComponentCase,
    props: Record<string, unknown>,
    dir: "ltr" | "rtl" = "ltr",
) => {
    const host = hostIn(
        `<div><button data-before>Before</button><div data-host></div></div>`,
    );
    const scene = mountCase(component, props, { host, provider: { dir } });
    await harness.settle();
    host.parentElement!.querySelector<HTMLButtonElement>(
        "[data-before]",
    )!.focus();
    await userEvent.tab();
    return scene;
};

/** Presses `key` on the focused component and checks what it did. A click is checked on the
 *  component without its state (a plain button); a change or nothing, with its state. */
const pressAndCheck = async (
    component: Keyed,
    { key, does, to, props = {}, focuses }: KeyCase,
    dir: "ltr" | "rtl" = "ltr",
) => {
    const state = does === "click" ? undefined : component.state;
    if (does === "change" && !state) {
        throw new Error(
            `${component.component} has no state for a key to change`,
        );
    }
    const onClick = vi.fn();
    const onChange = vi.fn();
    const names = state && stateNames(state.prop);
    const { host } = await focusWithTab(
        component,
        {
            ...(state && names
                ? {
                      ...state.props,
                      [names.defaultValue]: state.from,
                      [names.onChange]: onChange,
                  }
                : {}),
            onClick,
            ...props,
        },
        dir,
    );
    expect(document.activeElement).toBe(component.keyboard.focusable(host));
    // What focus did on its own (a tooltip opening) isn't the key's.
    await harness.settle();
    onChange.mockClear();
    await userEvent.keyboard(key);
    await harness.settle();
    // An overlay that closes keeps focus until its exit animation ends and it hides.
    await motionDone();
    await harness.settle();
    if (does === "click") expect(onClick).toHaveBeenCalledTimes(1);
    if (does === "nothing") expect(onClick).not.toHaveBeenCalled();
    if (state) {
        const start =
            "focused" in component.keyboard
                ? component.keyboard.focused
                : state.from;
        expect(state.read(host)).toEqual(
            does === "change" ? (to ?? state.to) : start,
        );
        expect(onChange).toHaveBeenCalledTimes(does === "change" ? 1 : 0);
    }
    expect(document.activeElement).toBe(
        (focuses ?? component.keyboard.focusable)(host),
    );
};

/** A component with a keyboard case. */
type Keyed = ComponentCase & { readonly keyboard: KeyboardCase };

const KEYED = COMPONENTS.filter((component): component is Keyed =>
    Boolean(component.keyboard),
);

describe.each(COMPONENTS.filter((component) => !component.keyboard))(
    "$component",
    (component) => {
        it("Tab passes over it", async () => {
            const { host } = await focusWithTab(component, {});
            expect(
                host.contains(document.activeElement) &&
                    document.activeElement !== host,
            ).toBe(false);
        });
    },
);

describe.each(KEYED)("$component", (component) => {
    it("Tab moves focus to it", async () => {
        const { host } = await focusWithTab(component, {});
        expect(document.activeElement).toBe(component.keyboard.focusable(host));
    });

    it.skipIf(component.keyboard.disables === false)(
        "Tab skips it when disabled",
        async () => {
            const { host } = await focusWithTab(component, {
                disabled: true,
            });
            expect(document.activeElement).not.toBe(
                component.keyboard.focusable(host),
            );
        },
    );

    it.each(component.keyboard.keys)("$key: $does", async (key) => {
        await pressAndCheck(component, key);
    });
});

// Arrow keys follow the provider's direction (design doc §5.9): the same physical key moves the
// other way in `rtl`. A component without `keyboard.arrows` ignores them in both directions.
describe.each(KEYED)("$component, arrow keys", (component) => {
    describe.each(["ltr", "rtl"] as const)("%s", (dir) => {
        const arrows = component.keyboard.arrows?.[dir] ?? [
            { key: "{ArrowLeft}", does: "nothing" },
            { key: "{ArrowRight}", does: "nothing" },
            { key: "{ArrowUp}", does: "nothing" },
            { key: "{ArrowDown}", does: "nothing" },
        ];
        it.each(arrows)("$key: $does", async (key) => {
            await pressAndCheck(component, key, dir);
        });
    });
});
