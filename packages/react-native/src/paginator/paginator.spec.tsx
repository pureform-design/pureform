import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Paginator } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "paginator",
        "iconButton",
        "select",
        "menu",
        "ripple",
    ]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const range = () => byTestId("pf-paginator-range-label").textContent;
const press = (part: string) =>
    interact(() =>
        userEvent.click(byTestId(`pf-paginator-${part}-button-root`)),
    );

describe("Paginator", () => {
    it("draws the page size's name once and names the select by it", async () => {
        await render(<Paginator count={95} />);
        const root = byTestId("pf-paginator-root");
        const drawn = root.textContent!.split("Items per page:").length - 1;
        expect(drawn).toBe(1);
        expect(
            root.querySelector('[role="combobox"]')?.getAttribute("aria-label"),
        ).toBe("Items per page:");
    });

    it("shows the range and steps with the buttons", async () => {
        const onPageChange =
            vi.fn<
                NonNullable<ComponentProps<typeof Paginator>["onPageChange"]>
            >();
        await render(
            <Paginator
                count={95}
                showFirstLastButtons
                onPageChange={onPageChange}
            />,
        );
        expect(byTestId("pf-paginator-root").getAttribute("role")).toBe(
            "group",
        );
        expect(range()).toBe("1 – 10 of 95");
        expect(
            byTestId("pf-paginator-prev-trigger-button-root").getAttribute(
                "aria-disabled",
            ),
        ).toBe("true");
        await press("next-trigger");
        expect(range()).toBe("11 – 20 of 95");
        expect(onPageChange).toHaveBeenCalledExactlyOnceWith({
            page: 2,
            pageSize: 10,
        });
        await press("last-trigger");
        expect(range()).toBe("91 – 95 of 95");
        await press("first-trigger");
        expect(range()).toBe("1 – 10 of 95");
    });

    it("lays the row out at the inline end, so right to left mirrors it", async () => {
        await render(<Paginator count={5} />);
        expect(computed("pf-paginator-root").justifyContent).toBe("flex-end");
    });

    it("hides the page size and words the range in the app's language", async () => {
        await render(
            <Paginator
                count={0}
                hidePageSize
                translations={{ range: ({ count }) => `${count} Einträge` }}
            />,
        );
        expect(
            document.querySelector('[data-testid="pf-paginator-page-size"]'),
        ).toBeNull();
        expect(range()).toBe("0 Einträge");
    });
});
