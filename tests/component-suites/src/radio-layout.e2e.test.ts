import { describe, expect, it } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

describe("RadioGroup layout", () => {
    it("takes orientation from provider defaults and lets an instance override it", async () => {
        const component = COMPONENTS.find(
            (entry) => entry.component === "RadioGroup",
        )!;
        const scene = mountCase(
            component,
            {},
            {
                provider: {
                    defaults: { radioGroup: { orientation: "horizontal" } },
                },
            },
        );
        await settlePlaced();
        const root = () =>
            scene.host.querySelector<HTMLElement>('[role="radiogroup"]')!;
        expect(getComputedStyle(root()).flexDirection).toBe("row");
        expect(root().getAttribute("aria-orientation")).toBe("horizontal");
        await scene.update({ orientation: "vertical" });
        await settlePlaced();
        expect(getComputedStyle(root()).flexDirection).toBe("column");
        expect(root().getAttribute("aria-orientation")).toBe("vertical");
    });
    it.each(["vertical", "horizontal"] as const)(
        "lays out %s radios",
        async (orientation) => {
            const component = COMPONENTS.find(
                (entry) => entry.component === "RadioGroup",
            )!;
            const { host } = mountCase(component, { orientation });
            await settlePlaced();
            const radios = [
                ...host.querySelectorAll<HTMLElement>(
                    '[data-testid="pf-radio-root"]',
                ),
            ];
            expect(radios.length).toBeGreaterThan(1);
            const a = radios[0]!.getBoundingClientRect();
            const b = radios[1]!.getBoundingClientRect();
            // Both branches assert the geometry of this parameterized layout.
            /* oxlint-disable vitest/no-conditional-expect */
            if (orientation === "horizontal") {
                expect(b.top).toBeCloseTo(a.top, 0);
                expect(b.left).toBeGreaterThan(a.left);
            } else {
                expect(b.top).toBeGreaterThan(a.top);
            }
            /* oxlint-enable vitest/no-conditional-expect */
        },
    );
});
