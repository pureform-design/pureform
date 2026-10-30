// A select's trailing arrow opens its list when clicked, as the field does.

import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

describe.each(["Select", "Autocomplete"] as const)("%s", (name) => {
    const component = COMPONENTS.find((entry) => entry.component === name)!;
    it("opens when its arrow is clicked", async () => {
        const { host } = mountCase(component);
        await settlePlaced();
        const arrow = host.querySelector<HTMLElement>(
            `[data-testid="${testIds[name === "Select" ? "select" : "autocomplete"].trailingIcon}"]`,
        )!;
        expect(arrow).not.toBeNull();
        const box = arrow.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        await commands.mouse("move", x, y);
        await commands.mouse("down", x, y);
        await commands.mouse("up", x, y);
        await vi.waitFor(() =>
            expect(
                host
                    .querySelector('[role="combobox"]')
                    ?.getAttribute("aria-expanded"),
            ).toBe("true"),
        );
        host.remove();
    });
});
