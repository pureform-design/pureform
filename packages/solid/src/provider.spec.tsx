import { createRegistry } from "@pureform/styling";
import { createSignal, Errored, flush, Loading } from "solid-js";
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
        const registry = createRegistry(
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

    it.todo("writes a runtime theme and token overrides (p5b)");
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
