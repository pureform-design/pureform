// The room a ready-made menu's `submenu="auto"` reads: beside the open menu, up to the edges of
// what bounds it (the window, and any ancestor of its anchor that clips sideways, such as a side
// panel that scrolls), measured once the menu has been placed and again as the window resizes.

import { menuSubmenuRoomOf } from "./components/menu";
import type { MenuSubmenuRoom } from "./components/menu";

/** The room beside `content` (the open menu), bounded by the window and by the ancestors of
 *  `anchor` (its trigger) that clip their overflow sideways. */
export const menuSubmenuRoom = (
    content: Element,
    anchor?: Element | null,
): MenuSubmenuRoom => {
    let left = 0;
    let right = document.documentElement.clientWidth || window.innerWidth;
    for (
        let element = anchor?.parentElement;
        element && element !== document.body;
        element = element.parentElement
    ) {
        if (getComputedStyle(element).overflowX === "visible") continue;
        const box = element.getBoundingClientRect();
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
    }
    return menuSubmenuRoomOf(content.getBoundingClientRect(), { left, right });
};

/** Measures the open menu's room once it has been placed (two frames on), and again on each
 *  resize of the window, calling `onRoom`; returns what stops it. */
export const watchMenuSubmenuRoom = (
    content: () => Element | null | undefined,
    anchor: () => Element | null | undefined,
    onRoom: (room: MenuSubmenuRoom) => void,
): (() => void) => {
    let frame = 0;
    const measure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                const element = content();
                if (!element || element.getBoundingClientRect().width === 0)
                    return;
                onRoom(menuSubmenuRoom(element, anchor()));
            });
        });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", measure);
    };
};
