import { compositeTestIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DockedDatePicker } from ".";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.dockedDatePicker;

// The fake registry draws nothing: lay the weeks out in rows, so the calendar fits the page.
const style = document.createElement("style");
style.textContent =
    "[data-pf-part=week], [data-pf-part=weekdays], [data-pf-part=year-list] { display: flex; flex-wrap: wrap; width: 300px }";
document.head.append(style);

const withRegistry = (view: () => unknown, dir?: "ltr" | "rtl") =>
    mount(() => (
        <PureformProvider registry={datePickersRegistry()} dir={dir}>
            {view() as never}
        </PureformProvider>
    ));

const day = (iso: string) =>
    document.querySelector<HTMLElement>(
        `[data-part="table-cell-trigger"][data-value="${iso}"]`,
    )!;

describe("DockedDatePicker, ready-made", () => {
    it("renders supplied actions reactively with their slot props, without an empty wrapper", async () => {
        const [shown, setShown] = createSignal(false);
        const action = vi.fn<() => void>();
        withRegistry(() => (
            <DockedDatePicker
                label="Date"
                defaultOpen
                actions={
                    shown() ? (
                        <button type="button" onClick={action}>
                            Custom action
                        </button>
                    ) : null
                }
                slotProps={{ actions: { class: "custom-actions" } }}
            />
        ));
        await settle();
        const actions = () =>
            document.querySelector(`[data-testid="${ids.actions}"]`);
        expect(actions()).toBeNull();
        setShown(true);
        await settle();
        expect(byTestId(ids.actions).classList.contains("custom-actions")).toBe(
            true,
        );
        (byTestId(ids.actions).firstElementChild as HTMLButtonElement).click();
        await settle();
        expect(action).toHaveBeenCalledTimes(1);
        expect(byTestId(ids.positioner).hidden).toBe(false);
        setShown(false);
        await settle();
        expect(actions()).toBeNull();
        expect(byTestId(ids.root).hasAttribute("actions")).toBe(false);
    });

    it.each([true, false])(
        "preserves closeOnSelect=%s with actions and a customized trigger",
        async (closeOnSelect) => {
            const onClick = vi.fn<() => void>();
            const onValueChange =
                vi.fn<
                    (details: { readonly value: readonly string[] }) => void
                >();
            withRegistry(() => (
                <DockedDatePicker
                    label="Date"
                    locale="en-US"
                    defaultValue={["2026-08-17"]}
                    closeOnSelect={closeOnSelect}
                    actions={<button type="button">Custom action</button>}
                    onValueChange={onValueChange}
                    slotProps={{
                        trailingIcon: { title: "Calendar trigger", onClick },
                    }}
                />
            ));
            await settle();
            const button = byTestId(ids.trailingIcon);
            expect(button.title).toBe("Calendar trigger");
            expect(button.getAttribute("aria-haspopup")).toBe("grid");
            button.click();
            await until(() =>
                expect(byTestId(ids.positioner).hidden).toBe(false),
            );
            expect(onClick).toHaveBeenCalledTimes(1);
            day("2026-08-20").click();
            await until(() =>
                expect(onValueChange).toHaveBeenLastCalledWith({
                    value: ["2026-08-20"],
                }),
            );
            await until(() =>
                expect(byTestId(ids.positioner).hidden).toBe(closeOnSelect),
            );
        },
    );

    it("renders the field, the format as supporting text, and the closed popup", async () => {
        withRegistry(() => <DockedDatePicker label="Date" locale="en-GB" />);
        await settle();
        expect(byTestId(ids.root).className).toBe(
            "docked-date-picker docked-date-picker--trailingIcon-true",
        );
        expect(byTestId(ids.label).textContent).toBe("Date");
        expect(byTestId(ids.supportingText).textContent).toBe("dd/mm/yyyy");
        // The input's placeholder is the format too, as React Native's (the preset shows it once
        // the field is focused and the label has floated).
        expect(byTestId<HTMLInputElement>(ids.input).placeholder).toBe(
            "dd/mm/yyyy",
        );
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-describedby")).toBe(
            byTestId(ids.supportingText).id,
        );
        expect(byTestId(ids.trailingIcon).tagName).toBe("BUTTON");
        expect(byTestId(ids.trailingIcon).getAttribute("aria-label")).toBe(
            "Open calendar",
        );
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            false,
        );
    });

    it("sets the value from a typed date once the field loses focus", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(() => (
            <DockedDatePicker
                label="Date"
                locale="en-US"
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.type(input, "08/17/2026");
        await settle();
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
        input.blur();
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-17"],
            }),
        );
    });

    it("opens from the trigger, and closes on choosing a day", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(() => (
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("08/17/2026");
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
        await userEvent.click(byTestId(ids.trailingIcon));
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(false));
        expect(byTestId(ids.monthButton).textContent).toBe("Aug");
        expect(byTestId(ids.yearButton).textContent).toBe("2026");
        expect(day("2026-08-17").parentElement!.className).toContain(
            "calendar-cell--selection-selected",
        );
        await userEvent.click(day("2026-08-21"));
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-21"],
            }),
        );
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("08/21/2026");
    });

    it("takes a function of each cell in its keys, in every view", async () => {
        withRegistry(() => (
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
                class={{
                    cell: (each) => (each.selected ? "chosen" : "plain"),
                }}
                // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                style={{ cell: { opacity: 0.5 } }}
            />
        ));
        await settle();
        const root = (value: string) => day(value).parentElement!;
        expect(root("2026-08-17").classList.contains("chosen")).toBe(true);
        expect(root("2026-08-18").classList.contains("plain")).toBe(true);
        expect(root("2026-08-18").style.opacity).toBe("0.5");
        await userEvent.click(byTestId(ids.monthButton));
        await settle();
        expect(root("8").classList.contains("chosen")).toBe(true);
        expect(root("3").classList.contains("plain")).toBe(true);
    });

    it("steps by months and years, and chooses a month from its list", async () => {
        withRegistry(() => (
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
            />
        ));
        await settle();
        const [, nextYear] = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.next}"]`,
        );
        await userEvent.click(nextYear!);
        await until(() =>
            expect(byTestId(ids.yearButton).textContent).toBe("2027"),
        );
        await userEvent.click(
            document.querySelectorAll<HTMLElement>(
                `[data-testid="${ids.next}"]`,
            )[0]!,
        );
        await until(() =>
            expect(byTestId(ids.monthButton).textContent).toBe("Sep"),
        );
        await userEvent.click(byTestId(ids.monthButton));
        await until(() =>
            expect(byTestId(ids.monthList).getAttribute("role")).toBe("grid"),
        );
        const march = document.querySelector<HTMLElement>(
            `[data-testid="${ids.monthList}"] [role="button"][data-value="3"]`,
        )!;
        expect(march.parentElement!.className).toContain(
            "calendar-cell--view-month",
        );
        await userEvent.click(march);
        await until(() =>
            expect(byTestId(ids.monthButton).textContent).toBe("Mar"),
        );
        expect(byTestId(ids.grid)).toBeTruthy();
    });

    it.each([
        [undefined, "Aug", "Sep"],
        ["long", "August", "September"],
        ["narrow", "A", "S"],
    ] as const)(
        "writes month names as monthFormat %s says, in the button and the list",
        async (monthFormat, button, september) => {
            withRegistry(() => (
                <DockedDatePicker
                    label="Date"
                    locale="en-US"
                    monthFormat={monthFormat}
                    defaultValue={["2026-08-17"]}
                    defaultOpen
                />
            ));
            await settle();
            expect(byTestId(ids.monthButton).textContent).toBe(button);
            await userEvent.click(byTestId(ids.monthButton));
            await until(() =>
                expect(byTestId(ids.monthList).getAttribute("role")).toBe(
                    "grid",
                ),
            );
            const months = [
                ...byTestId(ids.monthList).querySelectorAll(
                    "[data-view=month][role=button]",
                ),
            ].map((cell) => cell.textContent);
            expect(months[8]).toBe(september);
        },
    );

    it("shows an error in place of the format, and marks the input invalid", async () => {
        withRegistry(() => (
            <DockedDatePicker label="Date" locale="en-US" error="Too late" />
        ));
        await settle();
        expect(byTestId(ids.supportingText).textContent).toBe("Too late");
        expect(byTestId(ids.input).getAttribute("aria-invalid")).toBe("true");
    });

    it("mirrors the chevrons under rtl", async () => {
        withRegistry(
            () => <DockedDatePicker label="Date" locale="en-US" defaultOpen />,
            "rtl",
        );
        await settle();
        expect(byTestId(ids.prev).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.next).hasAttribute("data-pf-mirror")).toBe(true);
    });
});
