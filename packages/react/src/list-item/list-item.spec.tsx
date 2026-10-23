import { testIds } from "@pureform/anatomy";
import { useState } from "react";
import type { ReactNode } from "react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ListItem } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { List } from "../list";
import { interact, mount, settle } from "../testing/render";

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

describe("ListItem, expandable", () => {
    it("draws a button with an indicator, and its region after it, hidden while collapsed", async () => {
        withRegistry(
            <ListItem headline="Folders" region={<span>Work</span>} />,
        );
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
        withRegistry(
            <ListItem
                headline="Folders"
                region="Work"
                onExpandedChange={({ expanded }) => seen.push(expanded)}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(ids.region).hidden).toBe(false);
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(root.getAttribute("aria-expanded")).toBe("false");
        expect(byTestId(ids.region).hidden).toBe(true);
        expect(seen).toEqual([true, false]);
    });

    it("follows a controlled expanded", async () => {
        let set!: (value: boolean) => void;
        function Controlled() {
            const [expanded, setExpanded] = useState(true);
            set = setExpanded;
            return (
                <ListItem
                    headline="Folders"
                    region="Work"
                    expanded={expanded}
                />
            );
        }
        withRegistry(<Controlled />);
        await settle();
        expect(byTestId(ids.region).hidden).toBe(false);
        await act(async () => set(false));
        await settle();
        expect(byTestId(ids.root).getAttribute("aria-expanded")).toBe("false");
    });

    it("composes Expandable around Root and Region, and nests in a List's item", async () => {
        withRegistry(
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
            </List.Root>,
        );
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
        withRegistry(<ListItem headline="Inbox" />);
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

    it("renders its action after the row, in a frame, out of reach until revealed", async () => {
        withRegistry(
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
            />,
        );
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
        const onRevealedChange = vi.fn();
        withRegistry(
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />,
        );
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
            withRegistry(
                <ListItem
                    headline="Message"
                    swipeAction={<button type="button">Delete</button>}
                />,
            );
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
        const onRevealedChange = vi.fn();
        withRegistry(
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />,
        );
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
        const onRevealedChange = vi.fn();
        withRegistry(
            <ListItem
                headline="Message"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        root.focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: true });
        await userEvent.keyboard("{Escape}");
        expect(onRevealedChange).toHaveBeenLastCalledWith({ revealed: false });
    });

    it("can be started revealed, with its action in reach", async () => {
        withRegistry(
            <ListItem
                headline="Message"
                defaultRevealed
                swipeAction={<button type="button">Delete</button>}
            />,
        );
        await settle();
        expect(byTestId(ids.action).hasAttribute("inert")).toBe(false);
    });

    it("swipes an expandable item too: its action beside the button, the region after", async () => {
        const onRevealedChange = vi.fn();
        withRegistry(
            <ListItem
                headline="Folders"
                region="Work"
                swipeAction={<button type="button">Delete</button>}
                onRevealedChange={onRevealedChange}
            />,
        );
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
