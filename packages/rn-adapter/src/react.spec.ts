import { pureform } from "@pureform/preset";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { precompute, runtimeStyles } from "./build";
import {
    PureformProvider,
    pressableState,
    useRecipe,
    useTokens,
} from "./react";
import type { Overrides, Styles } from "./resolve";
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
        overrides?: Overrides;
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

    it("give the theme's tokens, with overrides", () => {
        const Probe = () =>
            createElement("i", null, String(useTokens()["colors.primary"]));
        const html = renderToString(
            createElement(
                PureformProvider,
                {
                    styles: precomputed,
                    scheme: "light",
                    overrides: { "colors.primary": "rgba(255, 0, 0, 1)" },
                },
                createElement(Probe),
            ),
        );
        expect(html).toBe("<i>rgba(255, 0, 0, 1)</i>");
    });

    it("take overrides per scheme", () => {
        const overrides = {
            light: { "colors.primary": "rgba(200, 0, 0, 1)" },
            dark: { "colors.primary": "rgba(0, 0, 200, 1)" },
        };
        expect(
            rootStyle({ styles: precomputed, scheme: "light", overrides })
                .backgroundColor,
        ).toBe("rgba(200, 0, 0, 1)");
        expect(
            rootStyle({ styles: precomputed, scheme: "dark", overrides })
                .backgroundColor,
        ).toBe("rgba(0, 0, 200, 1)");
    });

    it("give one instance its own token values", () => {
        const styles = precompute(config, {
            components: ["linearProgress"],
            schemes: ["light"],
        });
        const Probe = (props: { value: number }) =>
            createElement(
                "i",
                null,
                String(
                    useRecipe(
                        "linearProgress",
                        {},
                        {},
                        {
                            "components.linearProgress.value": props.value,
                        },
                    ).indicator!.width,
                ),
            );
        const html = renderToString(
            createElement(
                PureformProvider,
                { styles, scheme: "light" },
                createElement(Probe, { value: 40 }),
                createElement(Probe, { value: 75 }),
            ),
        );
        expect(html).toBe("<i>40%</i><i>75%</i>");
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
