// Direction (design doc §5.9), for every example of every component: the provider's `dir` reaches
// every part the machine marks, and right to left mirrors left to right: each part's box in `rtl`
// is its `ltr` box mirrored across the root (`x' = width - x - w`). Arrow keys in both directions
// are in the keyboard suite.

import { describe, expect, it } from "vitest";

import { harness } from "#binding";

import {
    boxesWithin,
    mirrorMismatches,
} from "../../browser-e2e-tests/src/mirror";
import { byTestId, COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import { mountCase } from "./harness/page";
import type { SceneProps } from "./harness/scene";

/** Every part's box against the root, by part name, rendered in `dir`. */
const measure = async (
    component: ComponentCase,
    props: SceneProps,
    dir: "ltr" | "rtl",
) => {
    const scene = mountCase(component, props, { provider: { dir } });
    await harness.settle();
    const root = byTestId(scene.host, component.root);
    const parts = Object.fromEntries(
        [...root.querySelectorAll<HTMLElement>("[data-pf-part]")].map(
            (part) => [part.dataset.pfPart!, part],
        ),
    );
    const measured = {
        width: root.getBoundingClientRect().width,
        boxes: boxesWithin(root, parts),
        dirs: [...scene.host.querySelectorAll("[dir]")].map((element) =>
            element.getAttribute("dir"),
        ),
    };
    scene.unmount();
    scene.host.remove();
    return measured;
};

describe.each(COMPONENTS)("$component", (component) => {
    it.each(Object.entries(component.examples))(
        "%s: rtl mirrors ltr, and every part takes the provider's dir",
        async (_, props) => {
            const ltr = await measure(component, props, "ltr");
            const rtl = await measure(component, props, "rtl");
            expect(new Set(ltr.dirs)).toEqual(new Set(["ltr"]));
            expect(new Set(rtl.dirs)).toEqual(new Set(["rtl"]));
            expect(rtl.width).toBeCloseTo(ltr.width, 1);
            expect(Object.keys(ltr.boxes).length).toBeGreaterThan(0);
            expect(mirrorMismatches(ltr.boxes, rtl.boxes, ltr.width)).toEqual(
                [],
            );
        },
    );
});
