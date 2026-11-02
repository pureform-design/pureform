import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { harness } from "#binding";

const components = [
    ["Button", "button", testIds.button.root],
    ["IconButton", "iconButton", testIds.iconButton.root],
    ["Chip", "chip", testIds.chip.root],
    ["TagsInput", "inputChip", "radius-chip"],
    ["SplitButton", "splitButton", testIds.splitButton.leadingButton],
] as const;

describe.each(components)("%s radius precedence", (component, name, id) => {
    // InputChip is the TagsInput's part, not a standalone ready-made export.
    const chipProps = (tokens?: Record<string, string>) => ({
        testId: { root: id },
        tokens,
    });
    const propsFor = (density: string) =>
        name === "inputChip"
            ? {
                  defaultValue: ["Action"],
                  chip: { corner: "round", density },
                  chipProps: chipProps(),
              }
            : {
                  corner: "round",
                  density,
                  label: "Action",
                  "aria-label": "Action",
                  icon: "+",
                  items: [{ value: "one", label: "One" }],
              };
    const tokensProp = (tokens?: Record<string, string>) =>
        name === "inputChip" ? { chipProps: chipProps(tokens) } : { tokens };
    for (const density of ["inherit", "comfortable", "compact", "dense"]) {
        it(`keeps named/provider/instance radii independent of ${density} density`, async () => {
            const props = propsFor(density);
            const mounted = harness.mount({
                component,
                props,
                provider: { theme: "radius" },
            });
            await harness.settle();
            const part = mounted.host.querySelector<HTMLElement>(
                `[data-testid="${id}"]`,
            )!;
            const radius = () =>
                parseFloat(getComputedStyle(part).borderTopLeftRadius);
            expect(radius()).toBe(6);
            await mounted.update(tokensProp({ radius: "3px" }));
            expect(radius()).toBe(3);
            await mounted.update(tokensProp());
            expect(radius()).toBe(6);
            mounted.unmount();

            const provided = harness.mount({
                component,
                props,
                provider: {
                    overrides: { [`components.${name}.radius`]: "5px" },
                },
            });
            await harness.settle();
            const providedPart = provided.host.querySelector<HTMLElement>(
                `[data-testid="${id}"]`,
            )!;
            expect(
                parseFloat(getComputedStyle(providedPart).borderTopLeftRadius),
            ).toBe(5);
        });

        it(`retains the derived pill at ${density} density`, async () => {
            const mounted = harness.mount({
                component,
                props: propsFor(density),
            });
            await harness.settle();
            const surface = mounted.host.querySelector<HTMLElement>(
                `[data-testid="${id}"]`,
            )!;
            expect(
                parseFloat(getComputedStyle(surface).borderTopLeftRadius),
            ).toBeCloseTo(surface.getBoundingClientRect().height / 2, 1);
        });
    }
});
