import { testIds } from "@pureform/anatomy";
import {
    createWebRegistry,
    defineRuntimeTheme,
    themeScope,
} from "@pureform/styling-web";
import type { ThemeGenerator } from "@pureform/styling-web";
import { screen } from "@testing-library/react";
import { type ComponentProps, type ReactNode, Suspense, useState } from "react";
import { describe, expect, it } from "vitest";

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
import {
    Errored,
    interact,
    mount,
    mountAsync,
    outside,
    quietly,
    settle,
} from "./testing/render";

const neverLoads = () => new Promise<never>(() => {});

describe("PureformProvider", () => {
    it("writes dir, and data-pf-motion only when it isn't system, on a display: contents element", () => {
        const host = mount(
            <PureformProvider data-testid="outer" dir="rtl" motion="reduce">
                <PureformProvider data-testid="inner" motion="system">
                    <span />
                </PureformProvider>
            </PureformProvider>,
        );
        const outer = screen.getByTestId("outer");
        expect(outer.getAttribute("dir")).toBe("rtl");
        expect(outer.getAttribute("data-pf-motion")).toBe("reduce");
        expect(getComputedStyle(outer).display).toBe("contents");
        const inner = screen.getByTestId("inner");
        expect(inner.getAttribute("dir")).toBe("rtl");
        expect(inner.hasAttribute("data-pf-motion")).toBe(false);
        expect(host.querySelector("span")!.matches(":dir(rtl)")).toBe(true);
    });

    it("writes ltr at the root, and follows a changed prop", async () => {
        let update!: () => void;
        function App() {
            const [changed, setChanged] = useState(false);
            update = () => setChanged(true);
            return (
                <PureformProvider
                    data-testid="p"
                    dir={changed ? "rtl" : undefined}
                    motion={changed ? "full" : undefined}
                />
            );
        }
        mount(<App />);
        const element = screen.getByTestId("p");
        expect(element.getAttribute("dir")).toBe("ltr");
        await interact(async () => update());
        expect(element.getAttribute("dir")).toBe("rtl");
        expect(element.getAttribute("data-pf-motion")).toBe("full");
    });

    it("writes its theme's attributes from the registry, and follows a changed theme", async () => {
        const registry = createWebRegistry(
            { button },
            { themeAttribute: "data-theme" },
        );
        let pick!: (theme: string | undefined) => void;
        function App() {
            const [theme, setTheme] = useState<string | undefined>("teal");
            pick = setTheme;
            return (
                <PureformProvider
                    data-testid="outer"
                    registry={registry}
                    theme={theme}
                >
                    <PureformProvider data-testid="inner" />
                </PureformProvider>
            );
        }
        mount(<App />);
        const outer = screen.getByTestId("outer");
        expect(outer.getAttribute("data-theme")).toBe("teal");
        // An inherited theme's attribute is on the ancestor already.
        expect(screen.getByTestId("inner").hasAttribute("data-theme")).toBe(
            false,
        );
        await interact(async () => pick("sharp"));
        expect(outer.getAttribute("data-theme")).toBe("sharp");
        await interact(async () => pick(undefined));
        expect(outer.hasAttribute("data-theme")).toBe(false);
    });

    it("gives components the settings in effect, inherited through nested providers", () => {
        const seen: unknown[] = [];
        function Probe() {
            const state = usePureform();
            const dir = useDirection();
            const motion = useMotion();
            seen.push([dir, motion, state.theme]);
            return null;
        }
        mount(
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
            </>,
        );
        expect(seen).toEqual([
            ["ltr", "system", undefined],
            ["rtl", "reduce", "teal"],
            ["ltr", "full", "teal"],
        ]);
    });

    it("keeps the user's style and attributes on its element", () => {
        mount(
            <PureformProvider
                data-testid="p"
                className="app"
                style={{ display: "block", color: "red" }}
            />,
        );
        const element = screen.getByTestId("p");
        expect(element.className).toBe("app");
        expect(element.style.display).toBe("block");
        expect(element.style.color).toBe("red");
    });

    it("writes its own token overrides as vars in its style", () => {
        const registry = createWebRegistry(
            { button },
            { vars: { prefix: "pf" } },
        );
        mount(
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
            </PureformProvider>,
        );
        const element = screen.getByTestId("p");
        expect(element.style.getPropertyValue("--colors-primary")).toBe(
            "rgb(0, 106, 96)",
        );
        expect(
            element.style.getPropertyValue("--pf-components-button-container"),
        ).toBe("red");
        expect(element.style.color).toBe("blue");
        // Inherited overrides reach the inner provider through the cascade.
        const inner = screen.getByTestId("inner");
        expect(inner.getAttribute("style")).toBe("display: contents;");
        expect(
            getComputedStyle(inner).getPropertyValue("--colors-primary"),
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
        const blocks = (scope: string) =>
            document.head.querySelectorAll(`style[data-href="${scope}"]`);

        it("scopes it by its hash and writes its block once the generator loads", async () => {
            let release!: () => void;
            const loading = new Promise<void>((resolve) => (release = resolve));
            const seedTheme = defineRuntimeTheme<Seed>("seed-a", async () => {
                await loading;
                return generate;
            });
            const theme = seedTheme({ seed: "rgb(0, 106, 96)" });
            const scope = themeScope(theme);
            mount(
                <PureformProvider
                    data-testid="p"
                    registry={registry}
                    theme={theme}
                >
                    <span data-testid="child" />
                </PureformProvider>,
            );
            expect(screen.getByTestId("p").getAttribute("data-theme")).toBe(
                scope,
            );
            await settle();
            expect(blocks(scope)).toHaveLength(0);
            release();
            await settle();
            await settle();
            expect(blocks(scope)).toHaveLength(1);
            expect(blocks(scope)[0]!.textContent).toContain(
                `[data-theme="${scope}"]`,
            );
            expect(
                getComputedStyle(screen.getByTestId("child")).getPropertyValue(
                    "--colors-primary",
                ),
            ).toBe("rgb(0, 106, 96)");
        });

        it("shares one block between providers, follows a changed theme, and gives its vars", async () => {
            const seedTheme = defineRuntimeTheme<Seed>(
                "seed-b",
                () => generate,
            );
            const seed = outside("rgb(1, 2, 3)");
            function Probe() {
                return (
                    <span data-testid="probe">
                        {useThemeVars()?.light["--colors-primary"]}
                    </span>
                );
            }
            mount(
                <seed.Holder>
                    {(value) => (
                        <PureformProvider
                            registry={registry}
                            theme={seedTheme({ seed: value })}
                        >
                            <PureformProvider
                                theme={seedTheme({ seed: value })}
                            >
                                <Probe />
                            </PureformProvider>
                        </PureformProvider>
                    )}
                </seed.Holder>,
            );
            await settle();
            await settle();
            const first = themeScope(seedTheme({ seed: "rgb(1, 2, 3)" }));
            expect(blocks(first)).toHaveLength(1);
            expect(screen.getByTestId("probe").textContent).toBe(
                "rgb(1, 2, 3)",
            );
            await seed.set("rgb(4, 5, 6)");
            await settle();
            await settle();
            const second = themeScope(seedTheme({ seed: "rgb(4, 5, 6)" }));
            expect(blocks(second)).toHaveLength(1);
            expect(blocks(second)[0]!.textContent).toContain("rgb(4, 5, 6)");
            expect(screen.getByTestId("probe").textContent).toBe(
                "rgb(4, 5, 6)",
            );
        });
    });
});

describe("PureformProvider re-rendering", () => {
    type Options = Omit<PureformProviderProps, "registry" | "children">;
    const registry = createWebRegistry(
        { button },
        { themeAttribute: "data-theme", vars: { prefix: "pf" } },
    );
    const seedTheme = defineRuntimeTheme<{ seed: string }>(
        "seed-renders",
        () => (input) => ({
            light: { "--colors-primary": input.seed },
            dark: { "--colors-primary": "black" },
        }),
    );

    // The options change from outside, and the provider's children stay the same elements, so
    // only what reads its context renders again: the button, whose root renders its `as` again
    // each time, and a `usePureform()` probe.
    const setup = (inner: Options = {}) => {
        const options = outside<Options>({});
        const renders = { button: 0 };
        const seen: [unknown, unknown][] = [];
        function Counted(props: ComponentProps<"button">) {
            renders.button++;
            return <button {...props} />;
        }
        function Probe() {
            const { theme, overrides } = usePureform();
            seen.push([theme, overrides]);
            return null;
        }
        function Switcher(props: { children: ReactNode }) {
            return (
                <options.Holder>
                    {(value) => (
                        <PureformProvider registry={registry} {...value}>
                            {props.children}
                        </PureformProvider>
                    )}
                </options.Holder>
            );
        }
        const view = (
            <>
                <Button as={Counted} label="Save" />
                <Probe />
            </>
        );
        mount(
            <Switcher>
                <PureformProvider {...inner}>{view}</PureformProvider>
            </Switcher>,
        );
        return { set: options.set, renders, seen };
    };

    it("doesn't render components again for a theme, seed theme, or overrides change", async () => {
        const { set, renders, seen } = setup();
        await settle();
        const mounted = renders.button;
        const overrides = { "colors.primary": "red" };
        await set({ theme: "teal" });
        await set({ theme: seedTheme({ seed: "rgb(1, 2, 3)" }) });
        await settle();
        await set({ theme: seedTheme({ seed: "rgb(4, 5, 6)" }) });
        await settle();
        await set({ overrides });
        await set({ overrides, hydrate: "regenerate" });
        expect(renders.button).toBe(mounted);
        // `usePureform()` still sees every change.
        expect(seen.map(([theme]) => theme)).toContain("teal");
        expect(seen.at(-1)).toEqual([undefined, overrides]);
        expect(
            getComputedStyle(
                screen.getByTestId(testIds.button.root),
            ).getPropertyValue("--colors-primary"),
        ).toBe("red");
    });

    it("renders components again for the defaults and slot props they read", async () => {
        const { set, renders } = setup();
        await settle();
        const mounted = renders.button;
        await set({ defaults: { button: { variant: "text" } } });
        expect(renders.button).toBeGreaterThan(mounted);
        expect(screen.getByTestId(testIds.button.root).className).toBe(
            "button button--text button--small",
        );
        const before = renders.button;
        await set({ slotProps: { button: { label: { className: "caps" } } } });
        expect(renders.button).toBeGreaterThan(before);
        expect(screen.getByTestId(testIds.button.label).className).toBe(
            "button__label caps",
        );
    });

    it("keeps a nested provider's components as they are when an outer theme changes", async () => {
        const { set, renders, seen } = setup({
            defaults: { button: { size: "large" } },
            theme: "sharp",
        });
        await settle();
        const mounted = renders.button;
        await set({ theme: "teal", overrides: { "colors.primary": "red" } });
        expect(renders.button).toBe(mounted);
        // The inner theme still wins, and the outer overrides reach it.
        expect(seen.at(-1)).toEqual(["sharp", { "colors.primary": "red" }]);
        expect(screen.getByTestId(testIds.button.root).className).toBe(
            "button button--filled button--large",
        );
        await set({ defaults: { button: { variant: "text" } } });
        expect(renders.button).toBeGreaterThan(mounted);
        expect(screen.getByTestId(testIds.button.root).className).toBe(
            "button button--text button--large",
        );
    });
});

function ButtonClasses(props: {
    variant?: "filled" | "text" | undefined;
    radius?: string;
}) {
    const classes = useClasses("button", {
        variant: props.variant,
        tokens: { radius: props.radius },
    });
    return (
        <span
            data-testid="button"
            className={classes.root!.class}
            style={classes.root!.style}
        >
            {classes.label!.class}
        </span>
    );
}

describe("useClasses", () => {
    it("reads a static entry synchronously, over the provider's defaults", async () => {
        const registry = fakeRegistry(neverLoads);
        const defaults = { button: { variant: "text", size: "large" } };
        let setVariant!: (variant: "filled" | undefined) => void;
        function App() {
            const [variant, set] = useState<"filled" | undefined>(undefined);
            setVariant = set;
            return (
                <PureformProvider registry={registry} defaults={defaults}>
                    <ButtonClasses variant={variant} radius="4px" />
                </PureformProvider>
            );
        }
        mount(<App />);
        const element = screen.getByTestId("button");
        expect(element.className).toBe("button button--text button--large");
        expect(element.textContent).toBe("button__label");
        expect(element.style.getPropertyValue("--pf-button-radius")).toBe(
            "4px",
        );

        await interact(async () => setVariant("filled"));
        expect(element.className).toBe("button button--filled button--large");
    });

    it("calls the factory again only when the selection's value changes", async () => {
        const calls: unknown[] = [];
        const registry = fakeRegistry(neverLoads);
        let rerender!: () => void;
        function Probe() {
            const [count, setCount] = useState(0);
            rerender = () => setCount((n) => n + 1);
            const classes = useClasses("button", {
                variant: count < 2 ? "text" : "filled",
                tokens: { radius: "2px" },
            });
            calls.push(classes);
            return null;
        }
        mount(
            <PureformProvider registry={registry}>
                <Probe />
            </PureformProvider>,
        );
        await interact(async () => rerender());
        expect(calls[1]).toBe(calls[0]);
        await interact(async () => rerender());
        expect(calls[2]).not.toBe(calls[1]);
    });

    it("waits for a lazy entry under <Suspense>, then follows the selection", async () => {
        const { loader, lazy } = deferredLoader();
        const registry = fakeRegistry(lazy);
        let setVariant!: (variant: "assist" | "filter") => void;
        function Chip() {
            const [variant, set] = useState<"assist" | "filter">("assist");
            setVariant = set;
            const classes = useClasses<string>("chip", { variant });
            return <span data-testid="chip" className={classes.root!.class} />;
        }
        const host = await mountAsync(
            <PureformProvider registry={registry}>
                <Suspense fallback={<em>loading</em>}>
                    <Chip />
                </Suspense>
            </PureformProvider>,
        );
        expect(host.textContent).toBe("loading");
        expect(loader.calls).toBe(1);

        await interact(async () => loader.resolve());
        expect((await screen.findByTestId("chip")).className).toBe(
            "chip chip--assist",
        );

        await interact(async () => setVariant("filter"));
        expect(screen.getByTestId("chip").className).toBe("chip chip--filter");
        expect(loader.calls).toBe(1);
    });

    it("names what's missing without a registry", () => {
        quietly(() =>
            mount(
                <Errored>
                    <ButtonClasses />
                </Errored>,
            ),
        );
        expect(screen.getByTestId("error").textContent).toMatch(
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
        mount(
            <PureformProvider registry={fakeRegistry(neverLoads)}>
                <Probe />
            </PureformProvider>,
        );
        expect(classes).toBe("button button--text button--small");
    });

    it("refuses a lazy entry", () => {
        function Probe() {
            useClassFactory<string>("chip");
            return null;
        }
        quietly(() =>
            mount(
                <PureformProvider registry={fakeRegistry(neverLoads)}>
                    <Errored>
                        <Probe />
                    </Errored>
                </PureformProvider>,
            ),
        );
        expect(screen.getByTestId("error").textContent).toMatch(
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
                    {factory({ variant: "filter" }).root!.class}
                </span>
            );
        }
        const host = await mountAsync(
            <PureformProvider registry={fakeRegistry(lazy)}>
                <Suspense fallback={<em>loading</em>}>
                    <Probe />
                </Suspense>
            </PureformProvider>,
        );
        expect(host.textContent).toBe("loading");
        await interact(async () => loader.resolve());
        expect((await screen.findByTestId("chip")).textContent).toBe(
            "chip chip--filter",
        );
    });

    it("gives a static entry's factory at once", () => {
        let classes = "";
        function Probe() {
            const factory = useLazyClassFactory<string>("button");
            classes = factory({}).root!.class;
            return null;
        }
        mount(
            <PureformProvider registry={fakeRegistry(neverLoads)}>
                <Probe />
            </PureformProvider>,
        );
        expect(classes).toBe("button button--filled button--small");
    });
});
