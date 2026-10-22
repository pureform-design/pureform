// A grouped menu rounds the outside corners of its first and last groups. Its groups mark
// themselves from where they are in the menu's surface, so a menu built from parts needs no
// `first`/`last` from the app: the surface's own groups (not a submenu's) in DOM order, marked
// again whenever its children change.

const GROUP = '[data-scope="menu"][data-part="item-group"]';
const CONTENT = '[data-scope="menu"][data-part="content"]';

const mark = (element: Element, name: string, on: boolean) => {
    if (on) {
        if (!element.hasAttribute(name)) element.setAttribute(name, "");
    } else if (element.hasAttribute(name)) element.removeAttribute(name);
};

/** Marks the first and last of the groups in a menu's `content` with `data-first` and
 *  `data-last`, and keeps them marked as groups come and go. Returns what stops it. */
export const markMenuGroupEdges = (content: HTMLElement): (() => void) => {
    const update = () => {
        const groups = [...content.querySelectorAll(GROUP)].filter(
            (group) => group.parentElement?.closest(CONTENT) === content,
        );
        groups.forEach((group, index) => {
            mark(group, "data-first", index === 0);
            mark(group, "data-last", index === groups.length - 1);
        });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
};
