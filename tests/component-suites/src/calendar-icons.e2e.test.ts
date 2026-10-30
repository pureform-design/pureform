// A calendar's previous and next buttons draw a chevron, in the modal and the docked date picker.

import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

const named = (name: string) =>
    COMPONENTS.find((component) => component.component === name)!;

describe.each([
    ["DatePicker", named("DatePicker"), compositeTestIds.datePicker],
    [
        "DockedDatePicker",
        named("DockedDatePicker"),
        compositeTestIds.dockedDatePicker,
    ],
] as const)("%s", (_name, component, ids) => {
    it.each(["prev", "next"] as const)(
        "draws a chevron in %s",
        async (part) => {
            const { host } = mountCase(component, { defaultOpen: true });
            await settlePlaced();
            const button = document.querySelector<HTMLElement>(
                `[data-testid="${ids[part]}"]`,
            )!;
            const glyph = button.querySelector("svg")!;
            expect(glyph).not.toBeNull();
            const box = glyph.getBoundingClientRect();
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
            host.remove();
        },
    );
});
