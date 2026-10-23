import { shapePath, SvgDrawing } from "@pureform/rn-adapter/svg";
import { act } from "@testing-library/react";
import { Profiler, useState } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from "..";
import { Button } from "../button";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, mount, settle, until } from "../testing/render";
import { animatedSvg } from "./svg";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["button", "ripple"]);
});

const square = (inset: number) => ({
    contours: [
        {
            from: [inset, inset] as [number, number],
            segments: [
                { op: "line" as const, to: [100 - inset, inset] as [number, number] },
                {
                    op: "line" as const,
                    to: [100 - inset, 100 - inset] as [number, number],
                },
                { op: "line" as const, to: [inset, 100 - inset] as [number, number] },
            ],
        },
    ],
});

const TIMING = { duration: 400, easing: "linear", delay: 0 };
const transitions = {
    shape: { property: "shape", ...TIMING },
    fill: { property: "fill", ...TIMING },
};

describe("the Animated SVG engine on the web", () => {
    it("morphs a shape and cross-fades its fill in the browser, with no commit per frame", async () => {
        let change!: () => void;
        let commits = 0;
        function App() {
            const [changed, setChanged] = useState(false);
            change = () => setChanged(true);
            return (
                <View style={{ width: 100, height: 100 }}>
                    <Profiler id="drawing" onRender={() => commits++}>
                        <SvgDrawing
                            drawing={{
                                shape: square(changed ? 20 : 0),
                                fill: changed ? "rgb(0, 0, 255)" : "rgb(255, 0, 0)",
                                transitions,
                            }}
                        />
                    </Profiler>
                </View>
            );
        }
        await mount(<App />);
        await until(() =>
            expect(document.querySelector("svg path")).not.toBeNull(),
        );
        commits = 0;
        await act(async () => change());
        const paths = [...document.querySelectorAll("svg path")];
        // The new fill over the old one, both moving to the new shape in the browser.
        expect(paths.map((p) => p.getAttribute("fill"))).toEqual([
            "rgb(255, 0, 0)",
            "rgb(0, 0, 255)",
        ]);
        for (const path of paths) {
            expect(path.getAnimations().length).toBeGreaterThan(0);
        }
        const writes = new MutationObserver(() => {});
        for (const path of paths) writes.observe(path, { attributes: true });
        await settle(150);
        expect(writes.takeRecords()).toHaveLength(0);
        writes.disconnect();
        const during = commits;
        // The change's commit and the cross-fade's start, not one per frame.
        expect(during).toBeLessThanOrEqual(3);
        // It ends as a drawing of the new shape and fill alone.
        const target = shapePath(square(20), { width: 100, height: 100 });
        await until(() =>
            expect(document.querySelectorAll("svg path")).toHaveLength(1),
        );
        const end = document.querySelector("svg path")!;
        expect(end.getAttribute("d")).toBe(target);
        expect(end.getAttribute("fill")).toBe("rgb(0, 0, 255)");
        expect(end.getAnimations()).toHaveLength(0);
        expect(getComputedStyle(end).opacity).toBe("1");
    });

    it("grows and fades a soft ripple with the browser's animations", async () => {
        await mount(
            <PureformProvider registry={registry} engine={animatedSvg}>
                <Button label="Save" />
            </PureformProvider>,
        );
        await settle(50);
        const root = byTestId("pf-button-root");
        await act(() => userEvent.click(root));
        let ripple!: Element;
        await until(() => {
            ripple = root.querySelector("svg circle")!.parentElement!;
            expect(ripple).not.toBeNull();
        });
        const writes = new MutationObserver(() => {});
        writes.observe(ripple, { attributes: true, subtree: true });
        expect(ripple.getAnimations().length).toBeGreaterThan(0);
        await settle(100);
        expect(writes.takeRecords()).toHaveLength(0);
        writes.disconnect();
        await until(() => expect(root.querySelector("svg circle")).toBeNull());
    });
});
