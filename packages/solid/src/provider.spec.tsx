import { testIds } from "@pureform/anatomy";
import {
    createWebRegistry,
    defineRuntimeTheme,
    themeScope,
} from "@pureform/styling-web";
import type { ThemeGenerator } from "@pureform/styling-web";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, flush, Loading } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import {
    PureformProvider,
    useClasses,
    useClassFactory,
    useDirection,
    useLazyClassFactory,
    useMotion,
    usePureform,
    useThemeVars,
} from ".";
import type { PureformProviderProps } from ".";
import { button, deferredLoader, fakeRegistry } from "./__fixtures__/registry";
import { Button } from "./button";
import { byTestId, mount, settle } from "./testing/mount";

const neverLoads = () => new Promise<never>(() => {});

describe("PureformProvider", () => {
    it("writes dir, and data-pf-motion only when it isn't system, on a display: contents element", () => {
        const host = mount(() => (
            <PureformProvider data-testid="outer" dir="rtl" motion="reduce">
                <PureformProvider data-testid="inner" motion="system">
                    <span />
                </PureformProvider>
            </PureformProvider>
        ));
        const outer = byTestId("outer");
        expect(outer.getAttribute("dir")).toBe("rtl");
        expect(outer.getAttribute("data-pf-motion")).toBe("reduce");
        expect(getComputedStyle(outer).display).toBe("contents");
        const inner = byTestId("inner");
        expect(inner.getAttribute("dir")).toBe("rtl");
        expect(inner.hasAttribute("data-pf-motion")).toBe(false);
        expect(host.querySelector("span")!.matches(":dir(rtl)")).toBe(true);
    });

    it("writes ltr at the root, and follows a changed prop", () => {
        const [dir, setDir] = createSignal<"ltr" | "rtl" | undefined>(
            undefined,
        );
        const [motion, setMotion] = createSignal<"full" | undefined>(undefined);
        mount(() => (
            <PureformProvider data-testid="p" dir={dir()} motion={motion()} />
        ));
        const element = byTestId("p");
        expect(element.getAttribute("dir")).toBe("ltr");
        setDir("rtl");
        setMotion("full");
        flush();
        expect(element.getAttribute("dir")).toBe("rtl");
        expect(element.getAttribute("data-pf-motion")).toBe("full");
    });

    it("writes its theme's attributes from the registry, and follows a changed theme", () => {
        const registry = createWebRegistry(
            { button },
            { themeAttribute: "data-theme" },
        );
        const [theme, setTheme] = createSignal<string | undefined>("teal");
        mount(() => (
            <PureformProvider
                data-testid="outer"
                registry={registry}
                theme={theme()}
            >
                <PureformProvider data-testid="inner" />
            </PureformProvider>
        ));
        const outer = byTestId("outer");
        expect(outer.getAttribute("data-theme")).toBe("teal");
        // An inherited theme's attribute is on the ancestor already.
        expect(byTestId("inner").hasAttribute("data-theme")).toBe(false);
        setTheme("sharp");
        flush();
        expect(outer.getAttribute("data-theme")).toBe("sharp");
        setTheme(undefined);
        flush();
        expect(outer.hasAttribute("data-theme")).toBe(false);
    });

    it("gives components the settings in effect, inherited through nested providers", () => {
        const seen: unknown[] = [];
        function Probe() {
            const state = usePureform();
            const dir = useDirection();
            const motion = useMotion();
            seen.push([dir(), motion(), state().theme]);
            return null;
        }
        mount(() => (
            <>
                <Probe />
                <PureformProvider dir="rtl" motion="reduce" theme="teal">
                    <PureformProvider motion="system">
                        <Probe />
                    </PureformProvider>
                    <PureformProvider motion="full" dir="ltr">
                        <Probe />
                    </PureformProvider>
                </PureformProvider>
            </>
        ));
        expect(seen).toEqual([
            ["ltr", "system", undefined],
            ["rtl", "reduce", "teal"],
            ["ltr", "full", "teal"],
        ]);
    });

    it("updates a component for the settings it reads, not for the others", () => {
        const [dir, setDir] = createSignal<"ltr" | "rtl">("ltr");
        const [motion, setMotion] = createSignal<"system" | "reduce">("system");
        const [theme, setTheme] = createSignal<string | undefined>(undefined);
        const [overrides, setOverrides] = createSignal({ "--a": "1" });
        const runs = { dir: 0, motion: 0, overrides: 0 };
        function Probe() {
            const state = usePureform();
            // oxlint-disable-next-line solid/reactivity -- probe memo: its runs are counted, its value is never read
            createMemo(() => {
                runs.dir++;
                return state().dir;
            });
            // oxlint-disable-next-line solid/reactivity -- probe memo: its runs are counted, its value is never read
            createMemo(() => {
                runs.motion++;
                return state().motion;
            });
            // oxlint-disable-next-line solid/reactivity -- probe memo: its runs are counted, its value is never read
            createMemo(() => {
                runs.overrides++;
                return state().overrides;
            });
            return null;
        }
        mount(() => (
            <PureformProvider dir={dir()} motion={motion()} theme={theme()}>
                <PureformProvider overrides={overrides()}>
                    <Probe />
                </PureformProvider>
            </PureformProvider>
        ));
        expect(runs).toEqual({ dir: 1, motion: 1, overrides: 1 });
        setMotion("reduce");
        flush();
        expect(runs).toEqual({ dir: 1, motion: 2, overrides: 1 });
        setDir("rtl");
        flush();
        expect(runs).toEqual({ dir: 2, motion: 2, overrides: 1 });
        setTheme("teal");
        flush();
        expect(runs).toEqual({ dir: 2, motion: 2, overrides: 1 });
        // The same overrides again, in a new object.
        setOverrides({ "--a": "1" });
        flush();
        expect(runs).toEqual({ dir: 2, motion: 2, overrides: 1 });
        setOverrides({ "--a": "2" });
        flush();
        expect(runs).toEqual({ dir: 2, motion: 2, overrides: 2 });
    });

    it("keeps the user's style and attributes on its element", () => {
        mount(() => (
            <PureformProvider
                data-testid="p"
                class="app"
                style={{ display: "block", color: "red" }}
            />
        ));
        const element = byTestId("p");
        expect(element.className).toBe("app");
        expect(element.style.display).toBe("block");
        expect(element.style.color).toBe("red");
    });

    it("writes its own token overrides as vars in its style", () => {
        const registry = createWebRegistry(
            { button },
            { vars: { prefix: "pf" } },
        );
        mount(() => (
            <PureformProvider
                data-testid="p"
                registry={registry}
                overrides={{
                    "colors.primary": "rgb(0, 106, 96)",
                    "components.button.container": "red",
                }}
                style={{ color: "blue" }}
            >
                <PureformProvider data-testid="inner" />
            </PureformProvider>
        ));
        const element = byTestId("p");
        expect(element.style.getPropertyValue("--colors-primary")).toBe(
            "rgb(0, 106, 96)",
        );
        expect(
            element.style.getPropertyValue("--pf-components-button-container"),
        ).toBe("red");
        expect(element.style.color).toBe("blue");
        // Inherited overrides reach the inner provider through the cascade.
        expect(byTestId("inner").getAttribute("style")).toBe(
            "display: contents;",
        );
        expect(
            getComputedStyle(byTestId("inner")).getPropertyValue(
                "--colors-primary",
            ),
        ).toBe("rgb(0, 106, 96)");
    });

    describe("with a runtime theme", () => {
        type Seed = { seed: string };
        const generate: ThemeGenerator<Seed> = (input) => ({
            light: { "--colors-primary": input.seed },
            dark: { "--colors-primary": "black" },
        });
        const registry = createWebRegistry(
            { button },
            { themeAttribute: "data-theme" },
        );
        const blocks = () =>
            document.head.querySelectorAll("style[data-pf-theme]");

        it("scopes it by its hash and writes its block once the generator loads", async () => {
            let release!: () => void;
            const loading = new Promise<void>((resolve) => (release = resolve));
            const seedTheme = defineRuntimeTheme<Seed>("seed", async () => {
                await loading;
                return generate;
            });
            const theme = seedTheme({ seed: "rgb(0, 106, 96)" });
            const scope = themeScope(theme);
            mount(() => (
                <PureformProvider
                    data-testid="p"
                    registry={registry}
                    theme={theme}
                >
                    <span data-testid="child" />
                </PureformProvider>
            ));
            expect(byTestId("p").getAttribute("data-theme")).toBe(scope);
            await settle();
            expect(blocks()).toHaveLength(0);
            release();
            await settle();
            await settle();
            expect(blocks()).toHaveLength(1);
            expect(blocks()[0]!.getAttribute("data-pf-theme")).toBe(scope);
            expect(blocks()[0]!.textContent).toContain(
                `[data-theme="${scope}"]`,
            );
            expect(
                getComputedStyle(byTestId("child")).getPropertyValue(
                    "--colors-primary",
                ),
            ).toBe("rgb(0, 106, 96)");
        });

        it("shares one block between providers, follows a changed theme, and gives its vars", async () => {
            const warn = vi.spyOn(console, "warn");
            const seedTheme = defineRuntimeTheme<Seed>("seed", () => generate);
            const [seed, setSeed] = createSignal("rgb(1, 2, 3)");
            function Probe() {
                const vars = useThemeVars();
                return (
                    <span data-testid="probe">
                        {vars()?.light["--colors-primary"]}
                    </span>
                );
            }
            mount(() => (
                <PureformProvider
                    registry={registry}
                    theme={seedTheme({ seed: seed() })}
                >
                    <PureformProvider theme={seedTheme({ seed: seed() })}>
                        <Probe />
                    </PureformProvider>
                </PureformProvider>
            ));
            await settle();
            await settle();
            expect(blocks()).toHaveLength(1);
            expect(byTestId("probe").textContent).toBe("rgb(1, 2, 3)");
            setSeed("rgb(4, 5, 6)");
            flush();
            await settle();
            await settle();
            expect(blocks()).toHaveLength(1);
            expect(blocks()[0]!.textContent).toContain("rgb(4, 5, 6)");
            expect(byTestId("probe").textContent).toBe("rgb(4, 5, 6)");
            expect(blocks()[0]!.getAttribute("data-pf-theme")).toBe(
                themeScope(seedTheme({ seed: "rgb(4, 5, 6)" })),
            );
            // The theme prop is read where it's tracked, not in the effect's callback.
            expect(
                warn.mock.calls.filter(([message]) =>
                    String(message).includes("STRICT_READ_UNTRACKED"),
                ),
            ).toEqual([]);
            warn.mockRestore();
        });
    });
});

