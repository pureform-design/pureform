import { compositeTestIds, testIds } from "@pureform/anatomy";
import { createSignal, createStore, flush } from "solid-js";
import { describe, expect, it } from "vitest";

import { ListItem } from ".";
import { PureformProvider, useIconStyle } from "..";
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

describe("ListItem, ready-made", () => {
    it("follows slot-keyed class, style, and slotProps as they change", async () => {
        const [classes, setClasses] = createSignal<
            Partial<Record<"root" | "supportingText", string>>
        >({});
        const [style, setStyle] = createSignal({
            root: { "margin-top": "1px" },
        });
        const [headline, setHeadline] = createStore({ title: "first" });
        withRegistry(() => (
            <ListItem
                headline="Inbox"
                supportingText="3 new"
                class={classes()}
                style={style()}
                slotProps={{ headline }}
            />
        ));
        await settle();
        expect(byTestId(ids.headline).className).toBe("list-item__headline");
        expect(byTestId(ids.headline).title).toBe("first");
        setClasses({ root: "wide", supportingText: "muted" });
        setStyle({ root: { "margin-top": "2px" } });
        setHeadline((draft) => {
            draft.title = "second";
        });
        flush();
        expect(byTestId(ids.root).className).toContain(" wide");
        expect(byTestId(ids.supportingText).className).toBe(
            "list-item__supportingText muted",
        );
        expect(byTestId(ids.root).style.marginTop).toBe("2px");
        expect(byTestId(ids.headline).title).toBe("second");
        setClasses({});
        flush();
        expect(byTestId(ids.root).className).not.toContain("wide");
        expect(byTestId(ids.supportingText).className).toBe(
            "list-item__supportingText",
        );
    });

    it("builds its leading content once, inside the leading part's icon context", async () => {
        const style = document.createElement("style");
        style.textContent = `.list-item__leading { font-size: 22px; }`;
        document.head.append(style);
        let builds = 0;
        function Glyph() {
            builds++;
            const icon = useIconStyle();
            return <i data-size={String(icon().size)} />;
        }
        const [shown, setShown] = createSignal(true);
        withRegistry(() => (
            <ListItem
                headline="Inbox"
                leading={shown() ? <Glyph /> : undefined}
            />
        ));
        await settle();
        expect(builds).toBe(1);
        const glyph = byTestId(ids.leading).querySelector("i")!;
        expect(glyph.dataset.size).toBe("22");
        setShown(false);
        await settle();
        expect(document.querySelector(`[data-testid="${ids.leading}"]`)).toBe(
            null,
        );
        setShown(true);
        await settle();
        expect(builds).toBe(2);
        expect(byTestId(ids.leading).querySelector("i")!.dataset.size).toBe(
            "22",
        );
        style.remove();
    });

    it("renders the parts of literal content without testing it again", async () => {
        withRegistry(() => (
            <ListItem headline="Inbox" overline="Mail" trailingText="3" />
        ));
        await settle();
        expect(
            [...byTestId(ids.root).children].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["content", "trailing-text"]);
        expect(byTestId(ids.overline).textContent).toBe("Mail");
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

    it("keeps an item's row while its value stays, and updates it", async () => {
        const [items, setItems] = createSignal([
            { value: "inbox", headline: "Inbox" },
            { value: "sent", headline: "Sent" },
        ]);
        withRegistry(() => <List items={items()} />);
        await settle();
        const rows = () => [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${compositeTestIds.list.item}"]`,
            ),
        ];
        const [inbox, sent] = rows();
        setItems([
            { value: "drafts", headline: "Drafts" },
            { value: "inbox", headline: "Inbox (3)" },
            { value: "sent", headline: "Sent" },
        ]);
        await settle();
        expect(rows().map((row) => row.textContent)).toEqual([
            "Drafts",
            "Inbox (3)",
            "Sent",
        ]);
        expect(rows()[1]).toBe(inbox);
        expect(rows()[2]).toBe(sent);
    });

    it("leaves a row alone while its item is the same object", async () => {
        let reads = 0;
        const inbox = {
            value: "inbox",
            get headline() {
                reads++;
                return "Inbox";
            },
        };
        const [items, setItems] = createSignal<
            readonly { value: string; headline: string }[]
        >([inbox]);
        withRegistry(() => <List items={items()} />);
        await settle();
        const before = reads;
        setItems([{ value: "drafts", headline: "Drafts" }, inbox]);
        await settle();
        expect(reads).toBe(before);
    });
});
