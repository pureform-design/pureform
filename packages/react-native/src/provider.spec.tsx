import type { ReactElement } from "react";
import { I18nManager } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import {
    PureformProvider,
    useDirection,
    useEngine,
    useMotion,
    usePureform,
    useReducedMotion,
    useStyles,
    useTokens,
} from ".";
import { reanimated } from "./engines/reanimated";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["button", "switchControl"]);
});

// Renders what a hook gives as JSON, under the providers given.
const read = async (
    hook: () => unknown,
    wrap: (node: ReactElement) => ReactElement,
) => {
    function Probe() {
        return <pre data-testid="probe">{JSON.stringify(hook())}</pre>;
    }
    await mount(wrap(<Probe />));
    const probes = document.querySelectorAll('[data-testid="probe"]');
    return JSON.parse(probes[probes.length - 1]!.textContent!) as unknown;
};

describe("PureformProvider", () => {
    it("takes the direction from I18nManager at the root, and inherits a provider's", async () => {
        expect(
            await read(useDirection, (node) => (
                <PureformProvider registry={registry}>{node}</PureformProvider>
            )),
        ).toBe(I18nManager.isRTL ? "rtl" : "ltr");
        expect(
            await read(useDirection, (node) => (
                <PureformProvider registry={registry} dir="rtl">
                    <PureformProvider>{node}</PureformProvider>
                </PureformProvider>
            )),
        ).toBe("rtl");
    });

    it("selects the styles under rtl in a right to left provider", async () => {
        const handle = (dir: "ltr" | "rtl") =>
            read(
                () =>
                    useStyles("switchControl", { checked: true }).handle!.style
                        .transform,
                (node) => (
                    <PureformProvider registry={registry} dir={dir}>
                        {node}
                    </PureformProvider>
                ),
            );
        const ltr = await handle("ltr");
        const rtl = await handle("rtl");
        expect(rtl).not.toEqual(ltr);
        expect(rtl).toEqual(
            registry.entry("switchControl").factory({
                checked: true,
                rtl: true,
            }).handle!.style.transform,
        );
    });

    it("follows the system's reduce motion setting, unless a provider says otherwise", async () => {
        await commands.emulateReducedMotion("reduce");
        try {
            const reduced = (motion?: "reduce" | "full") =>
                read(useReducedMotion, (node) => (
                    <PureformProvider registry={registry}>
                        <PureformProvider motion={motion}>
                            {node}
                        </PureformProvider>
                    </PureformProvider>
                ));
            await settle(20);
            expect(await reduced()).toBe(true);
            expect(await reduced("full")).toBe(false);
            expect(
                await read(useMotion, (node) => (
                    <PureformProvider motion="reduce">
                        <PureformProvider motion="system">
                            {node}
                        </PureformProvider>
                    </PureformProvider>
                )),
            ).toBe("reduce");
        } finally {
            await commands.emulateReducedMotion("no-preference");
        }
        expect(
            await read(useReducedMotion, (node) => (
                <PureformProvider registry={registry}>{node}</PureformProvider>
            )),
        ).toBe(false);
    });

    it("merges overrides over the outer provider's, per scheme", async () => {
        const tokens = (scheme: "light" | "dark") =>
            read(
                () => {
                    const t = useTokens();
                    return [t["colors.primary"], t["colors.secondary"]];
                },
                (node) => (
                    <PureformProvider
                        registry={registry}
                        scheme={scheme}
                        overrides={{
                            light: { "colors.primary": "rgba(1, 2, 3, 1)" },
                            dark: { "colors.primary": "rgba(4, 5, 6, 1)" },
                        }}
                    >
                        <PureformProvider
                            overrides={{
                                "colors.secondary": "rgba(7, 8, 9, 1)",
                            }}
                        >
                            {node}
                        </PureformProvider>
                    </PureformProvider>
                ),
            );
        expect(await tokens("light")).toEqual([
            "rgba(1, 2, 3, 1)",
            "rgba(7, 8, 9, 1)",
        ]);
        expect(await tokens("dark")).toEqual([
            "rgba(4, 5, 6, 1)",
            "rgba(7, 8, 9, 1)",
        ]);
    });

    it("inherits the scheme, theme, engine, and width", async () => {
        expect(
            await read(
                () => {
                    const state = usePureform();
                    return [
                        state.scheme,
                        state.theme,
                        useEngine().name,
                        state.width,
                    ];
                },
                (node) => (
                    <PureformProvider
                        registry={registry}
                        scheme="dark"
                        theme="teal"
                        engine={reanimated}
                        width={500}
                    >
                        <PureformProvider>{node}</PureformProvider>
                    </PureformProvider>
                ),
            ),
        ).toEqual(["dark", "teal", "reanimated", 500]);
    });

    it("rejects runtime themes, which are web only", async () => {
        const runtime = { source: {}, input: {} } as never;
        await expect(
            read(useDirection, (node) => (
                <PureformProvider registry={registry} theme={runtime}>
                    {node}
                </PureformProvider>
            )),
        ).rejects.toThrow(/web only/);
    });
});