describe("PureformProvider runs", () => {
    type Options = Omit<PureformProviderProps, "registry" | "children">;
    const seedTheme = defineRuntimeTheme<{ seed: string }>(
        "seed-runs",
        () => (input) => ({
            light: { "--colors-primary": input.seed },
            dark: { "--colors-primary": "black" },
        }),
    );
    const OUTER: Options = {
        defaults: { button: { size: "large" } },
        slotProps: { button: { label: { class: "outer" } } },
    };
    const INNER: Options = {
        defaults: { button: { variant: "text" } },
        slotProps: { button: { label: { class: "inner" } } },
    };

    // Two providers whose options each come from one signal, so every option is read again when
    // any changes, around buttons whose class factory counts its calls, a probe reading the slot
    // props, and a `usePureform()` probe.
    const setup = (outer: Options, inner: Options) => {
        const runs = { classes: 0, slotProps: 0 };
        const counted: typeof button = (selection) => {
            runs.classes++;
            return button(selection);
        };
        const registry = createWebRegistry(
            { button: counted },
            { themeAttribute: "data-theme", vars: { prefix: "pf" } },
        );
        const [outerOptions, setOuter] = createSignal(outer);
        const [innerOptions, setInner] = createSignal(inner);
        const seen: [unknown, unknown][] = [];
        function Probe() {
            const state = usePureform();
            // oxlint-disable-next-line solid/reactivity -- probe memo: its runs are counted, its value is never read
            createMemo(() => {
                runs.slotProps++;
                return state().slotProps;
            });
            // oxlint-disable-next-line solid/reactivity -- probe memo: its runs are counted, its value is never read
            createMemo(() => {
                seen.push([state().theme, state().overrides]);
            });
            return null;
        }
        const provider = (
            options: () => Options,
            children: () => JSX.Element,
        ) => (
            <PureformProvider
                defaults={options().defaults}
                slotProps={options().slotProps}
                theme={options().theme}
                overrides={options().overrides}
                hydrate={options().hydrate}
            >
                {children()}
            </PureformProvider>
        );
        mount(() => (
            <PureformProvider registry={registry}>
                {provider(outerOptions, () =>
                    provider(innerOptions, () => (
                        <>
                            <Button label="Save" />
                            <Button label="Send" />
                            <Probe />
                        </>
                    )),
                )}
            </PureformProvider>
        ));
        const change = async (
            set: (options: Options) => void,
            base: Options,
            options: Options,
        ) => {
            set({ ...base, ...options });
            await settle();
        };
        return {
            runs,
            seen,
            outer: (options: Options) => change(setOuter, outer, options),
            inner: (options: Options) => change(setInner, inner, options),
        };
    };

    it("doesn't run components again for a theme, seed theme, overrides, or hydrate change, with defaults and slot props merged over a parent's", async () => {
        const { runs, seen, outer, inner } = setup(OUTER, INNER);
        await settle();
        const mounted = { ...runs };
        expect(mounted.classes).toBeGreaterThan(0);
        const overrides = { "colors.primary": "red" };
        for (const change of [inner, outer]) {
            await change({ theme: "teal" });
            await change({ theme: seedTheme({ seed: "rgb(1, 2, 3)" }) });
            await settle();
            await change({ theme: seedTheme({ seed: "rgb(4, 5, 6)" }) });
            await settle();
            await change({ overrides });
            await change({ overrides, hydrate: "regenerate" });
        }
        expect(runs).toEqual(mounted);
        // `usePureform()` still sees every change.
        expect(seen.map(([theme]) => theme)).toContain("teal");
        expect(seen.at(-1)).toEqual([undefined, overrides]);
        expect(byTestId(testIds.button.root).className).toBe(
            "button button--text button--large",
        );
        expect(byTestId(testIds.button.label).className).toBe(
            "button__label outer inner",
        );
    });

    it("runs components again for the defaults and slot props they read", async () => {
        const { runs, outer, inner } = setup(OUTER, INNER);
        await settle();
        let before = { ...runs };
        await outer({ defaults: { button: { size: "small" } } });
        expect(runs.classes).toBeGreaterThan(before.classes);
        expect(byTestId(testIds.button.root).className).toBe(
            "button button--text button--small",
        );
        before = { ...runs };
        await inner({ slotProps: { button: { label: { class: "caps" } } } });
        expect(runs.slotProps).toBeGreaterThan(before.slotProps);
        expect(byTestId(testIds.button.label).className).toBe(
            "button__label outer caps",
        );
    });

    it("combines nested themes and overrides as before: the inner theme wins, the outer overrides reach it", async () => {
        const { runs, seen, outer } = setup(OUTER, {
            ...INNER,
            theme: "sharp",
        });
        await settle();
        const mounted = { ...runs };
        await outer({ theme: "teal", overrides: { "colors.primary": "red" } });
        expect(runs).toEqual(mounted);
        expect(seen.at(-1)).toEqual(["sharp", { "colors.primary": "red" }]);
        expect(
            getComputedStyle(byTestId(testIds.button.root)).getPropertyValue(
                "--colors-primary",
            ),
        ).toBe("red");
    });
});

