import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { LoadingIndicator } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { animatedSvg } from "../engines/svg";
import { LinearProgress } from "../linear-progress";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, mount, settle } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["loadingIndicator", "linearProgress"]);
});

const render = async (
    node: ReactNode,
    engine = animated,
    motion?: "reduce",
) => {
    await mount(
        <PureformProvider registry={registry} engine={engine} motion={motion}>
            {node}
        </PureformProvider>,
    );
    await settle(50);
};

describe("LoadingIndicator", () => {
    it("is a progressbar with no value, a round container and the indicator", async () => {
        await render(
            <LoadingIndicator aria-label="Loading" variant="contained" />,
        );
        const root = byTestId("pf-loading-indicator-root");
        expect(root.getAttribute("role")).toBe("progressbar");
        expect(root.hasAttribute("aria-valuenow")).toBe(false);
        expect(computed("pf-loading-indicator-root").width).toBe("48px");
        expect(computed("pf-loading-indicator-indicator").width).toBe("38px");
        expect(
            computed("pf-loading-indicator-container").borderTopLeftRadius,
        ).toBe("24px");
        expect(
            computed("pf-loading-indicator-container").backgroundColor,
        ).not.toBe("rgba(0, 0, 0, 0)");
    });

    it("is a circle without SVG, and drawn in its shape with it", async () => {
        await render(<LoadingIndicator aria-label="Loading" />);
        expect(
            computed("pf-loading-indicator-indicator").borderTopLeftRadius,
        ).not.toBe("0px");
        expect(document.querySelector("svg")).toBeNull();
        await render(
            <LoadingIndicator aria-label="Loading" testId="s" />,
            animatedSvg,
        );
        expect(
            byTestId("s-indicator").querySelector("svg path"),
        ).not.toBeNull();
    });

    it("turns, under reduced motion too", async () => {
        await render(
            <LoadingIndicator aria-label="Loading" />,
            animated,
            "reduce",
        );
        expect(computed("pf-loading-indicator-indicator").transform).not.toBe(
            "",
        );
    });
});

describe("wavy linear progress", () => {
    it("stays a flat bar on the wave's middle line without SVG", async () => {
        await render(<LinearProgress value={50} shape="wavy" />);
        expect(computed("pf-linear-progress-root").height).toBe("10px");
        expect(computed("pf-linear-progress-indicator").height).toBe("4px");
        expect(computed("pf-linear-progress-indicator").top).toBe("3px");
        expect(computed("pf-linear-progress-track").top).toBe("3px");
    });

    it("draws the indicator in its wave with SVG", async () => {
        await render(
            <LinearProgress value={50} shape="wavy" testId="w" />,
            animatedSvg,
        );
        expect(computed("w-indicator").height).toBe("10px");
        expect(
            byTestId("w-indicator").querySelector("svg path"),
        ).not.toBeNull();
    });
});
