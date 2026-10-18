// A smoke test of the demo: its page renders in Chromium from the registry the bundler plugin
// writes, styled by the generated stylesheet, without an error.

import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

const errors: unknown[][] = [];

beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation((...args) => {
        errors.push(args);
    });
    const host = document.createElement("main");
    host.id = "app";
    document.body.append(host);
    await import("./main");
});

afterAll(() => vi.restoreAllMocks());

it("renders the page, styled, without errors", async () => {
    await expect
        .element(page.getByRole("heading", { level: 1 }))
        .toHaveTextContent("pureform, Solid on plain CSS");
    const filled = page.getByRole("button", { name: "filled", exact: true });
    await expect.element(filled).toBeVisible();
    // Transparent unless the generated stylesheet applies.
    expect(getComputedStyle(filled.element()).backgroundColor).not.toBe(
        "rgba(0, 0, 0, 0)",
    );
    expect(errors).toEqual([]);
});