function ButtonClasses(props: {
    variant?: "filled" | "text" | undefined;
    radius?: string;
}) {
    const classes = useClasses("button", () => ({
        variant: props.variant,
        tokens: { radius: props.radius },
    }));
    return (
        <span
            data-testid="button"
            class={classes().root!.class}
            style={classes().root!.style}
        >
            {classes().label!.class}
        </span>
    );
}

describe("useClasses", () => {
    it("reads a static entry synchronously, over the provider's defaults", () => {
        const [variant, setVariant] = createSignal<
            "filled" | "text" | undefined
        >(undefined);
        mount(() => (
            <PureformProvider
                registry={fakeRegistry(neverLoads)}
                defaults={{ button: { variant: "text", size: "large" } }}
            >
                <ButtonClasses variant={variant()} radius="4px" />
            </PureformProvider>
        ));
        const element = byTestId("button");
        expect(element.className).toBe("button button--text button--large");
        expect(element.textContent).toBe("button__label");
        expect(element.style.getPropertyValue("--pf-button-radius")).toBe(
            "4px",
        );

        setVariant("filled");
        flush();
        expect(element.className).toBe("button button--filled button--large");
    });

    it("waits for a lazy entry under <Loading>, then follows the selection", async () => {
        const { loader, lazy } = deferredLoader();
        const [variant, setVariant] = createSignal<"assist" | "filter">(
            "assist",
        );
        function Chip() {
            const classes = useClasses<string>("chip", () => ({
                variant: variant(),
            }));
            return <span data-testid="chip" class={classes().root!.class} />;
        }
        const host = mount(() => (
            <PureformProvider registry={fakeRegistry(lazy)}>
                <Loading fallback={<em>loading</em>}>
                    <Chip />
                </Loading>
            </PureformProvider>
        ));
        expect(host.textContent).toBe("loading");
        expect(loader.calls).toBe(1);

        loader.resolve();
        await settle();
        await settle();
        expect(byTestId("chip").className).toBe("chip chip--assist");

        setVariant("filter");
        await settle();
        expect(byTestId("chip").className).toBe("chip chip--filter");
        expect(loader.calls).toBe(1);
    });

    it("names what's missing without a registry", () => {
        mount(() => (
            <Errored
                fallback={(error) => (
                    <p data-testid="error">{String(error())}</p>
                )}
            >
                <ButtonClasses />
            </Errored>
        ));
        expect(byTestId("error").textContent).toMatch(
            /PureformProvider registry/,
        );
    });
});

