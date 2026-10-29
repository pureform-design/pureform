import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { ChangeDetails } from ".";
import { Glyph, PureformProvider } from ".";
import { ButtonGroup } from "./button-group";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, computed, interact, mount } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "buttonGroup",
        "button",
        "iconButton",
        "ripple",
    ]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

describe("ButtonGroup", () => {
    it("gives an item its own style over the group's buttonProps, and no other button's", async () => {
        await render(
            <ButtonGroup
                buttonProps={{ style: { root: { opacity: 0.9 } } }}
                items={[
                    {
                        label: "Day",
                        testId: "day",
                        style: { root: { opacity: 0.4 } },
                    },
                    { label: "Week", testId: "week" },
                ]}
            />,
        );
        expect(computed("day-root").opacity).toBe("0.4");
        expect(computed("week-root").opacity).toBe("0.9");
    });

    it("squares a connected group's inner corners, and keeps the outer ones round", async () => {
        await render(
            <ButtonGroup
                connected
                aria-label="Format"
                items={[
                    { label: "Bold", testId: "b" },
                    {
                        icon: <Glyph glyph="I" />,
                        "aria-label": "Italic",
                        testId: "i",
                    },
                    { label: "Underline", testId: "u" },
                ]}
            />,
        );
        const root = byTestId("pf-button-group-root");
        expect(root.getAttribute("role")).toBe("group");
        expect(computed("pf-button-group-root").columnGap).toBe("2px");
        const first = computed("b-root");
        const last = computed("u-root");
        expect(parseFloat(first.borderTopLeftRadius)).toBeGreaterThan(
            parseFloat(first.borderTopRightRadius),
        );
        expect(parseFloat(last.borderTopRightRadius)).toBeGreaterThan(
            parseFloat(last.borderTopLeftRadius),
        );
        const middle = computed("i-container");
        expect(middle.borderTopLeftRadius).toBe(middle.borderTopRightRadius);
    });

    it("keeps one button on in a single-select group", async () => {
        const change =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <ButtonGroup
                selectable="single"
                defaultValue={["day"]}
                onValueChange={change}
                items={[
                    { value: "day", label: "Day", testId: "day" },
                    { value: "week", label: "Week", testId: "week" },
                ]}
            />,
        );
        expect(byTestId("day-root").getAttribute("aria-pressed")).toBe("true");
        await interact(() => userEvent.click(byTestId("week-root")));
        expect(byTestId("week-root").getAttribute("aria-pressed")).toBe("true");
        expect(byTestId("day-root").getAttribute("aria-pressed")).toBe("false");
        expect(change).toHaveBeenCalledExactlyOnceWith({ value: ["week"] });
    });
});
