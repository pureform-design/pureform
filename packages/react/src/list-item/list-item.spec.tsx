import { testIds } from "@pureform/anatomy";
import { useState } from "react";
import type { ReactNode } from "react";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { ListItem } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { List } from "../list";
import { mount, settle } from "../testing/render";

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

const ids = testIds.listItem;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={navigationRegistry()}>
            {view}
        </PureformProvider>,
    );

describe("ListItem", () => {
    it("renders a row with the parts it has content for, its lines from them", async () => {
        withRegistry(
            <ListItem
                headline="Inbox"
                supportingText="3 new"
                leading="✉"
                trailingText="3"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("DIV");
        expect(root.className).toBe(
            "list-item list-item--lines-two list-item--interactive-false",
        );
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["leading", "content", "trailing-text"]);
        expect(byTestId(ids.leading).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.headline).textContent).toBe("Inbox");
        expect(document.querySelector(`[data-testid="${ids.overline}"]`)).toBe(
            null,
        );
    });

    it("is an interactive link with an href, current while selected", async () => {
        withRegistry(<ListItem headline="Inbox" href="#inbox" selected />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#inbox");
        expect(root.getAttribute("aria-current")).toBe("page");
        expect(root.className).toContain("list-item--interactive-true");
    });

    it("is a disabled button with as", async () => {
        withRegistry(<ListItem headline="Archive" as="button" disabled />);
        await settle();
        const root = byTestId<HTMLButtonElement>(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.type).toBe("button");
        expect(root.disabled).toBe(true);
    });
});

describe("ListItem, ready-made", () => {
    it("follows slot-keyed className, style, and slotProps as they change", async () => {
        let restyle!: () => void;
        function Row() {
            const [later, setLater] = useState(false);
            restyle = () => setLater(true);
            return (
                <ListItem
                    headline="Inbox"
                    supportingText="3 new"
                    className={
                        later ? { root: "wide", supportingText: "muted" } : {}
                    }
                    style={{ root: { marginTop: later ? "2px" : "1px" } }}
                    slotProps={{
                        headline: { title: later ? "second" : "first" },
                    }}
                />
            );
        }
        withRegistry(<Row />);
        await settle();
        expect(byTestId(ids.headline).title).toBe("first");
        expect(byTestId(ids.supportingText).className).toBe(
            "list-item__supportingText",
        );
        await act(async () => restyle());
        expect(byTestId(ids.root).className).toContain(" wide");
        expect(byTestId(ids.supportingText).className).toBe(
            "list-item__supportingText muted",
        );
        expect(byTestId(ids.root).style.marginTop).toBe("2px");
        expect(byTestId(ids.headline).title).toBe("second");
    });
});

describe("List", () => {
    it("renders a ul with an li around each item, which take the list's variants", async () => {
        withRegistry(
            <List
                density="compact"
                items={[
                    { headline: "Inbox", testId: "inbox" },
                    { headline: "Sent", density: undefined, testId: "sent" },
                ]}
                slotProps={{ headline: { className: "bold" } }}
            />,
        );
        await settle();
        const root = byTestId(testIds.list.root);
        expect(root.tagName).toBe("UL");
        expect(root.className).toBe("list");
        const wrappers = document.querySelectorAll(
            `[data-testid="${testIds.list.item}"]`,
        );
        expect(wrappers).toHaveLength(2);
        expect(wrappers[0]!.tagName).toBe("LI");
        expect(wrappers[0]!.className).toBe("list__item");
        expect(byTestId("inbox-root").className).toContain(
            "list-item--density-compact",
        );
        expect(byTestId("sent-headline").className).toBe(
            "list-item__headline bold",
        );
    });

    it("gives a segmented list's items their positions, an item's own winning", async () => {
        withRegistry(
            <List
                variant="segmented"
                leadingType="avatar"
                items={[
                    { headline: "A", testId: "a" },
                    { headline: "B", testId: "b" },
                    { headline: "C", testId: "c", position: "single" },
                    { headline: "D", testId: "d", leadingType: "icon" },
                ]}
            />,
        );
        await settle();
        expect(byTestId(testIds.list.root).className).toBe(
            "list list--variant-segmented",
        );
        expect(byTestId("a-root").className).toContain(
            "list-item--position-first",
        );
        expect(byTestId("a-root").className).toContain(
            "list-item--leadingType-avatar",
        );
        expect(byTestId("b-root").className).toContain(
            "list-item--position-middle",
        );
        expect(byTestId("c-root").className).toContain(
            "list-item--position-single",
        );
        expect(byTestId("d-root").className).toContain(
            "list-item--position-last",
        );
        expect(byTestId("d-root").className).toContain(
            "list-item--leadingType-icon",
        );
        expect(byTestId("d-root").hasAttribute("position")).toBe(false);
    });

    it("leaves a standard list's items without a position", async () => {
        withRegistry(<List items={[{ headline: "A", testId: "a" }]} />);
        await settle();
        expect(byTestId("a-root").className).toContain(
            "list-item--position-none",
        );
    });
});
