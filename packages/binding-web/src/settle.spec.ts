import { sampleSpring } from "@pureform/core";
import type { SpringNode } from "@pureform/core/ast";
import { formatLinearEasing } from "@pureform/css-lowering";
import { afterEach, describe, expect, it } from "vitest";

import { createSwipeSettle } from "./list-item-swipe-settle";
import {
    settleOnSpring,
    springFromVars,
    springRoleVar,
    transitionSpring,
} from "./settle";

const exact: SpringNode = {
    type: "spring",
    stiffness: 1400,
    damping: 0.9,
    mass: 1,
};

// An element on the spring's transition, with the spring's vars as the web writes a role's.
const onSpring = (property: string, vars = true) => {
    const { duration, points } = sampleSpring(exact);
    const style = document.createElement("style");
    style.textContent = `
        :root {
            ${
                vars
                    ? `--springs-spatial-fast-stiffness: 1400;
            --springs-spatial-fast-damping: 0.9;
            --springs-spatial-fast-mass: 1;`
                    : ""
            }
        }
        .settling { transition: ${property} ${duration}ms ${formatLinearEasing(points)}; }`;
    document.head.append(style);
    const element = document.createElement("div");
    element.className = "settling";
    document.body.append(element);
    return element;
};

afterEach(() => {
    document.body.replaceChildren();
    for (const style of document.head.querySelectorAll("style")) style.remove();
});

describe("exact springs on the web", () => {
    it("names a spring role's var as the registry's target does", () => {
        expect(springRoleVar({ vars: {} }, "spatialFast")).toBe(
            "--springs-spatial-fast",
        );
        expect(
            springRoleVar({ vars: { tokenPrefix: "pf" } }, "spatialDefault"),
        ).toBe("--pf-springs-spatial-default");
        expect(springRoleVar(undefined, "spatialFast")).toBeUndefined();
    });

    it("reads a spring's parameters from its vars", () => {
        const element = onSpring("translate");
        expect(springFromVars(element, "--springs-spatial-fast")).toEqual(
            exact,
        );
        expect(springFromVars(element, "--springs-missing")).toBeUndefined();
    });

    it("settles on the spring its vars name, not one fitted to the curve", () => {
        const element = onSpring("translate");
        expect(
            transitionSpring(element, "translate", "--springs-spatial-fast"),
        ).toEqual(exact);
        // Without the vars, it fits one to the curve: close, but not the same.
        const fitted = transitionSpring(element, "translate");
        expect(fitted).toBeDefined();
        expect(fitted).not.toEqual(exact);
        // A transition that isn't a spring's isn't settled at all.
        expect(transitionSpring(element, "opacity")).toBeUndefined();
    });
});

describe("createSwipeSettle", () => {
    it("settles the row's offset on its exact spring from the drag's speed", () => {
        const property = "--components-listItem-swipeOffset";
        const element = onSpring(property);
        const settle = createSwipeSettle(() => ({ vars: {} }));
        settle.start(element, 0, 0);
        settle.move(20, 16);
        settle.move(40, 32);
        settle.release(element, 40, 80);
        expect(element.style.transition).toMatch(
            new RegExp(`^${property} \\d+ms linear\\(`),
        );
        // A faster release overshoots sooner: its curve differs from the one at rest.
        const { points } = sampleSpring(exact);
        expect(element.style.transition).not.toContain(
            formatLinearEasing(points),
        );
    });

    it("leaves the row alone without a spring transition", () => {
        const element = document.createElement("div");
        document.body.append(element);
        const settle = createSwipeSettle(() => ({ vars: {} }));
        settle.start(element, 0, 0);
        settle.move(40, 32);
        settle.release(element, 40, 80);
        expect(element.style.transition).toBe("");
    });
});

describe("settleOnSpring", () => {
    it("overrides an element's own inline transition while it runs, and puts it back", () => {
        const pane = document.createElement("div");
        document.body.append(pane);
        pane.style.transition = "opacity 200ms linear";
        const drop = settleOnSpring([pane], "flex-grow", exact, 100, 0.5);
        expect(pane.style.transition).toMatch(/^flex-grow \d+ms linear\(/);
        drop();
        expect(pane.style.transition).toBe("opacity 200ms linear");
    });
});
