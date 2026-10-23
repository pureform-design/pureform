import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NumberField } from ".";
import { PureformProvider } from "..";
import { CodeField } from "../code-field";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["numberField", "codeField", "ripple"]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const input = () => byTestId("pf-number-field-input") as HTMLInputElement;

describe("NumberField", () => {
    it("draws the field with a spinbutton and the two buttons at its end", async () => {
        await render(<NumberField label="Quantity" defaultValue="2" />);
        expect(input().getAttribute("role")).toBe("spinbutton");
        expect(input().value).toBe("2");
        expect(
            byTestId("pf-number-field-increment-trigger").getAttribute(
                "aria-label",
            ),
        ).toBe("increment value");
        const control = byTestId("pf-number-field-control");
        expect(computed("pf-number-field-control").position).toBe("absolute");
        expect(control.children).toHaveLength(2);
    });

    it("steps with the buttons, stopping and disabling at the limits", async () => {
        const onValueChange = vi.fn();
        await render(
            <NumberField
                label="Quantity"
                min={0}
                max={3}
                defaultValue="2"
                onValueChange={onValueChange}
            />,
        );
        const increment = byTestId("pf-number-field-increment-trigger");
        await interact(() => userEvent.click(increment));
        expect(input().value).toBe("3");
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: "3",
            valueAsNumber: 3,
        });
        expect(increment.getAttribute("aria-disabled")).toBe("true");
        await interact(() =>
            userEvent.click(byTestId("pf-number-field-decrement-trigger")),
        );
        expect(input().value).toBe("2");
    });

    it("clamps and formats a typed value when it's left", async () => {
        await render(<NumberField label="Price" max={5000} locale="de-DE" />);
        await interact(() => userEvent.type(input(), "1234,5"));
        await interact(() => userEvent.tab());
        expect(input().value).toBe("1.234,5");
        await interact(() => userEvent.clear(input()));
        await interact(() => userEvent.type(input(), "9999"));
        await interact(() => userEvent.tab());
        expect(input().value).toBe("5.000");
    });

    it("shows an error in place of the supporting text, marking the input invalid", async () => {
        await render(
            <NumberField label="Quantity" supportingText="Helper" error="No" />,
        );
        expect(input().getAttribute("aria-invalid")).toBe("true");
        expect(byTestId("pf-number-field-supporting-text").textContent).toBe(
            "No",
        );
    });
});

const cells = () =>
    [
        ...document.querySelectorAll('[data-testid="pf-code-field-input"]'),
    ] as HTMLInputElement[];

describe("CodeField", () => {
    it("draws a cell per character, named by its place", async () => {
        await render(<CodeField label="Code" length={6} otp />);
        expect(cells()).toHaveLength(6);
        expect(cells()[0]!.getAttribute("aria-label")).toBe("pin code 1 of 6");
        expect(cells()[0]!.getAttribute("autocomplete")).toBe("one-time-code");
        expect(computed("pf-code-field-control").flexDirection).toBe("row");
    });

    it("moves on as it's typed and back on Backspace, and reports the whole code", async () => {
        const onValueComplete = vi.fn();
        await render(
            <CodeField label="Code" onValueComplete={onValueComplete} />,
        );
        await interact(() => userEvent.click(cells()[0]!));
        await interact(() => userEvent.keyboard("12"));
        expect(cells().map((cell) => cell.value)).toEqual(["1", "2", "", ""]);
        expect(document.activeElement).toBe(cells()[2]);
        await interact(() => userEvent.keyboard("{Backspace}"));
        expect(cells().map((cell) => cell.value)).toEqual(["1", "", "", ""]);
        expect(document.activeElement).toBe(cells()[1]);
        await interact(() => userEvent.keyboard("234"));
        expect(onValueComplete).toHaveBeenCalledWith({
            value: ["1", "2", "3", "4"],
            valueAsString: "1234",
        });
    });

    it("masks a PIN and shows an error", async () => {
        await render(<CodeField label="PIN" mask error="Wrong PIN" />);
        expect(cells()[0]!.type).toBe("password");
        expect(cells()[0]!.getAttribute("aria-invalid")).toBe("true");
        expect(byTestId("pf-code-field-supporting-text").textContent).toBe(
            "Wrong PIN",
        );
    });
});
