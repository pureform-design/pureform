import {
    createRegistry,
    defineRuntimeTheme,
    themeScope,
} from "@pureform/styling";
import type { ThemeGenerator } from "@pureform/styling";
import { afterEach, describe, expect, it } from "vitest";

import {
    initialThemeBlock,
    loadThemeVars,
    needsThemeLoad,
    overrideVars,
    serverThemeCss,
    themeCss,
    themeSelector,
} from "./web-theme";

type Seed = { seed: string };

const generate: ThemeGenerator<Seed> = (input, vars) => ({
    light: {
        [`--${vars.tokenPrefix ? `${vars.tokenPrefix}-` : ""}colors-primary`]:
            input.seed,
        "--colors-surface": "white",
    },
    dark: { "--colors-surface": "black" },
});

const registry = createRegistry(
    {},
    { themeAttribute: "data-theme", vars: { prefix: "pf" } },
);

describe("themeCss", () => {
    it("writes light vars under the selector and dark ones under the scheme conditions", () => {
        expect(
            themeCss(themeSelector("data-theme", "pf-1"), {
                light: { "--a": "1", "--b": "2" },
                dark: { "--b": "3" },
            }),
        ).toBe(
            [
                '[data-theme="pf-1"] {',
                "  --a: 1;",
                "  --b: 2;",
                "}",
                '.dark [data-theme="pf-1"] {',
                "  --b: 3;",
                "}",
                "@media (prefers-color-scheme: dark) {",
                '  :root:not(.light) [data-theme="pf-1"] {',
                "    --b: 3;",
                "  }",
                "}",
            ].join("\n"),
        );
    });

    it("leaves the scheme rules out when nothing differs in dark", () => {
        expect(themeCss("[x]", { light: { "--a": "1" }, dark: {} })).toBe(
            "[x] {\n  --a: 1;\n}",
        );
    });
});

describe("overrideVars", () => {
    it("names each override's var the way the target does", () => {
        expect(
            overrideVars(
                {
                    "colors.primary": "#006a60",
                    "components.button.container": "red",
                    "radii.full": 0,
                    "--brand": "blue",
                    nothing: "x",
                    "colors.secondary": undefined,
                },
                registry,
            ),
        ).toEqual({
            "--colors-primary": "#006a60",
            "--pf-components-button-container": "red",
            "--radii-full": "0",
            "--brand": "blue",
        });
    });

    it("gives undefined without overrides", () => {
        expect(overrideVars(undefined, registry)).toBeUndefined();
    });
});

describe("initialThemeBlock", () => {
    const fresh = () => defineRuntimeTheme<Seed>("seed", () => generate);

    it("generates on the server once the generator is loaded", async () => {
        const theme = fresh()({ seed: "#006a60" });
        const before = initialThemeBlock(theme, registry, {
            hydrate: "reuse",
            server: true,
        });
        expect(before).toEqual({
            scope: themeScope(theme),
            vars: undefined,
            css: undefined,
        });
        await theme.source.load();
        const after = initialThemeBlock(theme, registry, {
            hydrate: "reuse",
            server: true,
        });
        expect(after.vars).toEqual(generate(theme.input, registry.vars));
        expect(after.css).toContain(`[data-theme="${themeScope(theme)}"]`);
        expect(after.css).toContain("--colors-primary: #006a60;");
    });

    it("keeps the server's block when reusing, and generates nothing", async () => {
        const theme = fresh()({ seed: "#006a60" });
        await theme.source.load();
        const block = initialThemeBlock(theme, registry, {
            hydrate: "reuse",
            server: false,
            existing: () => "server css",
        });
        expect(block.vars).toBeUndefined();
        expect(block.css).toBe("server css");
        expect(needsThemeLoad(block, "reuse")).toBe(false);
    });

    it("generates again when regenerating", async () => {
        const theme = fresh()({ seed: "#006a60" });
        const unloaded = initialThemeBlock(theme, registry, {
            hydrate: "regenerate",
            server: false,
            existing: () => "server css",
        });
        expect(unloaded.css).toBe("server css");
        expect(needsThemeLoad(unloaded, "regenerate")).toBe(true);
        await theme.source.load();
        const loaded = initialThemeBlock(theme, registry, {
            hydrate: "regenerate",
            server: false,
            existing: () => "server css",
        });
        expect(loaded.vars).toBeDefined();
        expect(needsThemeLoad(loaded, "regenerate")).toBe(false);
    });

    it("loads when there's no block to keep", () => {
        const theme = fresh()({ seed: "#006a60" });
        const block = initialThemeBlock(theme, registry, {
            hydrate: "reuse",
            server: false,
            existing: () => undefined,
        });
        expect(needsThemeLoad(block, "reuse")).toBe(true);
    });

    it("names vars with the registry's prefixes", async () => {
        const theme = fresh()({ seed: "#006a60" });
        const prefixed = createRegistry({}, { vars: { tokenPrefix: "x" } });
        expect((await loadThemeVars(theme, prefixed)).light).toHaveProperty(
            "--x-colors-primary",
        );
    });
});

describe("serverThemeCss", () => {
    afterEach(() => {
        for (const style of document.querySelectorAll("style.test")) {
            style.remove();
        }
    });

    it("finds Solid's and React's blocks by scope", () => {
        expect(serverThemeCss("pf-a")).toBeUndefined();
        const solid = document.createElement("style");
        solid.className = "test";
        solid.setAttribute("data-pf-theme", "pf-a");
        solid.textContent = "a";
        const react = document.createElement("style");
        react.className = "test";
        react.setAttribute("data-href", "pf-b");
        react.textContent = "b";
        document.head.append(solid, react);
        expect(serverThemeCss("pf-a")).toBe("a");
        expect(serverThemeCss("pf-b")).toBe("b");
    });
});