describe("useClassFactory", () => {
    it("returns a static entry's factory", () => {
        let classes = "";
        function Probe() {
            const factory = useClassFactory<string>("button");
            classes = factory({ variant: "text" }).root!.class;
            return null;
        }
        mount(() => (
            <PureformProvider registry={fakeRegistry(neverLoads)}>
                <Probe />
            </PureformProvider>
        ));
        expect(classes).toBe("button button--text button--small");
    });

    it("refuses a lazy entry", () => {
        function Probe() {
            useClassFactory<string>("chip");
            return null;
        }
        mount(() => (
            <PureformProvider registry={fakeRegistry(neverLoads)}>
                <Errored
                    fallback={(error) => (
                        <p data-testid="error">{String(error())}</p>
                    )}
                >
                    <Probe />
                </Errored>
            </PureformProvider>
        ));
        expect(byTestId("error").textContent).toMatch(
            /useLazyClassFactory\("chip"\)/,
        );
    });
});

describe("useLazyClassFactory", () => {
    it("loads a lazy entry's factory on the client", async () => {
        const { loader, lazy } = deferredLoader();
        function Probe() {
            const factory = useLazyClassFactory<string>("chip");
            return (
                <span data-testid="chip">
                    {factory()({ variant: "filter" }).root!.class}
                </span>
            );
        }
        const host = mount(() => (
            <PureformProvider registry={fakeRegistry(lazy)}>
                <Loading fallback={<em>loading</em>}>
                    <Probe />
                </Loading>
            </PureformProvider>
        ));
        expect(host.textContent).toBe("loading");
        loader.resolve();
        await settle();
        await settle();
        expect(byTestId("chip").textContent).toBe("chip chip--filter");
    });

    it("gives a static entry's factory at once", () => {
        let classes = "";
        function Probe() {
            const factory = useLazyClassFactory<string>("button");
            classes = factory()({}).root!.class;
            return null;
        }
        mount(() => (
            <PureformProvider registry={fakeRegistry(neverLoads)}>
                <Probe />
            </PureformProvider>
        ));
        expect(classes).toBe("button button--filled button--small");
    });
});
