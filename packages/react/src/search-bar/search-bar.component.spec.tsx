import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SearchBar } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { interact, mount, settle } from "../testing/render";

const ids = testIds.searchBar;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("SearchBar", () => {
    it("renders a label around the parts it has content for and a named search input", async () => {
        withRegistry(
            <SearchBar
                aria-label="Search mail"
                placeholder="Search mail"
                leading="⌕"
                name="q"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("LABEL");
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["leading", "input"]);
        expect(byTestId(ids.leading).getAttribute("aria-hidden")).toBe("true");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.type).toBe("search");
        expect(input.placeholder).toBe("Search mail");
        expect(input.name).toBe("q");
        expect(input.getAttribute("aria-label")).toBe("Search mail");
    });

    it("takes typing and reports it", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        withRegistry(
            <SearchBar aria-label="Search" onValueChange={onValueChange} />,
        );
        await settle();
        await interact(() => userEvent.type(byTestId(ids.input), "a"));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "a" });
    });
});
