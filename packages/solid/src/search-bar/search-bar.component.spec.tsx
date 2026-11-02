import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SearchBar } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.searchBar;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("SearchBar", () => {
    it("renders a label around the parts it has content for and a named search input", async () => {
        withRegistry(() => (
            <SearchBar
                aria-label="Search mail"
                placeholder="Search mail"
                leading="⌕"
                name="q"
            />
        ));
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
        withRegistry(() => (
            <SearchBar aria-label="Search" onValueChange={onValueChange} />
        ));
        await settle();
        await userEvent.type(byTestId(ids.input), "a");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "a" });
    });
});
