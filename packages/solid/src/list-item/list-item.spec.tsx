import { compositeTestIds, testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { ListItem } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { List } from "../list";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.listItem;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={navigationRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("ListItem", () => {
    it("renders a row with the parts it has content for, its lines from them", async () => {
        withRegistry(() => (
            <ListItem
                headline="Inbox"
                supportingText="3 new"
                leading="✉"
                trailingText="3"
            />
        ));
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
        withRegistry(() => (
            <ListItem headline="Inbox" href="#inbox" selected />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#inbox");
        expect(root.getAttribute("aria-current")).toBe("page");
        expect(root.className).toContain("list-item--interactive-true");
    });

    it("is a disabled button with as", async () => {
        withRegistry(() => (
            <ListItem headline="Archive" as="button" disabled />
        ));
        await settle();
        const root = byTestId<HTMLButtonElement>(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.type).toBe("button");
        expect(root.disabled).toBe(true);
    });
});

describe("List", () => {
    it("renders a ul with an li around each item, which take the list's variants", async () => {
        withRegistry(() => (
            <List
                density="compact"
                items={[
                    { headline: "Inbox", testId: "inbox" },
                    { headline: "Sent", density: undefined, testId: "sent" },
                ]}
                slotProps={{ headline: { class: "bold" } }}
            />
        ));
        await settle();
        const root = byTestId(compositeTestIds.list.root);
        expect(root.tagName).toBe("UL");
        expect(root.className).toBe("");
        const wrappers = document.querySelectorAll(
            `[data-testid="${compositeTestIds.list.item}"]`,
        );
        expect(wrappers).toHaveLength(2);
        expect(wrappers[0]!.tagName).toBe("LI");
        expect(byTestId("inbox-root").className).toContain(
            "list-item--density-compact",
        );
        expect(byTestId("sent-headline").className).toBe(
            "list-item__headline bold",
        );
    });
});
