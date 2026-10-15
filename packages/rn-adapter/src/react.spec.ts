import { pureform } from "@pureform/preset";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { precompute, runtimeStyles } from "./build";
import { PureformProvider, pressableState, useRecipe } from "./react";
import type { Styles } from "./resolve";
import type { State } from "./select";

const config = pureform();
const options = { components: ["button"], schemes: ["light", "dark"] as const };
const precomputed = precompute(config, {
    ...options,
    schemes: [...options.schemes],
});

// Render a button's root style as JSON through the provider and hook.
const rootStyle = (
    provider: {
        styles: Styles;
        scheme: "light" | "dark";
        overrides?: Record<string, string>;
    },
    state: State = {},
) => {
    const Probe = () =>
        createElement(
            "pre",
            null,
            JSON.stringify(
                useRecipe("button", { variant: "filled" }, state).root,
            ),
        );
    const html = renderToString(
        createElement(PureformProvider, provider, createElement(Probe)),
    );
    return JSON.parse(
        html.replace(/^<pre>|<\/pre>$/g, "").replaceAll("&quot;", '"'),
    ) as Record<string, unknown>;
};

describe("PureformProvider and useRecipe", () => {
    it("give a component's styles for the scheme", () => {
        const light = rootStyle({ styles: precomputed, scheme: "light" });
        const dark = rootStyle({ styles: precomputed, scheme: "dark" });
        expect(light.backgroundColor).toMatch(/^rgba\(/);
        expect(dark.backgroundColor).not.toBe(light.backgroundColor);
    });

    it("render the same from runtime styles", () => {
        const runtime = runtimeStyles(config, {
            ...options,
            schemes: [...options.schemes],
        });
        expect(rootStyle({ styles: runtime, scheme: "dark" })).toEqual(
            rootStyle({ styles: precomputed, scheme: "dark" }),
        );
    });

    it("apply overrides, and the state", () => {
        const overridden = rootStyle({
            styles: precomputed,
            scheme: "light",
            overrides: { "colors.primary": "rgba(200, 0, 0, 1)" },
        });
        expect(overridden.backgroundColor).toBe("rgba(200, 0, 0, 1)");
        const disabled = rootStyle(
            { styles: precomputed, scheme: "light" },
            { disabled: true },
        );
        expect(disabled.pointerEvents).toBe("none");
    });

    it("need a provider", () => {
        const Probe = () =>
            createElement("i", null, String(useRecipe("button")));
        expect(() => renderToString(createElement(Probe))).toThrow(
            "needs a PureformProvider",
        );
    });
});

describe("pressableState", () => {
    it("maps Pressable's state and keeps the component's own", () => {
        expect(
            pressableState(
                { pressed: true, hovered: false, focused: true },
                { checked: true },
            ),
        ).toEqual({
            checked: true,
            pressed: true,
            active: true,
            hover: false,
            focus: true,
            focusVisible: true,
        });
    });
});
