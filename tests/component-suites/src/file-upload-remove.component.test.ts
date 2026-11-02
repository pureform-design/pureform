// The remove button of an uploaded file fits its slot: its box (and so its focus ring) isn't
// squeezed into the icon-sized trailing part.

import { expect, it, vi } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

it("gives the remove button its own size, not the icon's", async () => {
    const component = COMPONENTS.find(
        (entry) => entry.component === "FileUpload",
    )!;
    const { host } = mountCase(component, {});
    await settlePlaced();
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() =>
        expect(host.querySelector('[aria-label^="Remove"]')).not.toBeNull(),
    );
    const button = host.querySelector<HTMLElement>('[aria-label^="Remove"]')!;
    const slot = button.parentElement!;
    const box = button.getBoundingClientRect();
    const around = slot.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(30);
    expect(around.width).toBeGreaterThanOrEqual(box.width - 0.5);
    expect(around.height).toBeGreaterThanOrEqual(box.height - 0.5);
});
