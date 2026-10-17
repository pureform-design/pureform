// Direction (design doc §5.9), for every example of every component and every opened overlay: the
// provider's `dir` reaches every part the machine marks, and right to left mirrors left to right:
// each part's box in `rtl` is its `ltr` box mirrored across the root (`x' = width - x - w`), while
// parts that don't point (a check mark) draw the same both ways. Arrow keys in both directions are
// in the keyboard suite.

import { describe, expect, it } from "vitest";

import {
    boxesWithin,
    mirrorMismatches,
} from "../../browser-e2e-tests/src/mirror";
import { byTestId, COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import { mountCase, renderings, settlePlaced } from "./harness/page";
import type { SceneProps } from "./harness/scene";

/** Physical styles that draw a part's shape. */
const DRAWN = [
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
    "transform",
] as const;

/** Every part's box against the root, by part name, rendered in `dir`. */
const measure = async (
    component: ComponentCase,
    props: SceneProps,
    dir: "ltr" | "rtl",
) => {
    const scene = mountCase(component, props, { provider: { dir } });
    await settlePlaced();
    const root = byTestId(scene.host, component.root);
    // A part the CSS hides (an icon button's outline unless outlined) has no box to mirror.
    const parts = Object.fromEntries(
        [...root.querySelectorAll<HTMLElement>("[data-pf-part]")]
            .filter((part) => part.getClientRects().length > 0)
            .map((part) => [part.dataset.pfPart!, part]),
    );
    const drawn = Object.fromEntries(
        (component.unmirrored ?? []).map((name) => {
            const style = getComputedStyle(parts[name]!);
            return [
                name,
                Object.fromEntries(DRAWN.map((key) => [key, style[key]])),
            ];
        }),
    );
    const measured = {
        drawn,
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
    it.each(renderings(component))(
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
            // Parts that don't point (a check mark) draw the same both ways.
            expect(rtl.drawn).toEqual(ltr.drawn);
        },
    );
});
