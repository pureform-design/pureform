import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";

import { AppBar } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.appBar;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const parts = () =>
    [...byTestId(ids.root).children].map((part) =>
        part.getAttribute("data-pf-part"),
    );

describe("AppBar", () => {
    it("renders a header with the headline between the leading and trailing parts", async () => {
        withRegistry(() => (
            <AppBar
                leading={<button aria-label="Back">←</button>}
                headline="Inbox"
                subtitle="12 unread"
                trailing={<button aria-label="More">⋮</button>}
                mirrorLeading
            />
        ));
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
        const [offset, setOffset] = createSignal(0);
        withRegistry(() => (
            <AppBar
                size="mediumFlexible"
                headline="Inbox"
                scrollOffset={offset()}
            />
        ));
        await settle();
        expect(parts()).toEqual(["leading", "trailing", "content"]);
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-false",
        );
        setOffset(10);
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-true",
        );
        expect(byTestId(ids.root).className).toContain(
            "app-bar--collapsed-false",
        );
        setOffset(100);
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "app-bar--collapsed-true",
        );
        expect(parts()).toEqual(["leading", "content", "trailing"]);
        setOffset(0);
        await settle();
        expect(parts()).toEqual(["leading", "trailing", "content"]);
    });

    it("follows the scroll target's offset", async () => {
        const scroller = document.createElement("div");
        scroller.style.cssText = "height: 50px; overflow: auto";
        scroller.innerHTML = '<div style="height: 500px"></div>';
        document.body.append(scroller);
        withRegistry(() => <AppBar headline="Inbox" scrollTarget={scroller} />);
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-false",
        );
        scroller.scrollTop = 40;
        scroller.dispatchEvent(new Event("scroll"));
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "app-bar--scrolled-true",
        );
        scroller.remove();
    });

    it("holds a search bar in place of the headline, drawn scrolled with the bar", async () => {
        withRegistry(() => (
            <AppBar
                size="largeFlexible"
                searchBar={{ "aria-label": "Search mail" }}
                scrolled
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("app-bar--search-true");
        expect(root.className).toContain("app-bar--collapsed-false");
        expect(parts()).toEqual(["leading", "content", "trailing"]);
        const bar = byTestId(testIds.searchBar.root);
        expect(byTestId(ids.content).contains(bar)).toBe(true);
        expect(bar.className).toContain("search-bar--scrolled-true");
        expect(bar.className).toContain("search-bar--centered-true");
    });
});
