import { createRegistry } from "@pureform/styling";
import { screen } from "@testing-library/react";
import { Suspense, useState } from "react";
import { describe, expect, it } from "vitest";

import {
    PureformProvider,
    useClasses,
    useClassFactory,
    useDirection,
    useLazyClassFactory,
    useMotion,
    usePureform,
} from ".";
import { button, deferredLoader, fakeRegistry } from "./__fixtures__/registry";
import {
    Errored,
    interact,
    mount,
    mountAsync,
    quietly,
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
        const registry = createRegistry(
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

    it.todo("writes a runtime theme and token overrides (p5b)");
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
