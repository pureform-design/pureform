import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ButtonGroup } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { buttonGroupRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={buttonGroupRegistry()}>
            {view}
        </PureformProvider>,
    );

const buttons = () =>
    [...byTestId(testIds.buttonGroup.root).children] as HTMLElement[];

describe("ButtonGroup, ready-made", () => {
    it("gives an item test ids by part, as List's items do", async () => {
        withRegistry(
            <ButtonGroup
                items={[{ label: "Day", testId: { label: "day-label" } }]}
            />,
        );
        await settle();
        expect(byTestId("day-label").textContent).toBe("Day");
    });

    it("gives an item its own parts' class over the group's buttonProps, and no other button's", async () => {
        withRegistry(
            <ButtonGroup
                buttonProps={{ className: { label: "every" } }}
                items={[
                    { label: "Day", className: { root: "own" } },
                    { label: "Week" },
                ]}
            />,
        );
        await settle();
        expect(buttons()[0]!.classList.contains("own")).toBe(true);
        expect(buttons()[0]!.querySelector(".every")).not.toBeNull();
        expect(buttons()[1]!.classList.contains("own")).toBe(false);
        expect(buttons()[1]!.querySelector(".every")).not.toBeNull();
    });

    it("renders a group of buttons in its size, each single in a standard group", async () => {
        withRegistry(
            <ButtonGroup
                aria-label="Actions"
                size="medium"
                variant="tonal"
                items={[{ label: "Copy" }, { label: "Paste" }]}
            />,
        );
        await settle();
        const root = byTestId(testIds.buttonGroup.root);
        expect(root.getAttribute("role")).toBe("group");
        expect(root.className).toBe("button-group button-group--size-medium");
        expect(buttons().map((button) => button.className)).toEqual([
            "button button--variant-tonal button--size-medium button--position-single",
            "button button--variant-tonal button--size-medium button--position-single",
        ]);
        expect(buttons()[0]?.hasAttribute("aria-pressed")).toBe(false);
    });

    it("places a connected group's buttons by index, icon-only items as icon buttons", async () => {
        withRegistry(
            <ButtonGroup
                connected
                variant="text"
                items={[
                    { label: "Bold" },
                    { icon: "I", "aria-label": "Italic" },
                    { label: "Underline" },
                ]}
            />,
        );
        await settle();
        expect(byTestId(testIds.buttonGroup.root).className).toBe(
            "button-group button-group--connected-true",
        );
        const [first, middle, last] = buttons();
        expect(first?.className).toContain("button--position-first");
        expect(middle?.className).toContain("icon-button--position-middle");
        expect(middle?.className).toContain("icon-button--variant-standard");
        expect(middle?.getAttribute("aria-label")).toBe("Italic");
        expect(last?.className).toContain("button--position-last");
    });

    it("keeps one button on in a single-select group", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        withRegistry(
            <ButtonGroup
                connected
                selectable="single"
                defaultValue={["week"]}
                onValueChange={onValueChange}
                items={[
                    { value: "day", label: "Day" },
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                ]}
            />,
        );
        await settle();
        const [day, week] = buttons();
        expect(day?.getAttribute("aria-pressed")).toBe("false");
        expect(week?.getAttribute("aria-pressed")).toBe("true");
        expect(week?.className).toContain("button--toggle-true");
        expect(day?.hasAttribute("role")).toBe(false);
        await userEvent.click(day!);
        await settle();
        expect(day?.getAttribute("aria-pressed")).toBe("true");
        expect(week?.getAttribute("aria-pressed")).toBe("false");
        expect(onValueChange.mock.calls.at(-1)?.[0]).toMatchObject({
            value: ["day"],
        });
    });

    it("presses several in a multiple-select group, and moves focus with the arrows", async () => {
        withRegistry(
            <ButtonGroup
                selectable="multiple"
                items={[{ label: "A" }, { label: "B" }, { label: "C" }]}
            />,
        );
        await settle();
        const [a, b, c] = buttons();
        await userEvent.click(a!);
        await userEvent.click(c!);
        await settle();
        expect(
            buttons().map((button) => button.getAttribute("aria-pressed")),
        ).toEqual(["true", "false", "true"]);
        c?.focus();
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(document.activeElement).toBe(b);
    });
});

describe("ButtonGroup, composed", () => {
    it("gives its buttons the group's variants, under their own", async () => {
        withRegistry(
            <ButtonGroup.Root size="large" connected>
                <ButtonGroup.Button
                    label="Left"
                    position="first"
                    variant="outlined"
                />
                <ButtonGroup.IconButton
                    icon="+"
                    aria-label="Add"
                    position="last"
                />
            </ButtonGroup.Root>,
        );
        await settle();
        const [left, add] = buttons();
        expect(left?.className).toBe(
            "button button--variant-outlined button--size-large button--position-first",
        );
        expect(add?.className).toContain("icon-button--size-large");
        expect(add?.className).toContain("icon-button--position-last");
    });
});

describe("ButtonGroup, slot props", () => {
    it("keys its own parts flat and gives every button buttonProps under its own", async () => {
        withRegistry(
            <ButtonGroup
                aria-label="View"
                className={{ root: "views" }}
                buttonProps={{ className: { label: "caps" }, testId: "b" }}
                items={[{ label: "Day" }, { label: "Week", testId: "own" }]}
            />,
        );
        await settle();
        expect(byTestId(testIds.buttonGroup.root).className).toContain("views");
        expect(byTestId("b-label").className).toContain("caps");
        expect(byTestId("own-label").className).toContain("caps");
    });
});
