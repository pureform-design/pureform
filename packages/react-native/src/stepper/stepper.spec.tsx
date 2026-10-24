import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Stepper } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { reanimated } from "../engines/reanimated";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount, settle } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "stepper",
        "ripple",
        "horizontalSharedAxis",
    ]);
});

afterEach(() => {
    document.body.innerHTML = "";
});

const ITEMS = [
    { label: "Address", content: <Text>Address form</Text> },
    {
        label: "Payment",
        caption: "Optional",
        content: <Text>Payment form</Text>,
    },
    { label: "Review", icon: "★", content: <Text>Review</Text> },
];

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe.each([animated, reanimated])("the stepper with $name", (engine) => {
    const render = (node: ReactNode) =>
        mount(
            <PureformProvider
                registry={registry}
                engine={engine}
                motion="reduce"
            >
                <View style={{ width: 392 }}>{node}</View>
            </PureformProvider>,
        );

    it("is a named list of steps with the current one selected and its content after the list", async () => {
        await render(<Stepper aria-label="Checkout" items={ITEMS} />);
        await settle();
        const list = byTestId("pf-stepper-list");
        expect(list.getAttribute("role")).toBe("tablist");
        expect(list.getAttribute("aria-label")).toBe("Checkout");
        const triggers = all("pf-stepper-trigger");
        expect(
            triggers.map((part) => part.getAttribute("aria-selected")),
        ).toEqual(["true", "false", "false"]);
        expect(
            all("pf-stepper-indicator").map((part) => part.textContent),
        ).toEqual(["1", "2", "★"]);
        expect(all("pf-stepper-separator")).toHaveLength(2);
        expect(
            all("pf-stepper-content").map((part) => part.textContent),
        ).toEqual(["Address form"]);
    });

    it("puts the content in the current item in a column", async () => {
        await render(
            <Stepper orientation="vertical" items={ITEMS} defaultStep={1} />,
        );
        await settle();
        // Inside the item, in the views that grow it open and shrink it shut.
        expect(
            all("pf-stepper-content")[0]!.closest(
                '[data-testid="pf-stepper-item"]',
            ),
        ).toBe(all("pf-stepper-item")[1]);
        // A column's headers disclose their content.
        expect(byTestId("pf-stepper-list").getAttribute("role")).toBe("list");
        const headers = all("pf-stepper-trigger");
        expect(headers[1]!.getAttribute("aria-expanded")).toBe("true");
        expect(headers[0]!.getAttribute("aria-expanded")).toBe("false");
    });

    it("marks a done step with a check and one in error, and disables a done step that isn't editable", async () => {
        await render(
            <Stepper
                step={3}
                items={[
                    { label: "A" },
                    { label: "B", error: true },
                    { label: "C", editable: false },
                ]}
            />,
        );
        await settle();
        const indicators = all("pf-stepper-indicator").map(
            (part) => part.textContent,
        );
        expect(indicators).toEqual(["✓", "⚠", "✓"]);
        expect(
            all("pf-stepper-trigger").map((part) =>
                part.getAttribute("aria-disabled"),
            ),
        ).toEqual([null, null, "true"]);
    });

    it("goes to a pressed step and reports it, unless linear", async () => {
        const onStepChange = vi.fn();
        await render(<Stepper items={ITEMS} onStepChange={onStepChange} />);
        await settle();
        await interact(() => userEvent.click(all("pf-stepper-trigger")[2]!));
        expect(onStepChange).toHaveBeenCalledWith({ step: 2 });
        expect(
            all("pf-stepper-trigger")[2]!.getAttribute("aria-selected"),
        ).toBe("true");
        document.body.innerHTML = "";
        await render(<Stepper linear items={ITEMS} />);
        await settle();
        // The headers don't go to a step in linear mode.
        expect(
            all("pf-stepper-trigger").map((part) =>
                part.getAttribute("aria-disabled"),
            ),
        ).toEqual(["true", "true", "true"]);
    });

    it("takes a function of each step in style and slotProps", async () => {
        await render(
            <Stepper
                aria-label="Checkout"
                items={[...ITEMS.slice(0, 2), { label: "C", error: true }]}
                defaultStep={1}
                style={{
                    item: (step) =>
                        step.completed ? { opacity: 0.5 } : undefined,
                    label: (step) =>
                        step.error ? { opacity: 0.25 } : undefined,
                }}
                slotProps={{
                    separator: (step) => ({
                        "aria-label": step.current ? "here" : "not",
                    }),
                }}
            />,
        );
        await settle();
        expect(
            all("pf-stepper-item").map(
                (item) => getComputedStyle(item).opacity,
            ),
        ).toEqual(["0.5", "1", "1"]);
        expect(getComputedStyle(all("pf-stepper-label")[2]!).opacity).toBe(
            "0.25",
        );
        expect(
            all("pf-stepper-separator").map((part) =>
                part.getAttribute("aria-label"),
            ),
        ).toEqual(["not", "here"]);
    });

    it("gives the page transition its own props", async () => {
        await render(
            <Stepper
                aria-label="Checkout"
                items={ITEMS}
                transition="sharedAxis"
                horizontalSharedAxisProps={{
                    slotProps: { root: { nativeID: "axis" } },
                }}
            />,
        );
        await settle();
        expect(document.querySelectorAll("#axis")).toHaveLength(1);
    });
});
