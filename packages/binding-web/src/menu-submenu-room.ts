// The room a ready-made menu's `submenu="auto"` reads as a cascading submenu opens: beside the
// open menu and down or up from the submenu's item, up to the edges of what bounds it (the
// window, any ancestor of the menu's anchor that clips its overflow, such as a side panel that
// scrolls, and the nearest container, or the one named), for the submenu's own size.

import { menuSubmenuRoomOf } from "@pureform/binding-core";
import type { MenuSubmenuBox, MenuSubmenuRoom } from "@pureform/binding-core";

const named = (element: Element, container: string | undefined): boolean => {
    const style = getComputedStyle(element);
    if (container === undefined)
        return style.containerType !== "" && style.containerType !== "normal";
    return style.containerName.split(/\s+/).includes(container);
};

/** What bounds a submenu of the menu opened from `anchor`: the window, the ancestors of `anchor`
 *  that clip their overflow (on each axis they clip), and the nearest container (an ancestor with
 *  a CSS `container-type`), or the ancestor whose `container-name` is `container`. */
export const menuSubmenuBoundary = (
    anchor?: Element | null,
    container?: string,
): Required<MenuSubmenuBox> => {
    let left = 0;
    let top = 0;
    let right = document.documentElement.clientWidth || window.innerWidth;
    let bottom = document.documentElement.clientHeight || window.innerHeight;
    let contained = false;
    for (
        let element = anchor?.parentElement;
        element && element !== document.body;
        element = element.parentElement
    ) {
        const style = getComputedStyle(element);
        const isContainer: boolean = !contained && named(element, container);
        const clipsX = style.overflowX !== "visible";
        const clipsY = style.overflowY !== "visible";
        if (!isContainer && !clipsX && !clipsY) continue;
        const box = element.getBoundingClientRect();
        if (isContainer || clipsX) {
            left = Math.max(left, box.left);
            right = Math.min(right, box.right);
        }
        if (isContainer || clipsY) {
            top = Math.max(top, box.top);
            bottom = Math.min(bottom, box.bottom);
        }
        contained ||= isContainer;
    }
    return { left, right, top, bottom };
};

/** The room a cascading submenu (`submenu`, open and laid out at its own size) has beside its
 *  menu (`menu`) from its item (`row`), within `menuSubmenuBoundary(anchor, container)`. A
 *  submenu not laid out yet counts as fitting (`undefined`). */
export const menuSubmenuRoom = (
    menu: Element,
    row: Element,
    submenu: Element,
    anchor?: Element | null,
    container?: string,
): MenuSubmenuRoom | undefined => {
    const size = submenu.getBoundingClientRect();
    if (size.width === 0) return undefined;
    return menuSubmenuRoomOf(
        menu.getBoundingClientRect(),
        menuSubmenuBoundary(anchor, container),
        { row: row.getBoundingClientRect(), size },
    );
};

let pressed: { at: number; target: EventTarget | null; key: boolean } = {
    at: -Infinity,
    target: null,
    key: false,
};
const PRESS_KEYS = new Set(["Enter", " ", "ArrowRight", "ArrowLeft"]);
const notePress = (event: Event) => {
    const key = event instanceof KeyboardEvent;
    if (key && !PRESS_KEYS.has(event.key)) return;
    pressed = { at: performance.now(), target: event.target, key };
};

/** Whether a submenu opening now was opened by a press in the last half second (a pointer down
 *  on its item `row`, or Enter, Space or a sideways arrow in its `menu`) rather than the pointer
 *  resting on its item. */
export const menuSubmenuPressed = (row: Element, menu: Element): boolean =>
    performance.now() - pressed.at < 500 &&
    pressed.target instanceof Node &&
    (pressed.key ? menu : row).contains(pressed.target);

/** Starts noting presses for `menuSubmenuPressed` (once per document; later calls do nothing). */
export const noteMenuSubmenuPresses = (): void => {
    const doc = document as Document & { pfMenuPresses?: true };
    if (doc.pfMenuPresses) return;
    doc.pfMenuPresses = true;
    doc.addEventListener("pointerdown", notePress, true);
    doc.addEventListener("keydown", notePress, true);
};

/** Calls `onChange` when the room a submenu has might have changed: the window or any scroller
 *  moved or resized, or the open menus (`content`) or the anchors (`anchors`, and each up its
 *  ancestors) resized. The page itself (`html`, `body`) is left to `resize`: observing it too
 *  makes the browser report a "ResizeObserver loop".
 *
 *  Observing starts once the menus' first positioning has settled, two frames on: Zag's
 *  positioning resizes the elements around them as it places them, which an observer started
 *  before it would report as a loop. What changed meanwhile is checked once, as it starts.
 *  Returns what stops it all. */
export const watchMenuLayout = (
    {
        anchors,
        content,
    }: {
        anchors: Iterable<Element | null>;
        content: Iterable<Element>;
    },
    onChange: () => void,
): (() => void) => {
    const watched = new Set<Element>(content);
    for (const anchor of anchors)
        for (let element = anchor; element; element = element.parentElement)
            if (
                element !== document.documentElement &&
                element !== document.body
            )
                watched.add(element);
    let observer: ResizeObserver | undefined;
    let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
            frame = 0;
            observer = new ResizeObserver(onChange);
            for (const element of watched) observer.observe(element);
            onChange();
        });
    });
    window.addEventListener("resize", onChange);
    const unscroll = watchScroll(onChange);
    return () => {
        if (frame) cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener("resize", onChange);
        unscroll();
    };
};

/** Calls `watch` after anything on the page scrolls (a panel that carries the menu with it),
 *  once the menu's position has followed: two frames on, and no more often than that. Returns
 *  what stops it. The scroll of any element is heard, as scrolling doesn't bubble. */
export const watchScroll = (watch: () => void): (() => void) => {
    let frame = 0;
    const listener = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                frame = 0;
                watch();
            });
        });
    };
    window.addEventListener("scroll", listener, {
        capture: true,
        passive: true,
    });
    return () => {
        window.removeEventListener("scroll", listener, { capture: true });
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    };
};
