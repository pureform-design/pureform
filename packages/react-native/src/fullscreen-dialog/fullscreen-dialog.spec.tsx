import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { FullscreenDialog } from ".";
import { PureformProvider } from "..";
import { Button } from "../button";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "fullscreenDialog",
        "button",
        "iconButton",
        "ripple",
    ]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const CONFIRM = "pf-fullscreen-dialog-confirm-action";

// The confirm action's buttons, inside its slot's view.
const confirmButtons = () => [
    ...byTestId(CONFIRM).querySelectorAll<HTMLElement>('[role="button"]'),
];

describe("FullscreenDialog's confirm action on React Native", () => {
    // A string in a View throws on a device; the test setup fails on React Native Web's warning.
    it.each(["Save", 3])(
        "draws a label (%s) as a text Button in its slot",
        async (label) => {
            await withRegistry(
                <>
                    <FullscreenDialog
                        headline="New event"
                        confirmAction={label}
                    >
                        Fill in the details.
                    </FullscreenDialog>
                    <Button variant="text" label="Text" testId="text" />
                </>,
            );
            const buttons = confirmButtons();
            expect(buttons).toHaveLength(1);
            expect(buttons[0]!.textContent).toBe(String(label));
            const style = (element: Element) => {
                const { backgroundColor, color } = getComputedStyle(element);
                return { backgroundColor, color };
            };
            expect(style(buttons[0]!)).toEqual(style(byTestId("text-root")));
            expect(
                style(buttons[0]!.querySelector('[data-testid$="-label"]')!),
            ).toEqual(style(byTestId("text-label")));
        },
    );

    it("draws a label as a text Button in the modal dialog its trigger opens", async () => {
        await withRegistry(
            <FullscreenDialog
                trigger="New event"
                headline="New event"
                confirmAction="Save"
            >
                Fill in the details.
            </FullscreenDialog>,
        );
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await until(() => expect(confirmButtons()).toHaveLength(1));
        expect(confirmButtons()[0]!.textContent).toBe("Save");
    });

    it("keeps an element it's given as it is", async () => {
        await withRegistry(
            <FullscreenDialog
                headline="New event"
                confirmAction={<Button label="Done" testId="done" />}
            >
                Fill in the details.
            </FullscreenDialog>,
        );
        const buttons = confirmButtons();
        expect(buttons).toHaveLength(1);
        expect(buttons[0]).toBe(byTestId("done-root"));
    });
});
