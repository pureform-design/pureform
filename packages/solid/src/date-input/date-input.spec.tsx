import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DateInput } from ".";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = testIds.dateInput;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={datePickersRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const segments = () => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.segment}"]`),
];

describe("DateInput, ready-made", () => {
    it("renders the header, the field of segments, and the actions", async () => {
        withRegistry(() => <DateInput locale="en-US" name="when" />);
        await settle();
        expect(byTestId(ids.root).className).toBe("date-input");
        expect(byTestId(ids.headline).textContent).toBe("Select date");
        expect(byTestId(ids.selectedDate).textContent).toBe("Enter date");
        expect(byTestId(ids.label).textContent).toBe("Date");
        expect(byTestId(ids.supportingText).textContent).toBe("mm/dd/yyyy");
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
        expect(byTestId(ids.input).getAttribute("role")).toBe("group");
        expect(
            segments()
                .filter(
                    (segment) => segment.getAttribute("role") === "spinbutton",
                )
                .map((segment) => segment.getAttribute("data-type")),
        ).toEqual(["month", "day", "year"]);
        expect(
            document.querySelector<HTMLInputElement>('input[name="when"]'),
        ).not.toBeNull();
        expect(() => byTestId(ids.modeToggle)).toThrow();
    });

    it("draws the icons and affixes only when given, as content", async () => {
        withRegistry(() => (
            <DateInput
                locale="en-US"
                leadingIcon="L"
                trailingIcon="T"
                prefixText="$"
                suffixText="USD"
            />
        ));
        await settle();
        expect(byTestId(ids.leadingIcon).textContent).toBe("L");
        expect(byTestId(ids.trailingIcon).textContent).toBe("T");
        expect(byTestId(ids.prefixText).textContent).toBe("$");
        expect(byTestId(ids.suffixText).textContent).toBe("USD");
    });

    it("draws none of them without content", async () => {
        withRegistry(() => <DateInput locale="en-US" />);
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

    it("orders the segments as the locale writes dates", async () => {
        withRegistry(() => <DateInput locale="en-GB" />);
        await settle();
        expect(
            segments()
                .filter(
                    (segment) => segment.getAttribute("role") === "spinbutton",
                )
                .map((segment) => segment.getAttribute("data-type")),
        ).toEqual(["day", "month", "year"]);
        expect(byTestId(ids.supportingText).textContent).toBe("dd/mm/yyyy");
    });

    it("turns typed digits into the ISO date, and confirms it", async () => {
        const onValueChange = vi.fn();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        withRegistry(() => (
            <DateInput
                locale="en-US"
                onValueChange={onValueChange}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        ));
        await settle();
        await userEvent.click(segments()[0]!);
        await userEvent.keyboard("08172026");
        // The year takes more digits until the field loses focus.
        await userEvent.keyboard("{Tab}");
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-17"],
            }),
        );
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        const [cancel, ok] = byTestId(ids.actions).querySelectorAll("button");
        await userEvent.click(ok!);
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
        await userEvent.click(cancel!);
        expect(onCancel).toHaveBeenCalled();
    });

    it("takes a range's end typed before its start", async () => {
        const onValueChange = vi.fn();
        const onConfirm = vi.fn();
        withRegistry(() => (
            <DateInput
                locale="en-US"
                selectionMode="range"
                onValueChange={onValueChange}
                onConfirm={onConfirm}
            />
        ));
        await settle();
        const spinbuttons = () =>
            segments().filter(
                (segment) => segment.getAttribute("role") === "spinbutton",
            );
        await userEvent.click(spinbuttons()[3]!);
        await userEvent.keyboard("08202026");
        await userEvent.keyboard("{Tab}");
        // Editing it again: Zag copies the value, and the empty start becomes undefined.
        await userEvent.click(spinbuttons()[4]!);
        await userEvent.keyboard("21");
        await userEvent.keyboard("{Tab}");
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-21"],
            }),
        );
        const [, ok] = byTestId(ids.actions).querySelectorAll("button");
        await userEvent.click(ok!);
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-21"]);
    });

    it("shows an error in place of the format, and the mode toggle when given", async () => {
        const onModeToggle = vi.fn();
        withRegistry(() => (
            <DateInput
                locale="en-US"
                error="Invalid date"
                onModeToggle={onModeToggle}
            />
        ));
        await settle();
        expect(byTestId(ids.supportingText).textContent).toBe("Invalid date");
        expect(byTestId(ids.root).hasAttribute("data-invalid")).toBe(true);
        expect(byTestId(ids.modeToggle).getAttribute("aria-label")).toBe(
            "Switch to calendar",
        );
        await userEvent.click(byTestId(ids.modeToggle));
        expect(onModeToggle).toHaveBeenCalled();
    });

    it("shows a controlled value", async () => {
        withRegistry(() => <DateInput locale="en-US" value={["2026-08-17"]} />);
        await settle();
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        expect(
            segments()
                .filter(
                    (segment) => segment.getAttribute("role") === "spinbutton",
                )
                .map((segment) => segment.textContent),
        ).toEqual(["8", "17", "2026"]);
    });
});
