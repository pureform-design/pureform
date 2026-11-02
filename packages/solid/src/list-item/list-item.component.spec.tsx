import { testIds } from "@pureform/anatomy";
import { createSignal, createStore, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ListItem } from ".";
import type { ChangeDetails } from "..";
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

    it("hides a trailing icon from assistive technology, but not a trailing control", async () => {
        withRegistry(() => (
            <>
                <ListItem headline="Icon" trailing="★" testId="icon" />
                <ListItem
                    headline="Control"
                    trailing={<button type="button">Remove</button>}
                    trailingControl
                    testId="control"
                />
            </>
        ));
        await settle();
        expect(byTestId("icon-trailing").getAttribute("aria-hidden")).toBe(
            "true",
        );
        const control = byTestId("control-trailing");
        expect(control.hasAttribute("aria-hidden")).toBe(false);
        expect(control.hasAttribute("control")).toBe(false);
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

    it("takes its leading type and position, off its element", async () => {
        withRegistry(() => (
            <ListItem
                headline="Inbox"
                leadingType="thumbnail"
                position="first"
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("list-item--leadingType-thumbnail");
        expect(root.className).toContain("list-item--position-first");
        expect(root.hasAttribute("position")).toBe(false);
        expect(root.hasAttribute("leadingtype")).toBe(false);
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
                class={{ item: "row" }}
                listItemProps={{ class: { headline: "bold" } }}
            />
        ));
        await settle();
        const root = byTestId(testIds.list.root);
        expect(root.tagName).toBe("UL");
        expect(root.className).toBe("list");
        const wrappers = document.querySelectorAll(
            `[data-testid="${testIds.list.item}"]`,
        );
        expect(wrappers).toHaveLength(2);
        expect(wrappers[0]!.tagName).toBe("LI");
        expect(wrappers[0]!.className).toBe("list__item row");
        expect(byTestId("inbox-root").className).toContain(
            "list-item--density-compact",
        );
        expect(byTestId("sent-headline").className).toBe(
            "list-item__headline bold",
        );
    });

    it("gives every item listItemProps under its own", async () => {
        withRegistry(() => (
            <List
                class={{ root: "inbox" }}
                listItemProps={{ class: { headline: "bold" } }}
                items={[
                    { headline: "A", testId: "a" },
                    { headline: "B", testId: "b", class: { headline: "own" } },
                ]}
            />
        ));
        await settle();
        expect(byTestId(testIds.list.root).className).toBe("list inbox");
        expect(byTestId("a-headline").className).toBe(
            "list-item__headline bold",
        );
        expect(byTestId("b-headline").className).toBe(
            "list-item__headline bold own",
        );
    });

    it("gives a segmented list's items their positions, an item's own winning", async () => {
        withRegistry(() => (
            <List
                variant="segmented"
                leadingType="avatar"
                items={[
                    { headline: "Inbox", testId: "inbox" },
                    { headline: "Sent", testId: "sent" },
                    {
                        headline: "Drafts",
                        testId: "drafts",
                        position: "single",
                    },
                    { headline: "Trash", testId: "trash" },
                ]}
            />
        ));
        await settle();
        expect(byTestId(testIds.list.root).className).toBe(
            "list list--variant-segmented",
        );
        const position = (id: string) =>
            byTestId(`${id}-root`).className.match(
                /list-item--position-(\w+)/,
            )?.[1];
        expect(["inbox", "sent", "drafts", "trash"].map(position)).toEqual([
            "first",
            "middle",
            "single",
            "last",
        ]);
        expect(byTestId("inbox-root").className).toContain(
            "list-item--leadingType-avatar",
        );
    });

    it("gives a lone segmented item the single position, and none outside a segmented list", async () => {
        withRegistry(() => (
            <>
                <List
                    variant="segmented"
                    items={[{ headline: "Only", testId: "only" }]}
                />
                <List items={[{ headline: "Plain", testId: "plain" }]} />
            </>
        ));
        await settle();
        expect(byTestId("only-root").className).toContain(
            "list-item--position-single",
        );
        expect(byTestId("plain-root").className).not.toContain("position");
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
                `[data-testid="${testIds.list.item}"]`,
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

describe("ListItem, expandable", () => {
    it("draws a button with an indicator, and its region after it, hidden while collapsed", async () => {
        withRegistry(() => (
            <ListItem headline="Folders" region={<span>Work</span>} />
        ));
        await settle();
        const root = byTestId(ids.root);
        const region = byTestId(ids.region);
        expect(root.tagName).toBe("BUTTON");
        expect(root.className).toContain("list-item--interactive-true");
        expect(root.getAttribute("aria-expanded")).toBe("false");
        expect(root.getAttribute("aria-controls")).toBe(region.id);
        expect(root.lastElementChild).toBe(byTestId(ids.indicator));
        expect(byTestId(ids.indicator).getAttribute("aria-hidden")).toBe(
            "true",
        );
        expect(byTestId(ids.indicator).querySelector("svg")).not.toBeNull();
        expect(root.nextElementSibling).toBe(region);
        expect(region.className).toBe("list-item__region");
        expect(region.getAttribute("role")).toBe("region");
        expect(region.getAttribute("aria-labelledby")).toBe(root.id);
        expect(region.hidden).toBe(true);
        expect(region.textContent).toBe("Work");
    });

    it("expands and collapses with a click or Enter, and reports it", async () => {
        const seen: boolean[] = [];
        withRegistry(() => (
            <ListItem
                headline="Folders"
                region="Work"
                onExpandedChange={({ expanded }) => seen.push(expanded)}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        await userEvent.click(root);
        await settle();
        expect(root.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(ids.region).hidden).toBe(false);
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(root.getAttribute("aria-expanded")).toBe("false");
        expect(byTestId(ids.region).hidden).toBe(true);
        expect(seen).toEqual([true, false]);
    });

    it("follows a controlled expanded", async () => {
        const [expanded, setExpanded] = createSignal(true);
        withRegistry(() => (
            <ListItem headline="Folders" region="Work" expanded={expanded()} />
        ));
        await settle();
        expect(byTestId(ids.region).hidden).toBe(false);
        setExpanded(false);
        flush();
        await settle();
        expect(byTestId(ids.root).getAttribute("aria-expanded")).toBe("false");
    });

    it("composes Expandable around Root and Region, and nests in a List's item", async () => {
        withRegistry(() => (
            <List.Root>
                <List.Item>
                    <ListItem.Expandable defaultExpanded>
                        <ListItem.Root>
                            <ListItem.Content>
                                <ListItem.Headline>Folders</ListItem.Headline>
                            </ListItem.Content>
                            <ListItem.Indicator />
                        </ListItem.Root>
                        <ListItem.Region>
                            <ListItem headline="Work" />
                        </ListItem.Region>
                    </ListItem.Expandable>
                </List.Item>
            </List.Root>
        ));
        await settle();
        const [row, nested] = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.root}"]`,
        );
        expect(row!.tagName).toBe("BUTTON");
        expect(row!.getAttribute("aria-expanded")).toBe("true");
        expect(row!.parentElement!.tagName).toBe("LI");
        expect(byTestId(ids.region).contains(nested!)).toBe(true);
        expect(nested!.tagName).toBe("DIV");
        expect(nested!.hasAttribute("aria-expanded")).toBe(false);
    });

    it("keeps an item without a region as it was", async () => {
        withRegistry(() => <ListItem headline="Inbox" />);
        await settle();
        expect(byTestId(ids.root).tagName).toBe("DIV");
        expect(document.querySelector(`[data-testid="${ids.indicator}"]`)).toBe(
            null,
        );
    });
});

describe("a swipeable ListItem", () => {
    const pointer = (
        element: Element,
        type: "pointerdown" | "pointermove" | "pointerup",
        clientX: number,
    ) =>
        element.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                pointerId: 1,
                pointerType: "touch",
                isPrimary: true,
                clientX,
            }),
        );

    it("starts press feedback and cancels it when the swipe becomes a drag", async () => {
        const source = createInteractionSource();
        const events: string[] = [];
        source.subscribe((event) => events.push(event.type));
        withRegistry(() => (
            <ListItem
                headline="Message"
                swipeAction="Delete"
                interactionSource={source}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        pointer(root, "pointerdown", 200);
        expect(source.state.pressed).toBe(true);
        pointer(root, "pointermove", 140);
        await settle();
        expect(source.state.pressed).toBe(false);
        expect(source.state.dragged).toBe(true);
        expect(events).toContain("cancel");
        pointer(root, "pointerup", 140);
        await settle();
        expect(source.state.dragged).toBe(false);
    });

    it("gives its frame, action and region their keyed props and unstyled", async () => {
        withRegistry(() => (
            <ListItem
                headline="Message"
                region={<span>More</span>}
                swipeAction={<button type="button">Delete</button>}
                class={{ frame: "framed", region: "more" }}
                unstyled={{ action: true, region: true }}
            />
        ));
        await settle();
        expect(byTestId(ids.frame).className).toBe("list-item__frame framed");
        expect(byTestId(ids.action).className).toBe("");
        expect(byTestId(ids.region).className).toBe("more");
    });

    it("renders its action after the row, in a frame, out of reach until revealed", async () => {
        withRegistry(() => (
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("list-item--swipeable-true");
        expect(root.style.touchAction).toBe("pan-y");
        expect(root.tabIndex).toBe(0);
        const frame = byTestId(ids.frame);
        expect(frame.className).toBe("list-item__frame");
        const action = byTestId(ids.action);
        expect([...frame.children]).toEqual([root, action]);
        expect(action.hasAttribute("inert")).toBe(true);
        expect(action.textContent).toBe("Delete");
    });

    it("reveals the action when dragged toward the start past half, and closes when dragged back", async () => {
        const onRevealedChange =
            vi.fn<(details: ChangeDetails<"revealed", boolean>) => void>();
        withRegistry(() => (
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        pointer(root, "pointerdown", 200);
        pointer(root, "pointermove", 180);
        pointer(root, "pointermove", 140);
        pointer(root, "pointerup", 140);
        await settle();
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: true });
        expect(byTestId(ids.action).hasAttribute("inert")).toBe(false);
        pointer(root, "pointerdown", 140);
        pointer(root, "pointermove", 160);
        pointer(root, "pointermove", 200);
        pointer(root, "pointerup", 200);
        await settle();
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: false });
        expect(byTestId(ids.action).hasAttribute("inert")).toBe(true);
    });

    it("settles from the release's speed on the theme's exact spring", async () => {
        // As the preset's stylesheet would: the row's offset on the fast spatial spring.
        const style = document.createElement("style");
        style.textContent = `
            :root {
                --springs-spatial-fast-stiffness: 1400;
                --springs-spatial-fast-damping: 0.9;
                --springs-spatial-fast-mass: 1;
            }
            .list-item--swipeable-true {
                transition: --components-listItem-swipeOffset 350ms linear(0, 0.6 20%, 0.95 50%, 1);
            }`;
        document.head.append(style);
        try {
            withRegistry(() => (
                <ListItem
                    headline="Message"
                    swipeAction={<button type="button">Delete</button>}
                />
            ));
            await settle();
            const root = byTestId(ids.root);
            pointer(root, "pointerdown", 200);
            pointer(root, "pointermove", 180);
            pointer(root, "pointermove", 140);
            pointer(root, "pointerup", 140);
            expect(root.style.transition).toMatch(
                /^--components-listItem-swipeOffset \d+ms linear\(/,
            );
            await settle();
        } finally {
            style.remove();
        }
    });

    it("stays closed when the drag falls short of half", async () => {
        const onRevealedChange =
            vi.fn<(details: ChangeDetails<"revealed", boolean>) => void>();
        withRegistry(() => (
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        pointer(root, "pointerdown", 200);
        pointer(root, "pointermove", 190);
        pointer(root, "pointermove", 180);
        pointer(root, "pointerup", 180);
        await settle();
        expect(onRevealedChange).not.toHaveBeenCalled();
    });

    it("takes the arrow keys and Escape on the focused row", async () => {
        const onRevealedChange =
            vi.fn<(details: ChangeDetails<"revealed", boolean>) => void>();
        withRegistry(() => (
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        root.focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: true });
        await userEvent.keyboard("{Escape}");
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: false });
    });

    it("can be started revealed, with its action in reach", async () => {
        withRegistry(() => (
            <ListItem
                headline="Message"
                defaultRevealed
                swipeAction={<button type="button">Delete</button>}
            />
        ));
        await settle();
        expect(byTestId(ids.action).hasAttribute("inert")).toBe(false);
    });

    it("swipes an expandable item too: its action beside the button, the region after", async () => {
        const onRevealedChange =
            vi.fn<(details: ChangeDetails<"revealed", boolean>) => void>();
        withRegistry(() => (
            <ListItem
                headline="Folders"
                region="Work"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        const frame = byTestId(ids.frame);
        expect(root.tagName).toBe("BUTTON");
        expect(root.className).toContain("list-item--swipeable-true");
        expect(root.querySelector("button")).toBeNull();
        expect([...frame.children]).toEqual([root, byTestId(ids.action)]);
        expect(frame.nextElementSibling).toBe(byTestId(ids.region));
        // A drag reveals the action without expanding.
        pointer(root, "pointerdown", 200);
        pointer(root, "pointermove", 180);
        pointer(root, "pointermove", 140);
        pointer(root, "pointerup", 140);
        // The click that ends a drag isn't a press.
        root.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await settle();
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: true });
        expect(root.getAttribute("aria-expanded")).toBe("false");
        // A click expands it.
        await userEvent.click(root);
        await settle();
        expect(root.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(ids.region).hidden).toBe(false);
    });
});
import { createInteractionSource } from "@pureform/binding-core/interaction";
