import { compositeTestIds, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { SearchView } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { interact, mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.searchView;
const items = compositeTestIds.searchViewMenu;
const bar = testIds.searchBar;

const ITEMS = [
    { value: "inbox", label: "Inbox", supportingText: "Mail" },
    { value: "invoices", label: "Invoices" },
    { value: "drafts", label: "Drafts" },
];

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const shown = () =>
    [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${items.itemLabel}"]`,
        ),
    ].map((element) => element.textContent);

describe("SearchView, ready-made", () => {
    it("renders the search bar that opens it, and the view as a hidden modal dialog", async () => {
        withRegistry(<SearchView placeholder="Search mail" items={ITEMS} />);
        await settle();
        expect(byTestId(ids.trigger).contains(byTestId(bar.input))).toBe(true);
        const surface = byTestId(ids.surface);
        expect(surface.className).toBe("search-view");
        expect(surface.getAttribute("role")).toBe("dialog");
        expect(surface.getAttribute("aria-label")).toBe("Search mail");
        expect(byTestId(ids.header).className).toBe("search-view__header");
        expect(byTestId(ids.divider).className).toBe("search-view__divider");
        expect(byTestId(ids.input).getAttribute("role")).toBe("combobox");
        expect(byTestId(ids.content).getAttribute("role")).toBe("listbox");
        const positioner = byTestId(ids.positioner);
        expect(positioner.hidden).toBe(true);
        expect(positioner.style.position).toBe("fixed");
        expect(byTestId(ids.root).style.position).toBe("relative");
    });

    it("opens from a native button named by the placeholder, saying it opens a dialog and whether it's open", async () => {
        withRegistry(<SearchView placeholder="Search mail" items={ITEMS} />);
        await settle();
        const trigger = byTestId(ids.trigger);
        expect(trigger.tagName).toBe("BUTTON");
        expect(trigger.getAttribute("type")).toBe("button");
        expect(trigger.getAttribute("aria-label")).toBe("Search mail");
        expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(trigger.getAttribute("aria-controls")).toBe(
            byTestId(ids.surface).id,
        );
        // The bar inside is only its look: nothing in it takes focus.
        expect(byTestId(bar.input).closest("[inert]")).not.toBeNull();
        trigger.focus();
        await interact(() => userEvent.keyboard(" "));
        await frames();
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        // Space opens it without typing a space into the query.
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("");
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(trigger);
        await interact(() => userEvent.keyboard("{Enter}"));
        await frames();
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    it("drops a docked or contained view over the bar's place", async () => {
        withRegistry(<SearchView variant="contained" placeholder="Search" />);
        await settle();
        expect(byTestId(ids.positioner).style.position).toBe("absolute");
        expect(byTestId(ids.surface).className).toBe(
            "search-view search-view--variant-contained",
        );
    });

    it("opens from the bar, takes focus, traps it, and gives it back on Escape", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(
            <>
                <button type="button">Before</button>
                <SearchView
                    placeholder="Search"
                    items={ITEMS}
                    onOpenChange={onOpenChange}
                />
            </>,
        );
        await settle();
        const trigger = byTestId(ids.trigger);
        await interact(() => userEvent.click(trigger));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(document.activeElement).toBe(input);
        // Focus stays in the view.
        for (let i = 0; i < 4; i++) {
            await interact(() => userEvent.tab());
            expect(byTestId(ids.surface).contains(document.activeElement)).toBe(
                true,
            );
        }
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it("carries a key typed in the bar into the query, and filters the suggestions", async () => {
        withRegistry(<SearchView placeholder="Search" items={ITEMS} />);
        await settle();
        byTestId(ids.trigger).focus();
        await interact(() => userEvent.keyboard("i"));
        await frames();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe("i");
        await interact(() => userEvent.keyboard("nv"));
        expect(shown()).toEqual(["Invoices"]);
    });

    it("chooses a suggestion with the keys, then closes and shows it in the bar", async () => {
        const onSelect =
            vi.fn<NonNullable<ComponentProps<typeof SearchView>["onSelect"]>>();
        withRegistry(
            <SearchView
                placeholder="Search"
                items={ITEMS}
                onSelect={onSelect}
            />,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        await interact(() => userEvent.keyboard("{ArrowDown}{Enter}"));
        await frames();
        expect(onSelect).toHaveBeenCalledWith({
            value: "inbox",
            item: ITEMS[0],
        });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(byTestId<HTMLInputElement>(bar.input).value).toBe("Inbox");
    });

    it("submits the query on Enter with nothing highlighted, and clears it", async () => {
        const onSubmit =
            vi.fn<NonNullable<ComponentProps<typeof SearchView>["onSubmit"]>>();
        withRegistry(
            <SearchView
                placeholder="Search"
                items={ITEMS}
                onSubmit={onSubmit}
                closeOnSelect={false}
            />,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.trigger)));
        await frames();
        await interact(() => userEvent.keyboard("zebra{Enter}"));
        expect(onSubmit).toHaveBeenCalledWith({ inputValue: "zebra" });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await interact(() =>
            userEvent.click(byTestId(ids.trailing).querySelector("button")!),
        );
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("");
        expect(document.activeElement).toBe(byTestId(ids.input));
    });

    it("closes with its back button", async () => {
        withRegistry(
            <SearchView defaultOpen placeholder="Search" backLabel="Done" />,
        );
        await frames();
        const back = byTestId(ids.leading).querySelector("button")!;
        expect(back.getAttribute("aria-label")).toBe("Done");
        await interact(() => userEvent.click(back));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });
});
