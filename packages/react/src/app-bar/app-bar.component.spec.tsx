import { testIds } from "@pureform/anatomy";
import { act, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { AppBar } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, outside, settle } from "../testing/render";

const ids = testIds.appBar;

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

const parts = () =>
    [...byTestId(ids.root).children].map((part) =>
        part.getAttribute("data-pf-part"),
    );

describe("AppBar", () => {
    it("renders a header with the headline between the leading and trailing parts", async () => {
        withRegistry(
            <AppBar
                leading={<button aria-label="Back">←</button>}
                headline="Inbox"
                subtitle="12 unread"
                trailing={<button aria-label="More">⋮</button>}
                mirrorLeading
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("HEADER");
        expect(root.className).toContain("app-bar--collapsed-false");
        expect(parts()).toEqual(["leading", "content", "trailing"]);
        expect(byTestId(ids.headline).tagName).toBe("H1");
        expect(byTestId(ids.headline).textContent).toBe("Inbox");
        expect(byTestId(ids.subtitle).textContent).toBe("12 unread");
        expect(byTestId(ids.leading).hasAttribute("data-pf-mirror")).toBe(true);
    });

    it("puts an expanded flexible bar's headline last, and collapses it once scrolled past", async () => {
        const offset = outside(0);
        withRegistry(
            <offset.Holder>
                {(current) => (
                    <AppBar
                        size="mediumFlexible"
                        headline="Inbox"
                        scrollOffset={current}
                    />
                )}
            </offset.Holder>,
        );
        await settle();
        expect(parts()).toEqual(["leading", "trailing", "content"]);
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-false",
        );
        await offset.set(10);
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-true",
        );
        expect(byTestId(ids.root).className).toContain(
            "app-bar--collapsed-false",
        );
        await offset.set(100);
        expect(byTestId(ids.root).className).toContain(
            "app-bar--collapsed-true",
        );
        expect(parts()).toEqual(["leading", "content", "trailing"]);
        await offset.set(0);
        expect(parts()).toEqual(["leading", "trailing", "content"]);
    });

    it("follows the scroll target's offset", async () => {
        const scroller = document.createElement("div");
        scroller.style.cssText = "height: 50px; overflow: auto";
        scroller.innerHTML = '<div style="height: 500px"></div>';
        document.body.append(scroller);
        withRegistry(<AppBar headline="Inbox" scrollTarget={scroller} />);
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-false",
        );
        await act(async () => {
            scroller.scrollTop = 40;
            scroller.dispatchEvent(new Event("scroll"));
        });
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-true",
        );
        scroller.remove();
    });

    it("holds a search bar in place of the headline, drawn scrolled with the bar", async () => {
        withRegistry(
            <AppBar
                size="largeFlexible"
                searchBarProps={{ "aria-label": "Search mail" }}
                scrolled
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("app-bar--search-true");
        expect(root.className).toContain("app-bar--size-small");
        expect(parts()).toEqual(["leading", "content", "trailing"]);
        const bar = byTestId(testIds.searchBar.root);
        expect(byTestId(ids.content).contains(bar)).toBe(true);
        expect(bar.className).toContain("search-bar--scrolled-true");
        expect(bar.className).toContain("search-bar--centered-true");
    });
});
