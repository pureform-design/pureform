import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { settlePlaced } from "./harness/page";

describe("calendar current period", () => {
    it("forwards current-year state to styling and cell instance props", async () => {
        const year = new Date().getFullYear();
        const mounted = harness.mount({
            component: "DatePicker",
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
                `[data-testid="${compositeTestIds.datePicker.viewTrigger}"]`,
            )!,
        );
        await settlePlaced();
        const current = mounted.host.querySelector<HTMLElement>(
            `[data-period="${year}"]`,
        )!;
        expect(current).not.toBeNull();
        expect(current.dataset.current).toBe("true");
        expect(current.dataset.outside).toBe("false");
        const other = mounted.host.querySelector<HTMLElement>(
            `[data-period="${year - 1}"]`,
        )!;
        expect(other.dataset.current).toBe("false");
    });
});
