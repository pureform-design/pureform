import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DateInput } from ".";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { interact, mount, settle, until } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.dateInput;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={datePickersRegistry()}>
            {view}
        </PureformProvider>,
    );

const segments = () => [
    ...document.querySelectorAll<HTMLElement>(
        `[data-testid="${ids.segment}"][role="spinbutton"]`,
    ),
];

describe("DateInput, ready-made", () => {
    it("renders the header, the field of segments in the locale's order, and the actions", async () => {
        withRegistry(<DateInput locale="en-GB" />);
        await settle();
        expect(byTestId(ids.root).getAttribute("role")).toBe("group");
        expect(byTestId(ids.root).getAttribute("aria-labelledby")).toBe(
            byTestId(ids.headline).id,
        );
        expect(byTestId(ids.headline).textContent).toBe("Select date");
        expect(byTestId(ids.selectedDate).textContent).toBe("Enter date");
        expect(byTestId(ids.label).textContent).toBe("Date");
        expect(byTestId(ids.supportingText).textContent).toBe("dd/mm/yyyy");
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
        expect(segments().map((s) => s.getAttribute("data-type"))).toEqual([
            "day",
            "month",
            "year",
        ]);
        expect(
            document.querySelector(`[data-testid="${ids.modeToggle}"]`),
        ).toBe(null);
    });

    it("takes typed digits as the ISO value, and confirms it", async () => {
        const onValueChange = vi.fn();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        withRegistry(
            <DateInput
                locale="en-US"
                onValueChange={onValueChange}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );
        await settle();
        await interact(() => userEvent.click(segments()[0]!));
        await interact(() => userEvent.keyboard("08172026"));
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-17"],
            }),
        );
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        await interact(() =>
            userEvent.click(screen.getByRole("button", { name: "OK" })),
        );
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
        await interact(() =>
            userEvent.click(screen.getByRole("button", { name: "Cancel" })),
        );
        expect(onCancel).toHaveBeenCalled();
    });

    it("shows the mode toggle with onModeToggle, and an error instead of the format", async () => {
        const onModeToggle = vi.fn();
        withRegistry(
            <DateInput
                locale="en-US"
                error="Invalid date"
                defaultValue={["2026-08-17"]}
                onModeToggle={onModeToggle}
            />,
        );
        await settle();
        expect(byTestId(ids.supportingText).textContent).toBe("Invalid date");
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        await interact(() =>
            userEvent.click(
                screen.getByRole("button", { name: "Switch to calendar" }),
            ),
        );
        expect(onModeToggle).toHaveBeenCalled();
    });
});

describe("DateInput, composed", () => {
    it("runs the actions through CancelTrigger and ConfirmTrigger, unless onClick prevents it", async () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        withRegistry(
            <DateInput.Root
                defaultValue={["2026-08-17"]}
                onConfirm={onConfirm}
                onCancel={onCancel}
            >
                <DateInput.Actions>
                    <DateInput.CancelTrigger
                        onClick={(event) => event.preventDefault()}
                    >
                        Cancel
                    </DateInput.CancelTrigger>
                    <DateInput.ConfirmTrigger>OK</DateInput.ConfirmTrigger>
                </DateInput.Actions>
            </DateInput.Root>,
        );
        await settle();
        const cancel = screen.getByText("Cancel");
        expect(cancel.getAttribute("type")).toBe("button");
        await interact(() => userEvent.click(cancel));
        expect(onCancel).not.toHaveBeenCalled();
        await interact(() => userEvent.click(screen.getByText("OK")));
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
    });
});
