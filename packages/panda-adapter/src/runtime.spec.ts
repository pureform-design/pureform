import {
    alias,
    fontFamily,
    hex,
    numeric,
    pct,
    px,
    when,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { themeVars } from "./runtime";

const config: CoreConfig = {
    tokens: {
        colors: { violetLight: hex("#7c3aed"), violetDark: hex("#c4b5fd") },
        radii: { extraLarge: px(28) },
        opacity: { stateHover: pct(8) },
    },
    semanticTokens: {
        colors: {
            primary: when(
                "dark",
                alias("tokens", "colors", "violetDark"),
                alias("tokens", "colors", "violetLight"),
            ),
            brand: alias("semanticTokens", "colors", "primary"),
        },
    },
    fonts: { plain: fontFamily(["Inter"], "sans-serif") },
    durations: { medium2: numeric(300, "ms") },
    components: {},
};

describe("themeVars", () => {
    it("names each token's var as Panda does", () => {
        expect(themeVars(config)).toMatchObject({
            "--colors-violet-light": "rgb(124 58 237)",
            "--radii-extra-large": "28px",
            "--opacity-state-hover": "8%",
            "--fonts-plain": expect.stringContaining("Inter"),
            "--durations-medium2": "300ms",
        });
    });

    it("spells references as vars so they follow overrides", () => {
        expect(themeVars(config)["--colors-brand"]).toBe(
            "var(--colors-primary)",
        );
    });

    it("leaves scheme-dependent tokens to Panda's own rules", () => {
        expect(themeVars(config)).not.toHaveProperty("--colors-primary");
    });

    it("applies Panda's prefix", () => {
        expect(themeVars(config, { tokenPrefix: "x" })).toMatchObject({
            "--x-radii-extra-large": "28px",
            "--x-colors-brand": "var(--x-colors-primary)",
        });
    });
});
