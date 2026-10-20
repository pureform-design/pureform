// Named themes (design doc §5.6), for every component on every target: a provider's `theme`
// writes the registry's `themeAttributes(theme)`, the target's own scope, on its element, and the
// component under it draws exactly as under that attribute set by hand, which is how an app
// without a provider applies a theme. The teal theme recolors, so it must change what's drawn.
// A runtime theme from teal's seed draws teal's colors, in both schemes.

import { preloadTheme } from "@pureform/styling";
import { afterAll, describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";
import { registry } from "#registry";

import { byTestId, COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import type { Mounted } from "./harness/harness";
import { hostIn, mountCase } from "./harness/page";
import { countedSeedTheme } from "./harness/themes";

// The emulated scheme belongs to the page, which later test files reuse: put it back, or a file
// that reads the page's colors (axe's contrast) runs in the dark scheme.
afterAll(() => commands.emulateColorScheme("light"));

/** The config's named themes. */
const THEMES = ["teal", "sharp", "dense"] as const;

/** What a theme can change in a part: colors, shape, and size. */
const DRAWN = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderTopWidth",
    "borderTopLeftRadius",
    "outlineColor",
    "width",
    "height",
] as const;

/** Every part's drawn styles, by part name, for a mounted scene, which then leaves the page. Scenes
 *  are measured one at a time in the same place, so the pointer (which may rest on it) is over
 *  each alike. */
const drawn = async (component: ComponentCase, scene: Mounted) => {
    await harness.settle();
    const root = byTestId(scene.host, component.root);
    const styles = Object.fromEntries(
        [root, ...root.querySelectorAll<HTMLElement>("[data-pf-part]")].map(
            (part) => {
                const style = getComputedStyle(part);
                return [
                    part.dataset.pfPart ?? "root",
                    Object.fromEntries(DRAWN.map((key) => [key, style[key]])),
                ];
            },
        ),
    );
    // Off the page; the scene itself unmounts after the test.
    document.body.innerHTML = "";
    return styles;
};

/** The attributes as markup: `data-theme="teal"`. */
const markup = (attributes: Readonly<Record<string, string>>) =>
    Object.entries(attributes)
        .map(([name, value]) => `${name}="${value}"`)
        .join(" ");

/** A host the pointer can't hover, so a state layer can't tint one scene and not another. */
const unhovered = () =>
    hostIn(`<div style="pointer-events: none"><div data-host></div></div>`);

describe("themeAttributes", () => {
    it.each(THEMES)("scopes %s by the target's attribute", (theme) => {
        const attributes = registry.themeAttributes(theme);
        expect(registry.themeAttribute).toBeTypeOf("string");
        expect(attributes).toEqual({ [registry.themeAttribute!]: theme });
        expect(registry.themeAttributes(undefined)).toEqual({});
    });
});

describe.each(COMPONENTS)("$component", (component) => {
    describe.each(THEMES)("%s", (theme) => {
        it("is written on the provider's element", async () => {
            const { host } = mountCase(component, component.themedProps ?? {}, {
                provider: { theme },
            });
            await harness.settle();
            const provider = host.firstElementChild!;
            for (const [name, value] of Object.entries(
                registry.themeAttributes(theme),
            )) {
                expect(provider.getAttribute(name)).toBe(value);
            }
        });

        // Neither scene can be hovered: a wide component (a slider) lies under wherever the
        // pointer rests, and its state layer's color would be measured mid-transition.
        it("draws as under the attribute set by hand", async () => {
            const provided = await drawn(
                component,
                mountCase(component, component.themedProps ?? {}, {
                    host: unhovered(),
                    provider: { theme },
                }),
            );
            const byHand = await drawn(
                component,
                mountCase(component, component.themedProps ?? {}, {
                    host: hostIn(
                        `<div style="pointer-events: none" ${markup(registry.themeAttributes(theme))}><div data-host></div></div>`,
                    ),
                }),
            );
            expect(provided).toEqual(byHand);
        });
    });

    it.skipIf(component.themed === false)(
        "draws differently in teal than in the base theme",
        async () => {
            const base = await drawn(
                component,
                mountCase(component, component.themedProps ?? {}),
            );
            const teal = await drawn(
                component,
                mountCase(component, component.themedProps ?? {}, {
                    provider: { theme: "teal" },
                }),
            );
            expect(teal).not.toEqual(base);
        },
    );
});

/** The colors a part draws, of what `drawn` measures. */
const COLORS = ["color", "backgroundColor", "borderTopColor", "outlineColor"];

const colorsOf = (styles: Record<string, Record<string, string>>) =>
    Object.fromEntries(
        Object.entries(styles).map(([part, style]) => [
            part,
            Object.fromEntries(COLORS.map((key) => [key, style[key]])),
        ]),
    );

// A component the scheme doesn't color draws the same under any theme.
describe.each(COMPONENTS.filter((component) => component.themed !== false))(
    "$component, a runtime theme",
    (component) => {
        it.each(["light", "dark"] as const)(
            "from teal's seed draws teal's colors in the %s scheme",
            async (scheme) => {
                await commands.emulateColorScheme(scheme);
                await preloadTheme(countedSeedTheme({ seed: "#006A60" }));
                try {
                    const scene = mountCase(
                        component,
                        component.themedProps ?? {},
                        { host: unhovered(), provider: { seed: "#006A60" } },
                    );
                    const scope = scene.host.firstElementChild!.getAttribute(
                        registry.themeAttribute ?? "data-theme",
                    );
                    await vi.waitFor(() =>
                        expect(
                            [...document.head.querySelectorAll("style")].some(
                                (style) =>
                                    style.textContent?.includes(`"${scope}"]`),
                            ),
                        ).toBe(true),
                    );
                    const runtime = colorsOf(await drawn(component, scene));
                    const teal = colorsOf(
                        await drawn(
                            component,
                            mountCase(component, component.themedProps ?? {}, {
                                host: unhovered(),
                                provider: { theme: "teal" },
                            }),
                        ),
                    );
                    const base = colorsOf(
                        await drawn(
                            component,
                            mountCase(component, component.themedProps ?? {}, {
                                host: unhovered(),
                            }),
                        ),
                    );
                    expect(runtime).toEqual(teal);
                    expect(runtime).not.toEqual(base);
                } finally {
                    await commands.emulateColorScheme("light");
                }
            },
        );
    },
);
