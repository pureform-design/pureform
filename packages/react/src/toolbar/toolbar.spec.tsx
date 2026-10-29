import { compositeTestIds, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Toolbar } from ".";
import { PureformProvider } from "..";
import { toolbarRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const menuIds = compositeTestIds.menu;

// The fake registry draws nothing, so give the bar and its buttons sizes to measure.
const sheet = document.createElement("style");
sheet.textContent = `
    [role="toolbar"] { display: flex; gap: 0; padding: 0; }
    [role="toolbar"] button { width: 40px; height: 40px; padding: 0; border: 0; flex-shrink: 0; }
`;
document.head.append(sheet);

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const withRegistry = (view: () => ReactNode, width?: number) =>
    mount(
        <PureformProvider registry={toolbarRegistry()}>
            <div
                data-room
                style={width === undefined ? {} : { width: `${width}px` }}
            >
                {view()}
            </div>
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const ITEMS = ["bold", "italic", "underline", "strike", "link"].map(
    (value) => ({
        value,
        label: value[0]!.toUpperCase() + value.slice(1),
        icon: value[0]!.toUpperCase(),
    }),
);

const elements = (root: string = testIds.toolbar.root) =>
    [
        ...byTestId(root).querySelectorAll<HTMLElement>(
            ":scope > [data-pf-toolbar-item]",
        ),
    ].filter((element) => element.style.display !== "none");

describe("Toolbar, ready-made", () => {
    it("gives an element its own parts' class and test ids, and no other button's", async () => {
        withRegistry(() => (
            <Toolbar
                aria-label="Edit"
                items={[
                    {
                        value: "bold",
                        label: "Bold",
                        icon: "B",
                        className: { root: "own" },
                        testId: { root: "bold-btn" },
                    },
                    { value: "italic", label: "Italic", icon: "I" },
                ]}
            />
        ));
        await settle();
        expect(byTestId("bold-btn").classList.contains("own")).toBe(true);
        expect(document.querySelectorAll(".own")).toHaveLength(1);
    });

    it("renders a toolbar of icon buttons and text buttons in its variants", async () => {
        withRegistry(() => (
            <Toolbar
                aria-label="Formatting"
                placement="docked"
                color="vibrant"
                items={[
                    { value: "bold", label: "Bold", icon: "B" },
                    { value: "done", label: "Done" },
                ]}
            />
        ));
        await settle();
        const root = byTestId(testIds.toolbar.root);
        expect(root.getAttribute("role")).toBe("toolbar");
        expect(root.getAttribute("aria-orientation")).toBe("horizontal");
        expect(root.getAttribute("aria-label")).toBe("Formatting");
        expect(root.className).toBe(
            "toolbar toolbar--placement-docked toolbar--color-vibrant",
        );
        const [bold, done] = elements();
        expect(bold?.className).toContain("icon-button");
        expect(bold?.getAttribute("aria-label")).toBe("Bold");
        expect(done?.className).toContain("button--variant-text");
        expect(done?.textContent).toBe("Done");
        expect(document.querySelector("[data-pf-toolbar-overflow]")).toBeNull();
    });

    it("stands up with a vertical orientation", async () => {
        withRegistry(() => (
            <Toolbar orientation="vertical" items={ITEMS.slice(0, 2)} />
        ));
        await settle();
        const root = byTestId(testIds.toolbar.root);
        expect(root.getAttribute("aria-orientation")).toBe("vertical");
        expect(root.className).toContain("toolbar--orientation-vertical");
    });

    it("makes an element with selected a toggle", async () => {
        const onSelectedChange =
            vi.fn<(details: { readonly selected: boolean }) => void>();
        withRegistry(() => (
            <Toolbar
                items={[
                    {
                        value: "bold",
                        label: "Bold",
                        icon: "B",
                        selected: false,
                        onSelectedChange,
                    },
                ]}
            />
        ));
        await settle();
        const [bold] = elements();
        expect(bold?.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(bold!);
        expect(onSelectedChange).toHaveBeenCalledWith({ selected: true });
    });

    it("moves focus with the arrow keys, wrapping, and mirrors them under rtl", async () => {
        withRegistry(() => <Toolbar items={ITEMS.slice(0, 3)} />);
        await settle();
        const [bold, italic, underline] = elements();
        bold!.focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(italic);
        await userEvent.keyboard("{End}");
        expect(document.activeElement).toBe(underline);
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(bold);
        document.body.replaceChildren();
        mount(
            <PureformProvider registry={toolbarRegistry()} dir="rtl">
                <Toolbar items={ITEMS.slice(0, 3)} />
            </PureformProvider>,
        );
        await settle();
        const [first, second] = elements();
        first!.focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(second);
    });
});

describe("Toolbar, unstyled", () => {
    const accent = (id: string) =>
        byTestId(`${id}-root`).style.getPropertyValue("--accent");

    it("gives its icon buttons the content accent when unstyled and vibrant", async () => {
        withRegistry(() => (
            <Toolbar
                aria-label="Edit"
                color="vibrant"
                unstyled
                testId="bar"
                items={[{ value: "a", label: "A", icon: "A", testId: "a" }]}
            />
        ));
        expect(accent("a")).toBe(
            "var(--components-toolbar-content, currentColor)",
        );
    });

    it("is vibrant by the provider's default color too", async () => {
        withRegistry(() => (
            <PureformProvider defaults={{ toolbar: { color: "vibrant" } }}>
                <Toolbar
                    aria-label="Edit"
                    unstyled
                    items={[{ value: "a", label: "A", icon: "A", testId: "a" }]}
                />
                <Toolbar
                    aria-label="Standard"
                    color="standard"
                    unstyled
                    items={[{ value: "b", label: "B", icon: "B", testId: "b" }]}
                />
            </PureformProvider>
        ));
        expect(accent("a")).toBe(
            "var(--components-toolbar-content, currentColor)",
        );
        expect(accent("b")).toBe("");
    });

    it("leaves a styled or standard toolbar's icon buttons to the cascade", async () => {
        withRegistry(() => (
            <>
                <Toolbar
                    aria-label="Styled"
                    color="vibrant"
                    testId="styled"
                    items={[{ value: "a", label: "A", icon: "A", testId: "a" }]}
                />
                <Toolbar
                    aria-label="Standard"
                    unstyled
                    testId="standard"
                    items={[{ value: "b", label: "B", icon: "B", testId: "b" }]}
                />
            </>
        ));
        expect(accent("a")).toBe("");
        expect(accent("b")).toBe("");
    });
});

describe("Toolbar, overflow", () => {
    it("keeps every element when they fit, with no overflow button", async () => {
        withRegistry(() => <Toolbar overflow items={ITEMS.slice(0, 3)} />, 400);
        await frames();
        expect(elements()).toHaveLength(3);
        const trigger = document.querySelector<HTMLElement>(
            "[data-pf-toolbar-overflow]",
        );
        expect(trigger?.style.display).toBe("none");
        expect(byTestId(testIds.toolbar.root).className).toContain(
            "toolbar--overflow-true",
        );
    });

    it("moves what doesn't fit into the overflow menu, and runs its click there", async () => {
        const onClick = vi.fn<() => void>();
        withRegistry(
            () => (
                <Toolbar
                    overflow
                    testId="edit"
                    items={ITEMS.map((item) =>
                        item.value === "link" ? { ...item, onClick } : item,
                    )}
                />
            ),
            130,
        );
        await frames();
        // 40 + 40 + the 40px overflow button fit in 130px.
        expect(
            elements("edit-root").map((element) => element.ariaLabel),
        ).toEqual(["Bold", "Italic"]);
        const trigger = byTestId<HTMLButtonElement>("edit-overflow-root");
        expect(trigger.getAttribute("aria-label")).toBe("More options");
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        await userEvent.click(trigger);
        await frames();
        const items = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menuIds.item}"]`,
            ),
        ];
        expect(items.map((item) => item.textContent)).toEqual([
            "UUnderline",
            "SStrike",
            "LLink",
        ]);
        await userEvent.click(items[2]!);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("takes a function of each overflow entry in the menu's part keys", async () => {
        withRegistry(
            () => (
                <Toolbar
                    overflow
                    testId="edit"
                    items={ITEMS}
                    menuProps={{
                        className: {
                            item: ({ item, index }) =>
                                `entry-${index}-${String(item.value)}`,
                        },
                    }}
                />
            ),
            130,
        );
        await frames();
        await userEvent.click(
            byTestId<HTMLButtonElement>("edit-overflow-root"),
        );
        await frames();
        const items = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menuIds.item}"]`,
            ),
        ];
        expect(items.map((item) => item.className)).toEqual([
            expect.stringContaining("entry-0-underline"),
            expect.stringContaining("entry-1-strike"),
            expect.stringContaining("entry-2-link"),
        ]);
    });

    it("brings elements back as the room grows", async () => {
        const host = withRegistry(() => <Toolbar overflow items={ITEMS} />, 90);
        await frames();
        expect(elements()).toHaveLength(1);
        host.querySelector<HTMLElement>("[data-room]")!.style.width = "400px";
        await frames(4);
        expect(elements()).toHaveLength(5);
        expect(
            document.querySelector<HTMLElement>("[data-pf-toolbar-overflow]")
                ?.style.display,
        ).toBe("none");
    });
});

describe("Toolbar, slot props", () => {
    it("keys its own parts flat and gives its buttons buttonProps and iconButtonProps", async () => {
        withRegistry(() => (
            <Toolbar
                aria-label="Edit"
                className={{ root: "edit" }}
                buttonProps={{ className: { label: "caps" } }}
                iconButtonProps={{ className: { root: "round" } }}
                items={[
                    { value: "a", label: "Undo", testId: "text" },
                    { value: "b", label: "Bold", icon: "B", testId: "icon" },
                ]}
            />
        ));
        await settle();
        expect(byTestId(testIds.toolbar.root).className).toContain("edit");
        expect(byTestId("text-label").className).toContain("caps");
        expect(byTestId("icon-root").className).toContain("round");
    });
});
