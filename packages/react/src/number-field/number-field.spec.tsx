import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NumberField } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.numberField;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={textInputsRegistry()}>
            {view}
        </PureformProvider>,
    );

const parts = (root: Element) =>
    [...root.querySelectorAll("[data-pf-part]")].map((part) =>
        part.getAttribute("data-pf-part"),
    );

describe("NumberField, ready-made", () => {
    it("renders the field in the anatomy's structure, the input a spinbutton named by the label", async () => {
        withRegistry(
            <NumberField
                label="Quantity"
                variant="outlined"
                suffixText="kg"
                supportingText="Up to 10"
                defaultValue="2"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe(
            "number-field number-field--variant-outlined number-field--suffixText-true",
        );
        expect(parts(root)).toEqual([
            "container",
            "input",
            "suffix-text",
            "label",
            "control",
            "decrement-trigger",
            "increment-trigger",
            "supporting-text",
        ]);
        const input = screen.getByRole("spinbutton", { name: "Quantity" });
        expect(input).toHaveValue("2");
        expect(input.getAttribute("placeholder")).toBe(" ");
        expect(
            screen.getByRole("button", { name: "increment value" }),
        ).toBeTruthy();
    });

    it("steps with the buttons and the arrow keys, stopping at the limits", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <NumberField
                label="Quantity"
                min={0}
                max={3}
                defaultValue="2"
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(byTestId(ids.incrementTrigger));
        await settle();
        expect(input.value).toBe("3");
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: "3", valueAsNumber: 3 }),
        );
        expect(byTestId(ids.incrementTrigger)).toBeDisabled();
        input.focus();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        await settle();
        expect(input.value).toBe("1");
    });

    it("clamps a typed value on blur", async () => {
        withRegistry(<NumberField label="Quantity" min={0} max={10} />);
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.type(input, "42");
        await userEvent.tab();
        await settle();
        expect(input.value).toBe("10");
    });

    it("follows a controlled value, and shows an error in place of the supporting text", async () => {
        function Controlled(): ReactNode {
            const [value, setValue] = useState("5");
            return (
                <>
                    <NumberField
                        label="Quantity"
                        value={value}
                        onValueChange={(details) => setValue(details.value)}
                        error="Too many"
                        supportingText="Helper"
                    />
                    <button type="button" onClick={() => setValue("1")}>
                        reset
                    </button>
                </>
            );
        }
        withRegistry(<Controlled />);
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(byTestId(ids.supportingText).textContent).toBe("Too many");
        await userEvent.click(screen.getByRole("button", { name: "reset" }));
        await settle();
        expect(input.value).toBe("1");
    });

    it("reads and steps its value in the locale", async () => {
        withRegistry(
            <NumberField label="Price" locale="de-DE" defaultValue="1.234,5" />,
        );
        await settle();
        await userEvent.click(byTestId(ids.incrementTrigger));
        await settle();
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("1.235,5");
    });
});
