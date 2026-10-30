import { compositeTestIds, testIds } from "@pureform/anatomy";
import { expect, it, vi } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

it("sizes the SearchView hit target from the themed bar and follows instance and container changes", async () => {
    const component = COMPONENTS.find(
        (entry) => entry.component === "SearchView",
    )!;
    const host = document.createElement("div");
    host.style.width = "1000px";
    document.body.append(host);
    const scene = mountCase(
        component,
        {},
        {
            host,
            provider: {
                overrides: { "components.searchBar.maxWidth": "600px" },
            },
        },
    );
    await settlePlaced();
    const width = (id: string) =>
        host
            .querySelector<HTMLElement>(`[data-testid="${id}"]`)!
            .getBoundingClientRect().width;
    const matches = async (expected: number) => {
        await vi.waitFor(() => {
            expect(width(compositeTestIds.searchView.trigger)).toBeCloseTo(
                expected,
                0,
            );
            expect(width(testIds.searchBar.root)).toBeCloseTo(expected, 0);
        });
    };
    await matches(600);
    await scene.update({ searchBarProps: { tokens: { maxWidth: "420px" } } });
    await matches(420);
    await scene.update({ searchBarProps: { tokens: { maxWidth: "840px" } } });
    await matches(840);
    host.style.width = "300px";
    await matches(300);
    host.style.width = "1000px";
    await matches(840);
    host.remove();
});
