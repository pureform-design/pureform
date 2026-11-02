import { nativeFactory } from "@pureform/rn-adapter/factory";
import type { Easing, Scheme, Styles } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import { useEffect } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider, useTokens } from ".";
import { presetRegistry } from "./testing/registry";
import { mount } from "./testing/render";

let source: Styles;
const KEY = "easings.review";
const OVERRIDE: Easing = {
    type: "easing",
    kind: "cubicBezier",
    points: [0.4, 0, 0.8, 1],
};
const CURVES: Easing[] = [
    { type: "easing", kind: "keyword", name: "easeOut" },
    { type: "easing", kind: "cubicBezier", points: [0.2, 0, 0, 1] },
    { type: "easing", kind: "linear", points: [[0], [0.8, 50], [1]] },
    { type: "easing", kind: "steps", steps: { count: 3, jump: "start" } },
];
const CHANGES: Easing[] = [
    { type: "easing", kind: "keyword", name: "easeIn" },
    { type: "easing", kind: "cubicBezier", points: [0.3, 0, 0, 1] },
    { type: "easing", kind: "linear", points: [[0], [0.6, 50], [1]] },
    { type: "easing", kind: "steps", steps: { count: 4, jump: "start" } },
];

beforeAll(async () => {
    const registry = await presetRegistry(["button"], [], "themed");
    source = registry.entry("button").factory.styles;
});

const underTheme = async (curve: Easing, scheme: Scheme, changed?: Easing) => {
    // Generated modules contain JSON: equal curves in different themes have different identities.
    const styles: Styles = JSON.parse(JSON.stringify(source));
    for (const values of Object.values(styles.themes)) values[KEY] = curve;
    // Property order must not make an otherwise identical curve a theme override either.
    styles.themes[`teal:${scheme}`]![KEY] =
        changed ??
        (Object.fromEntries(Object.entries(curve).reverse()) as Easing);
    const serialized: Styles = JSON.parse(JSON.stringify(styles));
    const registry = createRegistry({
        button: nativeFactory("button", serialized),
    });
    let seen: unknown;
    function Probe() {
        const value = useTokens()[KEY];
        useEffect(() => {
            seen = value;
        }, [value]);
        return null;
    }
    await mount(
        <PureformProvider
            registry={registry}
            scheme={scheme}
            overrides={{ [KEY]: OVERRIDE }}
        >
            <PureformProvider theme="teal">
                <Probe />
            </PureformProvider>
        </PureformProvider>,
    );
    return seen;
};

describe.each(["light", "dark"] as const)(
    "serialized %s theme easings",
    (scheme) => {
        it.each(CURVES)(
            "inherits an override through an unchanged $kind curve",
            async (curve) => {
                expect(await underTheme(curve, scheme)).toEqual(OVERRIDE);
            },
        );

        it.each(CURVES.map((curve, i) => ({ curve, changed: CHANGES[i]! })))(
            "lets a changed $curve.kind easing win over the outer override",
            async ({ curve, changed }) => {
                expect(await underTheme(curve, scheme, changed)).toEqual(
                    changed,
                );
            },
        );

        it("treats the default steps jump as end", async () => {
            expect(
                await underTheme(
                    { type: "easing", kind: "steps", steps: { count: 3 } },
                    scheme,
                    {
                        type: "easing",
                        kind: "steps",
                        steps: { count: 3, jump: "end" },
                    },
                ),
            ).toEqual(OVERRIDE);
        });
    },
);
