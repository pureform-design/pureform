import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode, SubmitEventHandler } from "react";
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

    it("passes the segment's slot props to each segment", async () => {
        withRegistry(
            <DateInput
                locale="en-GB"
                className={{ segment: "digit" }}
                style={{ segment: { opacity: 0.5 } }}
            />,
        );
        await settle();
        expect(
            segments().every(
                (segment) =>
                    segment.classList.contains("digit") &&
                    segment.style.opacity === "0.5",
            ),
        ).toBe(true);
    });

    it("draws the icons and affixes only when given, as content", async () => {
        withRegistry(
            <DateInput
                locale="en-US"
                leadingIcon="L"
                trailingIcon="T"
                prefixText="$"
                suffixText="USD"
            />,
        );
        await settle();
        expect(byTestId(ids.leadingIcon).textContent).toBe("L");
        expect(byTestId(ids.trailingIcon).textContent).toBe("T");
        expect(byTestId(ids.prefixText).textContent).toBe("$");
        expect(byTestId(ids.suffixText).textContent).toBe("USD");
    });

    it("marks an icon to flip under rtl only when asked", async () => {
        withRegistry(
            <DateInput
                locale="en-US"
                leadingIcon="L"
                trailingIcon="T"
                mirrorLeadingIcon
            />,
        );
        await settle();
        expect(byTestId(ids.leadingIcon).hasAttribute("data-pf-mirror")).toBe(
            true,
        );
        expect(byTestId(ids.trailingIcon).hasAttribute("data-pf-mirror")).toBe(
            false,
        );
    });

    it("draws none of them without content", async () => {
        withRegistry(<DateInput locale="en-US" />);
        await settle();
        for (const part of [
            ids.leadingIcon,
            ids.trailingIcon,
            ids.prefixText,
            ids.suffixText,
        ]) {
            expect(document.querySelector(`[data-testid="${part}"]`)).toBe(
                null,
            );
        }
    });

    it("takes typed digits as the ISO value, and confirms it", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        const onConfirm = vi.fn<(value: readonly string[]) => void>();
        const onCancel = vi.fn<() => void>();
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

    it("draws Cancel and OK as type=button, so they don't submit a form", async () => {
        const onSubmit = vi.fn<SubmitEventHandler<HTMLFormElement>>((event) =>
            event.preventDefault(),
        );
        const onConfirm = vi.fn<(value: readonly string[]) => void>();
        const onCancel = vi.fn<() => void>();
        withRegistry(
            <form onSubmit={onSubmit}>
                <DateInput
                    locale="en-US"
                    defaultValue={["2026-08-17"]}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            </form>,
        );
        await settle();
        const ok = screen.getByRole("button", { name: "OK" });
        const cancel = screen.getByRole("button", { name: "Cancel" });
        expect(ok.getAttribute("type")).toBe("button");
        expect(cancel.getAttribute("type")).toBe("button");
        await interact(() => userEvent.click(ok));
        await interact(() => userEvent.click(cancel));
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows the mode toggle with onModeToggle, and an error instead of the format", async () => {
        const onModeToggle = vi.fn<() => void>();
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
        const onConfirm = vi.fn<(value: readonly string[]) => void>();
        const onCancel = vi.fn<() => void>();
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
