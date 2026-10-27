import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { settlePlaced } from "./harness/page";

describe("calendar current period", () => {
    it.each([
        ["DatePicker", "year", compositeTestIds.datePicker.viewTrigger],
        [
            "DockedDatePicker",
            "year",
            compositeTestIds.dockedDatePicker.yearButton,
        ],
        [
            "DockedDatePicker",
            "month",
            compositeTestIds.dockedDatePicker.monthButton,
        ],
    ] as const)(
        "forwards current-period state in %s's %s view",
        async (component, view, trigger) => {
            const now = new Date();
            const year = now.getFullYear();
            const value = view === "year" ? year : now.getMonth() + 1;
            const mounted = harness.mount({
                component,
                props: {
                    defaultOpen: true,
                    defaultValue: [`${year}-01-15`],
                    slotProps: {
                        cell: (cell: {
                            value: string | number;
                            today: boolean;
                            outside: boolean;
                        }) => ({
                            "data-period": String(cell.value),
                            "data-current": String(cell.today),
                            "data-outside": String(cell.outside),
                        }),
                    },
                },
            });
            await settlePlaced();
            await userEvent.click(
                mounted.host.querySelector<HTMLElement>(
                    `[data-testid="${trigger}"]`,
                )!,
            );
            await settlePlaced();
            const current = mounted.host.querySelector<HTMLElement>(
                `[data-period="${value}"]`,
            )!;
            expect(current).not.toBeNull();
            expect(current.dataset.current).toBe("true");
            expect(current.dataset.outside).toBe("false");
            const other = mounted.host.querySelector<HTMLElement>(
                `[data-period="${view === "year" ? year - 1 : (value % 12) + 1}"]`,
            )!;
            expect(other.dataset.current).toBe("false");
        },
    );
});
