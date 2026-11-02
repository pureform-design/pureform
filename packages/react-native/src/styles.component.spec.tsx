import { Suspense, useRef } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import {
    PureformProvider,
    useComponentSlots,
    useStyleFactory,
    useStyles,
} from ".";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, outside, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["button", "linearProgress"], ["chip"]);
});

const text = (id: string) =>
    document.querySelector(`[data-testid="${id}"]`)!.textContent!;

describe("useStyles", () => {
    it("selects through the entry's factory in the provider's environment, over its defaults", async () => {
        function Probe() {
            const slots = useStyles("button", { hover: true });
            return <pre data-testid="probe">{JSON.stringify(slots)}</pre>;
        }
        await mount(
            <PureformProvider
                registry={registry}
                scheme="dark"
                defaults={{ button: { variant: "tonal" } }}
            >
                <Probe />
            </PureformProvider>,
        );
        expect(JSON.parse(text("probe"))).toEqual(
            JSON.parse(
                JSON.stringify(
                    registry.entry("button").factory.for({
                        scheme: "dark",
                        width: window.innerWidth,
                    })({
                        variant: "tonal",
                        hover: true,
                        reducedMotion: false,
                    }),
                ),
            ),
        );
    });

    it("returns the same frozen object for the same selection", async () => {
        const seen: unknown[] = [];
        const value = outside(0);
        function Probe(props: { n: number }) {
            seen.push(useStyles("button", { variant: "text" }));
            return <pre>{props.n}</pre>;
        }
        await mount(
            <PureformProvider registry={registry}>
                <value.Holder>{(n) => <Probe n={n} />}</value.Holder>
            </PureformProvider>,
        );
        await value.set(1);
        expect(seen.length).toBeGreaterThan(1);
        expect(new Set(seen).size).toBe(1);
        expect(Object.isFrozen(seen[0])).toBe(true);
    });

    it("suspends on a lazy entry until it loads", async () => {
        function Probe() {
            const slots = useStyles("chip", {});
            return <pre data-testid="probe">{typeof slots.root?.style}</pre>;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Suspense fallback={<pre data-testid="probe">loading</pre>}>
                    <Probe />
                </Suspense>
            </PureformProvider>,
        );
        await settle();
        expect(text("probe")).toBe("object");
    });
});

describe("useStyleFactory", () => {
    it("gives one factory for the environment across renders", async () => {
        const value = outside(0);
        const factories = new Set<unknown>();
        function Probe(props: { n: number }) {
            factories.add(useStyleFactory("button"));
            const renders = useRef(0);
            // oxlint-disable-next-line react/refs -- the test counts renders
            renders.current += 1;
            return <pre>{props.n}</pre>;
        }
        await mount(
            <PureformProvider registry={registry}>
                <value.Holder>{(n) => <Probe n={n} />}</value.Holder>
            </PureformProvider>,
        );
        await value.set(1);
        expect(factories.size).toBe(1);
    });
});

describe("useComponentSlots", () => {
    it("sets an instance token by its name", async () => {
        function Probe() {
            const { selected } = useComponentSlots("linearProgress", {
                indeterminate: false,
                tokens: { value: 40 },
            });
            const width = selected.styles.indicator?.width;
            return (
                <pre data-testid="probe">
                    {typeof width === "string" ? width : JSON.stringify(width)}
                </pre>
            );
        }
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <Probe />
            </PureformProvider>,
        );
        expect(text("probe")).toBe("40%");
    });
});
