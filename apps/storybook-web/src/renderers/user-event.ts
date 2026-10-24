// The user events the cases act through in Storybook: `storybook/test`'s, which the Interactions
// panel records. Under Vitest, `.storybook/main.ts` aliases `#user-event` to
// `user-event.vitest.ts` instead.
//
// `storybook/test`'s `click` is synthetic and has no pointer position (`clientX` 0), so a slider
// clicked there reads 0. A click here is a pointer action at the middle of the element's box, as
// Playwright's is under Vitest: the events carry `clientX`/`clientY`, the mouse's `pointerId` and
// `buttons`.

import { userEvent as storybookUserEvent } from "storybook/test";

/** Where a click lands: the middle of the element's box, in the page's coordinates. */
export const clickCoords = (element: Element) => {
    const box = element.getBoundingClientRect();
    const clientX = box.left + box.width / 2;
    const clientY = box.top + box.height / 2;
    return {
        clientX,
        clientY,
        x: clientX,
        y: clientY,
        pageX: clientX + window.scrollX,
        pageY: clientY + window.scrollY,
        offsetX: box.width / 2,
        offsetY: box.height / 2,
        screenX: clientX + window.screenX,
        screenY: clientY + window.screenY,
    };
};

// Imported, then wrapped: Storybook's build rewrites `storybook/test` imports to a global, which
// a re-export (`export … from`) breaks.
export const userEvent = {
    click: async (element: Element, _options?: unknown): Promise<void> => {
        const coords = clickCoords(element);
        // Moved onto the element, then pressed and released there (`[MouseLeft]`), so the
        // hover, press and click events all carry the position.
        await storybookUserEvent.pointer([
            { target: element, coords },
            { keys: "[MouseLeft]", target: element, coords },
        ]);
    },
    unhover: (element: Element) => storybookUserEvent.unhover(element),
    keyboard: (text: string) => storybookUserEvent.keyboard(text),
    type: (element: Element, text: string, options?: object) =>
        storybookUserEvent.type(element, text, options),
    selectOptions: (
        element: Element,
        values: string | readonly string[],
        options?: object,
    ) =>
        storybookUserEvent.selectOptions(
            element,
            values as string | string[],
            options,
        ),
};
