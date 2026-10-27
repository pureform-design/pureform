import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as navigation from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineCallback, MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const VALUES = ["home", "search", "settings"];

/** A navigation with a button per destination, run with `props`. */
const nav = (
    props: MachineProps<navigation.Schema>,
    disabled: readonly string[] = [],
) => {
    const host = document.createElement("nav");
    host.innerHTML = VALUES.map(
        (value) =>
            `<button type="button" data-item="${value}">${value}</button>`,
    ).join("");
    document.body.append(host);
    const item = (value: string) =>
        host.querySelector<HTMLButtonElement>(`[data-item="${value}"]`)!;
    const running = run(
        navigation.machine,
        navigation.connect,
        { id: "nav", ...props },
        (api, spread) => {
            spread(host, api.getRootProps());
            for (const value of VALUES) {
                spread(
                    item(value),
                    api.getItemProps({
                        value,
                        disabled: disabled.includes(value),
                    }),
                );
            }
        },
    );
    return { ...running, host, item };
};

describe("navigation machine", () => {
    it("names the rail's header part, in the component's direction", () => {
        const { api, stop } = nav({ dir: "rtl" });
        expect(api().getHeaderProps()).toMatchObject({
            "data-scope": "navigation",
            "data-part": "header",
            dir: "rtl",
        });
        stop();
    });

    it("names the rail's section label part", () => {
        const { api, stop } = nav({ dir: "rtl" });
        expect(api().getSectionLabelProps()).toMatchObject({
            "data-scope": "navigation",
            "data-part": "section-label",
            dir: "rtl",
        });
        stop();
    });

    it("marks the current destination with aria-current", () => {
        const { item, stop } = nav({ defaultValue: "search" });
        expect(item("search").getAttribute("aria-current")).toBe("page");
        expect(item("home").hasAttribute("aria-current")).toBe(false);
        stop();
    });

    it("moves to the destination clicked and reports it once", async () => {
        const onValueChange =
            vi.fn<MachineCallback<navigation.Schema, "onValueChange">>();
        const { api, item, stop } = nav({
            defaultValue: "home",
            onValueChange,
        });
        await userEvent.click(item("settings"));
        await settle();
        expect(api().value).toBe("settings");
        expect(item("settings").getAttribute("aria-current")).toBe("page");
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "settings",
        });
        stop();
    });

    it("asks when controlled, and moves only with the prop", async () => {
        const onValueChange =
            vi.fn<MachineCallback<navigation.Schema, "onValueChange">>();
        const { api, item, setProps, stop } = nav({
            value: "home",
            onValueChange,
        });
        await userEvent.click(item("search"));
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "search",
        });
        expect(api().value).toBe("home");
        setProps({ id: "nav", value: "search", onValueChange });
        await settle();
        expect(api().value).toBe("search");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        stop();
    });

    it("ignores a disabled destination, and every one when disabled", async () => {
        const onValueChange =
            vi.fn<MachineCallback<navigation.Schema, "onValueChange">>();
        const one = nav({ defaultValue: "home", onValueChange }, ["search"]);
        expect(one.item("search").getAttribute("aria-disabled")).toBe("true");
        // The browser's click: `aria-disabled` keeps Playwright from clicking it.
        one.item("search").click();
        await settle();
        expect(one.api().value).toBe("home");
        one.stop();
        document.body.innerHTML = "";

        const all = nav({
            defaultValue: "home",
            disabled: true,
            onValueChange,
        });
        expect(all.host.hasAttribute("data-disabled")).toBe(true);
        all.item("settings").click();
        await settle();
        expect(all.api().value).toBe("home");
        expect(onValueChange).not.toHaveBeenCalled();
        all.stop();
    });

    it("says what kind of current destination it is", () => {
        const { api, stop } = nav({ defaultValue: "home" });
        expect(
            api().getItemProps({ value: "home", current: "true" }),
        ).toMatchObject({ "aria-current": "true" });
        expect(api().getItemState({ value: "home" })).toEqual({
            current: true,
            disabled: false,
        });
        stop();
    });
});
