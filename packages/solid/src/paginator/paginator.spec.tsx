import { compositeTestIds, testIds } from "@pureform/anatomy";
import { createSignal, Errored } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Paginator } from ".";
import { PureformProvider } from "..";
import { paginatorRegistry } from "../__fixtures__/registry";
import { IconButton } from "../icon-button/icon-button";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.paginator;
const menu = compositeTestIds.selectMenu;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={paginatorRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
};

const range = () => byTestId(ids.rangeLabel).textContent;

describe("Paginator, ready-made", () => {
    it("renders the group, the page-size select, the range and the previous and next buttons", async () => {
        withRegistry(() => <Paginator count={95} />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("role")).toBe("group");
        expect(root.getAttribute("aria-label")).toBe("Pagination");
        expect(byTestId(ids.pageSizeLabel).textContent).toBe("Items per page:");
        expect(byTestId<HTMLInputElement>(testIds.select.input).value).toBe(
            "10",
        );
        expect(range()).toBe("1 – 10 of 95");
        const prev = byTestId<HTMLButtonElement>(ids.prevTrigger);
        const next = byTestId<HTMLButtonElement>(ids.nextTrigger);
        expect(prev.getAttribute("aria-label")).toBe("Previous page");
        expect(prev.disabled).toBe(true);
        expect(next.disabled).toBe(false);
        expect(
            document.querySelector(`[data-testid="${ids.firstTrigger}"]`),
        ).toBeNull();
        expect(byTestId(ids.rangeLabel).getAttribute("aria-live")).toBe(
            "polite",
        );
    });

    it("steps with the buttons and reports the page", async () => {
        const onPageChange = vi.fn();
        withRegistry(() => (
            <Paginator
                count={95}
                showFirstLastButtons
                onPageChange={onPageChange}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.nextTrigger));
        await settle();
        expect(range()).toBe("11 – 20 of 95");
        expect(onPageChange).toHaveBeenCalledExactlyOnceWith({
            page: 2,
            pageSize: 10,
        });
        await userEvent.click(byTestId(ids.lastTrigger));
        await settle();
        expect(range()).toBe("91 – 95 of 95");
        expect(byTestId<HTMLButtonElement>(ids.nextTrigger).disabled).toBe(
            true,
        );
        expect(byTestId<HTMLButtonElement>(ids.lastTrigger).disabled).toBe(
            true,
        );
        await userEvent.click(byTestId(ids.firstTrigger));
        await settle();
        expect(range()).toBe("1 – 10 of 95");
    });

    it("is operable by the keyboard: Tab to a button, Enter to press it", async () => {
        withRegistry(() => <Paginator count={95} />);
        await settle();
        byTestId<HTMLElement>(ids.nextTrigger).focus();
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(range()).toBe("11 – 20 of 95");
        await userEvent.keyboard(" ");
        await settle();
        expect(range()).toBe("21 – 30 of 95");
    });

    it("is controllable", async () => {
        const [page, setPage] = createSignal(3);
        withRegistry(() => (
            <Paginator
                count={95}
                page={page()}
                onPageChange={(details) => setPage(details.page)}
            />
        ));
        await settle();
        expect(range()).toBe("21 – 30 of 95");
        await userEvent.click(byTestId(ids.prevTrigger));
        await settle();
        expect(page()).toBe(2);
        expect(range()).toBe("11 – 20 of 95");
        setPage(10);
        await settle();
        expect(range()).toBe("91 – 95 of 95");
    });

    it("changes the page size with the select, keeping the first item shown", async () => {
        const onPageSizeChange = vi.fn();
        withRegistry(() => (
            <Paginator
                count={95}
                defaultPage={4}
                pageSizeOptions={[5, 10, 25]}
                onPageSizeChange={onPageSizeChange}
            />
        ));
        await settle();
        expect(range()).toBe("31 – 40 of 95");
        await userEvent.click(byTestId(testIds.select.input));
        await frames();
        const option = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.item}"]`,
            ),
        ].find((element) => element.dataset["value"] === "25")!;
        await userEvent.click(option);
        await settle();
        expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith({
            pageSize: 25,
        });
        expect(range()).toBe("26 – 50 of 95");
    });

    it("hides the page size, and the words are translatable", async () => {
        withRegistry(() => (
            <Paginator
                count={0}
                hidePageSize
                translations={{
                    nextPage: "Weiter",
                    range: ({ count }) => `${count} Einträge`,
                }}
            />
        ));
        await settle();
        expect(
            document.querySelector(`[data-testid="${ids.pageSize}"]`),
        ).toBeNull();
        expect(range()).toBe("0 Einträge");
        const next = byTestId<HTMLButtonElement>(ids.nextTrigger);
        expect(next.getAttribute("aria-label")).toBe("Weiter");
        expect(next.disabled).toBe(true);
    });

    it("disables every control", async () => {
        withRegistry(() => (
            <Paginator count={95} showFirstLastButtons disabled />
        ));
        await settle();
        for (const id of [
            ids.firstTrigger,
            ids.prevTrigger,
            ids.nextTrigger,
            ids.lastTrigger,
        ]) {
            expect(byTestId<HTMLButtonElement>(id).disabled, id).toBe(true);
        }
    });
});

describe("Paginator, composed", () => {
    it("composes the parts under Root, the triggers as icon buttons", async () => {
        withRegistry(() => (
            <Paginator.Root count={30} defaultPageSize={10} aria-label="Rows">
                <Paginator.RangeLabel />
                <Paginator.Actions>
                    <Paginator.PrevTrigger as={IconButton} />
                    <Paginator.NextTrigger as={IconButton} />
                </Paginator.Actions>
            </Paginator.Root>
        ));
        await settle();
        expect(byTestId(ids.root).getAttribute("aria-label")).toBe("Rows");
        expect(range()).toBe("1 – 10 of 30");
        expect(byTestId(ids.nextTrigger).className).toContain("icon-button");
        await userEvent.click(byTestId(ids.nextTrigger));
        await settle();
        expect(range()).toBe("11 – 20 of 30");
    });

    it("throws outside Root, naming both", () => {
        mount(() => (
            <Errored
                fallback={(error) => (
                    <p data-testid="error">{String(error())}</p>
                )}
            >
                <Paginator.RangeLabel />
            </Errored>
        ));
        expect(byTestId("error").textContent).toMatch(
            /<Paginator.RangeLabel> must be inside <Paginator.Root>/,
        );
    });
});
